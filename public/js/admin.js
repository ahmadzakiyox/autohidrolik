document.addEventListener('DOMContentLoaded', () => {
    const adminPageMarker = document.getElementById('member-table-body');
    if (!adminPageMarker) {
        return; 
    }

    const token = localStorage.getItem('token');
    if (!token || localStorage.getItem('userRole') !== 'admin') {
        alert('Akses ditolak. Silakan login sebagai admin.');
        window.location.href = '/login.html';
        return;
    }

    // --- Elemen UI ---
    const alertPlaceholder = document.getElementById('alert-placeholder');
    const memberCountElement = document.getElementById('member-count');
    const visitorCountElement = document.getElementById('visitor-count');
    const transactionTotalElement = document.getElementById('transaction-total');
    const memberTableBody = document.getElementById('member-table-body');
    const nonMemberTableBody = document.getElementById('non-member-table-body');
    const expiredMemberTableBody = document.getElementById('expired-member-table-body');
    const pendingPaymentTableBody = document.getElementById('pending-payment-table-body');
    const reviewTableBody = document.getElementById('review-table-body');
    const downloadButton = document.getElementById('download-data-btn');

    // --- Inisialisasi Modal ---
    const addUserModal = new bootstrap.Modal(document.getElementById('addUserModal'));
    const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
    const viewBarcodeModal = new bootstrap.Modal(document.getElementById('viewBarcodeModal'));
    const setPackageModal = new bootstrap.Modal(document.getElementById('setPackageModal'));
    const resetPasswordModal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
    
    // --- Variabel Global ---
    let cachedUsers = [];
    let cachedReviews = [];

    // --- Fungsi Helper ---
    function showAlert(message, type = 'danger') {
        if (alertPlaceholder) {
            alertPlaceholder.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
        }
    }

    const getHeaders = (includeContentType = true) => {
        const headers = { 'x-auth-token': token };
        if (includeContentType) headers['Content-Type'] = 'application/json';
        return headers;
    };

    // --- Fungsi Fetch Data ---
    const fetchDashboardStats = async () => {
        try {
            const response = await fetch('/api/dashboard-stats', { headers: getHeaders(false) });
            if (!response.ok) throw new Error('Gagal mengambil data statistik.');
            const stats = await response.json();
            memberCountElement.textContent = stats.activeMembers;
            visitorCountElement.textContent = stats.totalVisitors;
            transactionTotalElement.textContent = `Rp ${stats.totalTransactions.toLocaleString('id-ID')}`;
        } catch (error) {
            showAlert(error.message);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users', { headers: getHeaders(false) });
            if (!response.ok) throw new Error('Gagal mengambil data pengguna.');
            cachedUsers = await response.json();
            renderTables(cachedUsers);
        } catch (error) {
            const errorMsg = `<tr><td colspan="8" class="text-center text-danger">${error.message}</td></tr>`;
            memberTableBody.innerHTML = errorMsg;
            expiredMemberTableBody.innerHTML = errorMsg;
            nonMemberTableBody.innerHTML = errorMsg;
            pendingPaymentTableBody.innerHTML = errorMsg;
        }
    };

    // --- Fungsi Render Tampilan ---
    const renderTables = (users) => {
        const today = new Date();
        
        let activeHtml = '';
        let pendingHtml = '';
        let expiredHtml = '';
        let nonMemberHtml = '';
        let activeCounter = 1;
        let nonMemberCounter = 1;

        users.forEach(user => {
            if (user.memberships && user.memberships.length > 0) {
                let hasActiveOrPendingPackage = false;
                user.memberships.forEach(pkg => {
                    const expiryDate = new Date(pkg.expiresAt);
                    
                    if (!pkg.isPaid) {
                        hasActiveOrPendingPackage = true;
                        // --- RENDER TABEL PENDING ---
                        pendingHtml += `
                            <tr data-user-id="${user._id}" data-package-id="${pkg._id}">
                                <td>${user.username}</td>
                                <td>${user.phone || '-'}</td>
                                <td>${pkg.packageName}</td>
                                <td>${new Date(pkg.purchaseDate).toLocaleDateString('id-ID')}</td>
                                <td>
                                    <button class="btn btn-sm btn-success confirm-payment-btn">
                                        <i class="bi bi-check-circle"></i> Konfirmasi
                                    </button>
                                </td>
                            </tr>
                        `;
                    } else if (expiryDate >= today) {
                        hasActiveOrPendingPackage = true;
                        // --- RENDER TABEL AKTIF ---
                        let membershipStatus = '';
                        if (pkg.packageName.toLowerCase().includes('nano')) {
                            membershipStatus = `<div>${pkg.packageName}</div><small class="text-muted">Kartu Aktif</small>`;
                        } else if (pkg.packageName === 'Paket Kombinasi') {
                            membershipStatus = `<div>Paket Kombinasi</div><small class="text-muted">Bodywash: <strong>${pkg.washes.bodywash}x</strong>, Hidrolik: <strong>${pkg.washes.hidrolik}x</strong></small>`;
                        } else {
                            membershipStatus = `${pkg.packageName} (${pkg.remainingWashes}x)`;
                        }

                        const actionButtons = `
                            <button class="btn btn-sm btn-outline-info view-barcode-btn" title="QR Code" data-user-id="${user._id}" data-package-id="${pkg.packageId}"><i class="bi bi-qr-code"></i></button>
                            <button class="btn btn-sm btn-outline-warning edit-user-btn" title="Edit User" data-user-id="${user._id}"><i class="bi bi-pencil-square"></i></button>
                            <button class="btn btn-sm btn-outline-danger delete-user-btn" title="Hapus User" data-user-id="${user._id}"><i class="bi bi-trash3"></i></button>
                        `;

                        activeHtml += `
                            <tr>
                                <td>${activeCounter++}</td>
                                <td>${user.username}</td>
                                <td>${user.email || '-'}</td>
                                <td>${user.phone || '-'}</td>
                                <td>${membershipStatus}</td>
                                <td><span class="badge bg-success">Lunas</span></td>
                                <td>${expiryDate.toLocaleDateString('id-ID')}</td>
                                <td><div class="btn-group">${actionButtons}</div></td>
                            </tr>
                        `;
                    }
                });

                if (!hasActiveOrPendingPackage) {
                    // Jika semua paketnya sudah kedaluwarsa, tampilkan di tabel non-member juga
                    nonMemberHtml += renderNonMemberRow(user, nonMemberCounter++);
                }
            } else {
                 // --- RENDER TABEL NON-MEMBER ---
                 nonMemberHtml += renderNonMemberRow(user, nonMemberCounter++);
            }
        });

        memberTableBody.innerHTML = activeHtml || `<tr><td colspan="8" class="text-center text-muted">Belum ada member aktif.</td></tr>`;
        pendingPaymentTableBody.innerHTML = pendingHtml || `<tr><td colspan="5" class="text-center text-muted">Tidak ada pembayaran yang tertunda.</td></tr>`;
        nonMemberTableBody.innerHTML = nonMemberHtml || `<tr><td colspan="5" class="text-center text-muted">Tidak ada pengguna non-member.</td></tr>`;
    };
    
    const renderNonMemberRow = (user, counter) => {
        return `
            <tr data-user-id="${user._id}">
                <td>${counter}</td>
                <td>${user.username}</td>
                <td>${user.email || '-'}</td>
                <td>${user.phone || '-'}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-success set-package-btn"><i class="bi bi-gem"></i> Jadikan Member</button>
                        <button class="btn btn-sm btn-outline-warning edit-user-btn"><i class="bi bi-pencil-square"></i> Edit</button>
                        <button class="btn btn-sm btn-outline-danger delete-user-btn"><i class="bi bi-trash3"></i> Hapus</button>
                    </div>
                </td>
            </tr>
        `;
    };

    // --- Fungsi Aksi ---
    const handleConfirmPayment = async (userId, packageId) => {
        if (!confirm('Anda yakin ingin mengonfirmasi pembayaran untuk paket ini?')) return;
        try {
            const response = await fetch(`/api/confirm-payment/${userId}/${packageId}`, { 
                method: 'POST', 
                headers: getHeaders(false) 
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg || 'Gagal konfirmasi.');
            
            showAlert(`Pembayaran untuk ${result.user.username} berhasil dikonfirmasi.`, 'success');
            fetchUsers(); 
            fetchDashboardStats();
        } catch (error) { 
            showAlert(error.message); 
        }
    };

    const deleteUser = async (userId) => {
        if (!confirm('Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan.')) return;
        try {
            const response = await fetch(`/api/users/${userId}`, { method: 'DELETE', headers: getHeaders(false) });
            if (!response.ok) throw new Error('Gagal menghapus pengguna.');
            showAlert('Pengguna berhasil dihapus.', 'success');
            fetchUsers();
            fetchDashboardStats();
        } catch (error) { showAlert(error.message); }
    };
    
    // --- Fungsi Modal ---
    const openBarcodeModal = (user, packageId) => {
        document.getElementById('barcode-username').textContent = user.username;
        const qrCodeContainer = document.getElementById('barcode-container');
        const barcodeDataEl = document.getElementById('barcode-data');
        qrCodeContainer.innerHTML = '';
        
        const qrData = `${user.memberId};${packageId}`;
        barcodeDataEl.textContent = qrData;

        if (user.memberId && packageId) {
            new QRCode(qrCodeContainer, { text: qrData, width: 200, height: 200 });
        } else {
            qrCodeContainer.innerHTML = '<p class="text-danger">Data untuk QR Code tidak lengkap.</p>';
        }
        viewBarcodeModal.show();
    };

    const openEditModal = (user) => {
        document.getElementById('edit-user-id').value = user._id;
        document.getElementById('edit-username').value = user.username;
        document.getElementById('edit-email').value = user.email;
        document.getElementById('edit-phone').value = user.phone;
        document.getElementById('edit-role').value = user.role;
        editUserModal.show();
    };
    
    const openSetPackageModal = (user) => {
        document.getElementById('package-username').textContent = user.username;
        document.getElementById('set-package-userid').value = user._id;
        document.getElementById('set-package-form').reset();
        setPackageModal.show();
    };

    // --- Event Listener Utama ---
    document.body.addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        if (button.classList.contains('confirm-payment-btn')) {
            const row = button.closest('tr');
            if (row && row.dataset.userId && row.dataset.packageId) {
                handleConfirmPayment(row.dataset.userId, row.dataset.packageId);
            }
            return;
        }

        if (button.classList.contains('view-barcode-btn')) {
            const userId = button.dataset.userId;
            const packageId = button.dataset.packageId;
            const user = cachedUsers.find(u => u._id === userId);
            if(user) {
                openBarcodeModal(user, packageId);
            }
            return;
        }
        
        const userRow = button.closest('tr[data-user-id]');
        if (userRow) {
            const userId = userRow.dataset.userId;
            const user = cachedUsers.find(u => u._id === userId);
            if (user) {
                if (button.classList.contains('edit-user-btn')) return openEditModal(user);
                if (button.classList.contains('set-package-btn')) return openSetPackageModal(user);
                if (button.classList.contains('delete-user-btn')) return deleteUser(userId);
            }
        }
    });

    // --- Event Listener Form ---
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
            const response = await fetch(`/api/users/${userId}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(userData) });
            if (!response.ok) throw new Error('Gagal mengupdate user.');
            showAlert('Data pengguna berhasil diperbarui.', 'success');
            editUserModal.hide();
            fetchUsers();
        } catch (error) { showAlert(error.message); }
    });

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
            const response = await fetch(`/api/purchase-membership-admin/${userId}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(packageData) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg);
            showAlert(result.msg, 'success');
            setPackageModal.hide();
            fetchUsers();
        } catch (error) { showAlert(error.message); }
    });
    
    document.getElementById('logout-button').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        window.location.href = '/login.html';
    });

    // --- Inisialisasi Halaman ---
    fetchDashboardStats();
    fetchUsers();
});
