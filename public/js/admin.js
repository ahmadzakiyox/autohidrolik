// File: /js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    // Pastikan API_URL didefinisikan di file /js/config.js Anda
    // contoh: const API_URL = 'http://localhost:5000/api';

    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    
    const userTableBody = document.getElementById('user-table-body');
    const reviewTableBody = document.getElementById('review-table-body');

    // Variabel untuk menyimpan semua data pengguna untuk fitur unduh
    let allUsersData = [];

    // --- Keamanan: Cek apakah pengguna adalah admin ---
    if (!token || userRole !== 'admin') {
        alert('Akses ditolak. Anda bukan admin atau sesi telah berakhir.');
        window.location.href = '/login.html';
        return;
    }

    // --- Inisialisasi Modals ---
    const addUserModal = new bootstrap.Modal(document.getElementById('addUserModal'));
    const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
    const editReviewModal = new bootstrap.Modal(document.getElementById('editReviewModal'));

    // --- Forms ---
    const addUserForm = document.getElementById('add-user-form');
    const editUserForm = document.getElementById('edit-user-form');
    const editReviewForm = document.getElementById('edit-review-form');

    // --- Fungsi Fetch Data ---
    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/users`, { headers: { 'x-auth-token': token } });
            if (!response.ok) throw new Error('Gagal mengambil data pengguna');
            
            const users = await response.json();
            allUsersData = users; // Simpan data ke variabel global
            
            userTableBody.innerHTML = ''; // Kosongkan tabel sebelum diisi ulang
            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td><span class="badge bg-${user.role === 'admin' ? 'success' : 'secondary'}">${user.role}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-info view-qr-btn" title="Lihat QR Code"><i class="bi bi-qr-code"></i></button>
                        <button class="btn btn-sm btn-outline-warning edit-user-btn" title="Edit User"><i class="bi bi-pencil-square"></i></button>
                        <button class="btn btn-sm btn-outline-danger delete-user-btn" title="Hapus User"><i class="bi bi-trash3"></i></button>
                    </td>
                `;
                
                // Simpan data lengkap user pada setiap tombol untuk akses mudah nanti
                row.querySelector('.view-qr-btn').onclick = () => showUserQrCode(user);
                row.querySelector('.edit-user-btn').onclick = () => openEditUserModal(user);
                row.querySelector('.delete-user-btn').onclick = () => deleteUser(user._id);

                userTableBody.appendChild(row);
            });
        } catch (error) {
            console.error(error);
            userTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Gagal memuat data pengguna.</td></tr>`;
        }
    };

    const renderStars = (rating) => Array(5).fill(0).map((_, i) => `<i class="bi ${i < rating ? 'bi-star-fill text-warning' : 'bi-star'}"></i>`).join('');

    const fetchReviews = async () => {
        try {
            const response = await fetch(`${API_URL}/reviews/all`, { headers: { 'x-auth-token': token } });
            if (!response.ok) throw new Error('Gagal mengambil data ulasan');
            
            const reviews = await response.json();
            reviewTableBody.innerHTML = '';
            reviews.forEach(review => {
                const row = `
                    <tr>
                        <td>${review.user ? review.user.username : 'N/A'}</td>
                        <td>${renderStars(review.rating)}</td>
                        <td>${review.comment}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-warning edit-review-btn" data-id="${review._id}" data-rating="${review.rating}" data-comment="${review.comment}"><i class="bi bi-pencil-square"></i></button>
                            <button class="btn btn-sm btn-outline-danger delete-review-btn" data-id="${review._id}"><i class="bi bi-trash3"></i></button>
                        </td>
                    </tr>
                `;
                reviewTableBody.insertAdjacentHTML('beforeend', row);
            });
        } catch (error) {
            console.error(error);
            reviewTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Gagal memuat data ulasan.</td></tr>`;
        }
    };

    // --- Logika untuk membuka Modal dan Menghapus ---
    const openEditUserModal = (user) => {
        document.getElementById('edit-user-id').value = user._id;
        document.getElementById('edit-username').value = user.username;
        document.getElementById('edit-email').value = user.email;
        document.getElementById('edit-role').value = user.role;
        editUserModal.show();
    };

    const deleteUser = async (id) => {
        if (confirm('Yakin ingin menghapus pengguna ini?')) {
            try {
                const response = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
                if (!response.ok) throw new Error('Gagal menghapus pengguna.');
                fetchUsers(); // Muat ulang data setelah berhasil
            } catch (error) {
                alert(error.message);
            }
        }
    };

    // --- Event Listeners untuk Form Submissions ---
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
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(newUser)
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.msg || 'Gagal menambah user');
            }
            addUserForm.reset();
            addUserModal.hide();
            fetchUsers();
        } catch (error) {
            alert(error.message);
        }
    });

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
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(updatedUser)
            });
            if (!response.ok) throw new Error('Gagal mengupdate user');
            editUserModal.hide();
            fetchUsers();
        } catch (error) {
            alert(error.message);
        }
    });

    editReviewForm.addEventListener('submit', async (e) => {
        // ... (Logika form edit review sudah benar)
    });

    // --- Event Delegation untuk tombol di tabel ulasan ---
    reviewTableBody.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;

        if (target.classList.contains('edit-review-btn')) {
            document.getElementById('edit-review-id').value = id;
            document.getElementById('edit-rating').value = target.dataset.rating;
            document.getElementById('edit-comment').value = target.dataset.comment;
            editReviewModal.show();
        }
        if (target.classList.contains('delete-review-btn')) {
            if (confirm('Yakin ingin menghapus ulasan ini?')) {
                fetch(`${API_URL}/reviews/${id}`, { method: 'DELETE', headers: { 'x-auth-token': token } }).then(fetchReviews);
            }
        }
    });

    // --- Fungsionalitas Tombol Ekstra ---
    document.getElementById('download-excel-btn').addEventListener('click', () => {
        if (allUsersData.length > 0) {
            exportUsersToExcel(allUsersData);
        } else {
            alert('Data pengguna belum dimuat atau tidak ada untuk diunduh.');
        }
    });

    // Panggil fungsi utama saat halaman dimuat
    fetchUsers();
    fetchReviews();
});

// --- Fungsi Helper (di luar DOMContentLoaded) ---

function showUserQrCode(user) {
    const modalElement = document.getElementById('viewUserQrModal');
    const userQrModal = new bootstrap.Modal(modalElement);
    const usernameSpan = document.getElementById('qr-username');
    const qrContainer = document.getElementById('qr-code-container');

    qrContainer.innerHTML = '';
    usernameSpan.textContent = user.username;

    // Membuat QR code hanya dengan data esensial untuk keamanan
    const qrData = {
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role
    };

    new QRCode(qrContainer, {
        text: JSON.stringify(qrData, null, 2),
        width: 220,
        height: 220,
    });

    userQrModal.show();
}

function exportUsersToExcel(users) {
    const dataToExport = users.map(user => ({
        'User ID': user._id,
        'Username': user.username,
        'Email': user.email,
        'Nama Lengkap': user.fullName || '-',
        'No. HP': user.phone || '-',
        'Alamat': user.address || '-',
        'Role': user.role,
        'Data QR Code (JSON)': JSON.stringify(user)
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pengguna');

    worksheet['!cols'] = [
        { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 25 }, 
        { wch: 20 }, { wch: 40 }, { wch: 10 }, { wch: 50 }
    ];

    XLSX.writeFile(workbook, 'Data_Pengguna_AUTOHIDROLIK.xlsx');
}
