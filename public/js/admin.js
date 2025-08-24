// File: /js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://autohidrolik.com/api'; // Ganti jika URL API Anda berbeda
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    const tableBody = document.getElementById('user-table-body');

    const addUserForm = document.getElementById('add-user-form');
    const editUserForm = document.getElementById('edit-user-form');
    const addUserModal = new bootstrap.Modal(document.getElementById('addUserModal'));
    const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));

    // --- Fungsi Utama: Ambil dan Tampilkan Semua Pengguna ---
    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/users`, {
                headers: { 'x-auth-token': token }
            });
            if (!response.ok) throw new Error('Gagal mengambil data pengguna');
            
            const users = await response.json();
            tableBody.innerHTML = ''; // Kosongkan tabel sebelum diisi
            users.forEach(user => {
                const row = `
                    <tr>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td>${user.fullName || '-'}</td>
                        <td><span class="badge bg-${user.role === 'admin' ? 'success' : 'secondary'}">${user.role}</span></td>
                        <td>${new Date(user.date).toLocaleDateString()}</td>
                        <td>
                            <button class="btn btn-sm btn-warning edit-btn" data-id="${user._id}" data-bs-toggle="modal" data-bs-target="#editUserModal"><i class="bi bi-pencil-square"></i></button>
                            <button class="btn btn-sm btn-danger delete-btn" data-id="${user._id}"><i class="bi bi-trash3"></i></button>
                        </td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', row);
            });
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    };

    // --- Event Listener untuk Form Tambah Pengguna ---
    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newUser = {
            username: document.getElementById('add-username').value,
            email: document.getElementById('add-email').value,
            password: document.getElementById('add-password').value,
            role: document.getElementById('add-role').value,
        };
        try {
            const response = await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(newUser)
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.msg || 'Gagal menambah user');
            }
            addUserModal.hide();
            fetchUsers(); // Muat ulang data tabel
        } catch (error) {
            alert(error.message);
        }
    });

    // --- Event Listener untuk Form Edit Pengguna ---
    editUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-user-id').value;
        const updatedUser = {
            username: document.getElementById('edit-username').value,
            email: document.getElementById('edit-email').value,
            role: document.getElementById('edit-role').value,
        };
        try {
            const response = await fetch(`${API_URL}/users/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(updatedUser)
            });
            if (!response.ok) throw new Error('Gagal mengupdate user');
            editUserModal.hide();
            fetchUsers(); // Muat ulang data tabel
        } catch (error) {
            alert(error.message);
        }
    });

    // --- Event Delegation untuk Tombol Edit dan Delete ---
    tableBody.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const id = target.dataset.id;

        // Jika tombol Edit diklik
        if (target.classList.contains('edit-btn')) {
            const row = target.closest('tr');
            const username = row.cells[0].innerText;
            const email = row.cells[1].innerText;
            const role = row.cells[3].innerText;
            
            document.getElementById('edit-user-id').value = id;
            document.getElementById('edit-username').value = username;
            document.getElementById('edit-email').value = email;
            document.getElementById('edit-role').value = role;
        }

        // Jika tombol Delete diklik
        if (target.classList.contains('delete-btn')) {
            if (confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
                deleteUser(id);
            }
        }
    });

    // --- Fungsi untuk Menghapus Pengguna ---
    const deleteUser = async (id) => {
        try {
            const response = await fetch(`${API_URL}/users/${id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });
            if (!response.ok) throw new Error('Gagal menghapus user');
            fetchUsers(); // Muat ulang data tabel
        } catch (error) {
            alert(error.message);
        }
    };

    // --- Panggil fungsi untuk memuat data saat halaman dibuka ---
    fetchUsers();
});
