// File: /js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://autohidrolik.com'; // Sesuaikan dengan URL API Anda
    const token = localStorage.getItem('token');
    const userTableBody = document.getElementById('user-table-body');
    const memberCountElement = document.getElementById('member-count');

    // Inisialisasi semua modal
    const addUserModal = new bootstrap.Modal(document.getElementById('addUserModal'));
    const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
    const viewBarcodeModal = new bootstrap.Modal(document.getElementById('viewBarcodeModal'));
    const setPackageModal = new bootstrap.Modal(document.getElementById('setPackageModal'));

    if (!token) {
        window.location.href = '/login';
        return;
    }

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/users`, {
                headers: { 'x-auth-token': token }
            });
            if (!response.ok) throw new Error('Gagal mengambil data pengguna.');
            
            const users = await response.json();
            displayUsers(users);
        } catch (error) {
            console.error(error);
            userTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Gagal memuat data.</td></tr>`;
        }
    };

    const displayUsers = (users) => {
        userTableBody.innerHTML = '';
        let memberCount = 0;

        users.forEach(user => {
            // Jangan tampilkan atau hitung admin
            if (user.role === 'admin') return;

            const row = document.createElement('tr');
            
            let membershipStatus = '<span class="text-muted">Non-Member</span>';
            let paymentStatus = '-';
            let actionButtons = `
                <button class="btn btn-sm btn-outline-success set-package-btn" title="Atur Paket Member"><i class="bi bi-gem"></i></button>
                <button class="btn btn-sm btn-outline-warning edit-user-btn" title="Edit User"><i class="bi bi-pencil-square"></i></button>
                <button class="btn btn-sm btn-outline-danger delete-user-btn" title="Hapus User"><i class="bi bi-trash3"></i></button>
            `;

            if (user.membership) {
                memberCount++; // Hitung sebagai member jika memiliki data membership
                membershipStatus = `${user.membership.packageName} (${user.membership.remainingWashes}x)`;
                
                if (user.membership.isPaid) {
                    paymentStatus = '<span class="badge bg-success">Lunas</span>';
                    // Tambahkan tombol lihat barcode jika sudah lunas
                    actionButtons = `
                        <button class="btn btn-sm btn-outline-info view-barcode-btn" title="Lihat Barcode"><i class="bi bi-qr-code"></i></button>
                    ` + actionButtons;
                } else {
                    paymentStatus = '<span class="badge bg-warning text-dark">Belum Bayar</span>';
                    // Tambahkan tombol konfirmasi jika belum lunas
                    actionButtons = `
                        <button class="btn btn-sm btn-info confirm-payment-btn" title="Konfirmasi Bayar"><i class="bi bi-check-circle"></i></button>
                    ` + actionButtons;
                }
            }

            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${membershipStatus}</td>
                <td>${paymentStatus}</td>
                <td><div class="btn-group">${actionButtons}</div></td>
            `;

            // Menambahkan event listener ke setiap tombol
            row.querySelector('.edit-user-btn')?.addEventListener('click', () => openEditModal(user));
            row.querySelector('.delete-user-btn')?.addEventListener('click', () => deleteUser(user._id));
            row.querySelector('.view-barcode-btn')?.addEventListener('click', () => openBarcodeModal(user));
            row.querySelector('.set-package-btn')?.addEventListener('click', () => openSetPackageModal(user));
            row.querySelector('.confirm-payment-btn')?.addEventListener('click', () => handleConfirmPayment(user._id));

            userTableBody.appendChild(row);
        });

        // Update hitungan member
        memberCountElement.textContent = memberCount;
    };

    // --- Logika untuk Modal ---

    const openEditModal = (user) => {
        document.getElementById('edit-user-id').value = user._id;
        document.getElementById('edit-username').value = user.username;
        document.getElementById('edit-email').value = user.email;
        document.getElementById('edit-phone').value = user.phone;
        document.getElementById('edit-role').value = user.role;
        editUserModal.show();
    };

    const openBarcodeModal = (user) => {
        document.getElementById('barcode-username').textContent = user.username;
        JsBarcode("#barcode-container", user._id, {
            format: "CODE128", width: 2, height: 80, displayValue: false
        });
        viewBarcodeModal.show();
    };

    const openSetPackageModal = (user) => {
        document.getElementById('package-username').textContent = user.username;
        document.getElementById('set-package-userid').value = user._id;
        document.getElementById('set-package-form').reset();
        setPackageModal.show();
    };

    // --- Logika untuk Aksi (Add, Edit, Delete, dll.) ---

    document.getElementById('add-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userData = {
            username: document.getElementById('add-username').value,
            email: document.getElementById('add-email').value,
            phone: document.getElementById('add-phone').value,
            password: document.getElementById('add-password').value,
            role: document.getElementById('add-role').value,
        };
        try {
            const response = await fetch(`${API_URL}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(userData)
            });
            if (!response.ok) throw new Error('Gagal menambah user.');
            addUserModal.hide();
            fetchUsers();
        } catch (error) { alert(error.message); }
    });
  
    document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('edit-user-id').value;
        const userData = {
            username: document.getElementById('edit-username').value,
            email: document.getElementById('edit-email').value,
            phone: document.getElementById('edit-phone').value,
            role: document.getElementById('edit-role').value,
        };
        try {
            const response = await fetch(`${API_URL}/api/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(userData)
            });
            if (!response.ok) throw new Error('Gagal mengupdate user.');
            editUserModal.hide();
            fetchUsers();
        } catch (error) { alert(error.message); }
    });

    const deleteUser = async (userId) => {
        if (confirm('Anda yakin ingin menghapus pengguna ini?')) {
            try {
                const response = await fetch(`${API_URL}/api/users/${userId}`, {
                    method: 'DELETE',
                    headers: { 'x-auth-token': token }
                });
                if (!response.ok) throw new Error('Gagal menghapus user.');
                fetchUsers();
            } catch (error) { alert(error.message); }
        }
    };

    const handleConfirmPayment = async (userId) => {
        if (confirm('Anda yakin ingin mengonfirmasi pembayaran untuk pengguna ini?')) {
            try {
                const response = await fetch(`${API_URL}/api/confirm-payment/${userId}`, {
                    method: 'POST',
                    headers: { 'x-auth-token': token }
                });
                if (!response.ok) throw new Error('Gagal konfirmasi.');
                fetchUsers();
            } catch (error) { alert(error.message); }
        }
    };

    document.getElementById('set-package-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('set-package-userid').value;
        const select = document.getElementById('package-name');
        const selectedOption = select.options[select.selectedIndex];
        
        const packageData = {
            packageName: selectedOption.value,
            totalWashes: parseInt(selectedOption.dataset.washes)
        };

        try {
            const response = await fetch(`${API_URL}/api/purchase-membership-admin/${userId}`, { // Rute baru diperlukan
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(packageData)
            });
            if (!response.ok) throw new Error('Gagal mengatur paket.');
            setPackageModal.hide();
            fetchUsers();
        } catch (error) { alert(error.message); }
    });
    
     // --- Logika untuk Aksi (Add, Edit, Delete, dll.) ---

    document.getElementById('add-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // --- PERBAIKAN DI SINI: Tambahkan 'phone' ---
        const userData = {
            username: document.getElementById('add-username').value,
            email: document.getElementById('add-email').value,
            phone: document.getElementById('add-phone').value, // <-- Tambahkan baris ini
            password: document.getElementById('add-password').value,
            role: document.getElementById('add-role').value,
        };

        try {
            const response = await fetch(`${API_URL}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(userData)
            });
            
            // Cek jika respons tidak OK
            if (!response.ok) {
                const errorData = await response.json(); // Coba dapatkan pesan error dari server
                throw new Error(errorData.msg || 'Gagal menambah user.');
            }

            addUserModal.hide();
            fetchUsers(); // Muat ulang data setelah berhasil
        } catch (error) { 
            alert(error.message); 
        }
    });
    
    // Panggil fungsi utama
    fetchUsers();
});
