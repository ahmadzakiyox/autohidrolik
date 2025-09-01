document.addEventListener('DOMContentLoaded', () => {
    // --- KONFIGURASI & INISIALISASI ---
    const token = localStorage.getItem('token');
    if (!token || localStorage.getItem('userRole') !== 'admin') {
        alert('Akses ditolak. Silakan login sebagai admin.');
        window.location.href = '/login.html';
        return;
    }

    // --- Elemen UI ---
    // Pastikan semua elemen didefinisikan di sini, di bagian atas
    const alertPlaceholder = document.getElementById('alert-placeholder');
    const userTableBody = document.getElementById('user-table-body');
    const reviewTableBody = document.getElementById('review-table-body');
    const memberCountElement = document.getElementById('member-count');
    const visitorCountElement = document.getElementById('visitor-count');
    const transactionTotalElement = document.getElementById('transaction-total');
    const downloadButton = document.getElementById('download-data-btn');

    // Inisialisasi semua modal (pop-up)
    const addUserModal = new bootstrap.Modal(document.getElementById('addUserModal'));
    const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
    const viewBarcodeModal = new bootstrap.Modal(document.getElementById('viewBarcodeModal'));
    const setPackageModal = new bootstrap.Modal(document.getElementById('setPackageModal'));
    const editReviewModal = new bootstrap.Modal(document.getElementById('editReviewModal'));
    const resetPasswordModal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));

    let cachedUsers = []; // Variabel untuk menyimpan data pengguna sementara

    // --- FUNGSI HELPER (PEMBANTU) ---

    // Didefinisikan sebagai 'function' agar bisa diakses dari mana saja (hoisting)
    function showAlert(message, type = 'danger') {
        if (alertPlaceholder) {
            alertPlaceholder.innerHTML = `
                <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>`;
        } else {
            console.error('Elemen #alert-placeholder tidak ditemukan di HTML.');
        }
    }

    // Fungsi untuk membuat header otentikasi
    const getHeaders = (includeContentType = true) => {
        const headers = { 'x-auth-token': token };
        if (includeContentType) headers['Content-Type'] = 'application/json';
        return headers;
    };

    // --- FUNGSI PENGAMBILAN DATA (FETCH) ---
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
            displayUsers(cachedUsers);
        } catch (error) {
            userTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${error.message}</td></tr>`;
        }
    };

    const fetchReviews = async () => {
        try {
            const response = await fetch('/api/reviews/all', { headers: getHeaders(false) });
            if (!response.ok) throw new Error('Gagal mengambil data ulasan.');
            const reviews = await response.json();
            displayReviews(reviews);
        } catch (error) {
            reviewTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">${error.message}</td></tr>`;
        }
    };

    // --- FUNGSI TAMPILAN (DISPLAY) ---
    const displayUsers = (users) => {
        userTableBody.innerHTML = '';
        let userCounter = 1;
        users.filter(u => u.role !== 'admin').forEach(user => {
            const row = document.createElement('tr');
            row.dataset.userId = user._id;
            let membershipStatus = '<span class="text-muted">Non-Member</span>';
            let paymentStatus = '-';
            let actionButtons = `
                <button class="btn btn-sm btn-outline-secondary reset-password-btn" title="Reset Sandi"><i class="bi bi-key-fill"></i></button>
                <button class="btn btn-sm btn-outline-success set-package-btn" title="Atur Paket"><i class="bi bi-gem"></i></button>
                <button class="btn btn-sm btn-outline-warning edit-user-btn" title="Edit"><i class="bi bi-pencil-square"></i></button>
                <button class="btn btn-sm btn-outline-danger delete-user-btn" title="Hapus"><i class="bi bi-trash3"></i></button>`;
            if (user.membership) {
                membershipStatus = `${user.membership.packageName} (${user.membership.remainingWashes}x)`;
                paymentStatus = user.membership.isPaid ? '<span class="badge bg-success">Lunas</span>' : '<span class="badge bg-warning text-dark">Belum Bayar</span>';
                if (user.membership.isPaid) {
                    actionButtons = `<button class="btn btn-sm btn-outline-info view-barcode-btn" title="QR Code"><i class="bi bi-qr-code"></i></button> ` + actionButtons;
                } else {
                    actionButtons = `<button class="btn btn-sm btn-info confirm-payment-btn" title="Konfirmasi Bayar"><i class="bi bi-check-circle"></i></button> ` + actionButtons;
                }
            }
            row.innerHTML = `<td>${String(userCounter++).padStart(3, '0')}</td><td>${user.username}</td><td>${user.email}</td><td>${membershipStatus}</td><td>${paymentStatus}</td><td><div class="btn-group">${actionButtons}</div></td>`;
            userTableBody.appendChild(row);
        });
    };

    const displayReviews = (reviews) => {
        reviewTableBody.innerHTML = '';
        reviews.forEach(review => {
            const row = document.createElement('tr');
            row.dataset.reviewId = review._id;
            const ratingStars = '<span class="rating-stars">' + '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating) + '</span>';
            const username = review.user ? review.user.username : '<em class="text-muted">Pengguna Dihapus</em>';
            row.innerHTML = `<td>${username}</td><td>${ratingStars}</td><td>${review.comment}</td>
                <td><div class="btn-group">
                    <button class="btn btn-sm btn-outline-warning edit-review-btn"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn btn-sm btn-outline-danger delete-review-btn"><i class="bi bi-trash3"></i></button>
                </div></td>`;
            reviewTableBody.appendChild(row);
        });
    };

    // --- FUNGSI-FUNGSI AKSI (OPERASI CRUD) ---
    const handleConfirmPayment = async (userId) => {
        if (!confirm('Anda yakin ingin mengonfirmasi pembayaran untuk pengguna ini?')) return;
        try {
            const response = await fetch(`/api/confirm-payment/${userId}`, { method: 'POST', headers: getHeaders(false) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg || 'Gagal konfirmasi.');
            showAlert(`Pembayaran untuk ${result.user.username} berhasil dikonfirmasi.`, 'success');
            fetchUsers();
            fetchDashboardStats();
        } catch (error) { showAlert(error.message); }
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

    const deleteReview = async (reviewId) => {
        if (!confirm('Anda yakin ingin menghapus ulasan ini?')) return;
        try {
            const response = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE', headers: getHeaders(false) });
            if (!response.ok) throw new Error('Gagal menghapus ulasan.');
            showAlert('Ulasan berhasil dihapus.', 'success');
            fetchReviews();
        } catch (error) { showAlert(error.message); }
    };

    // --- FUNGSI-FUNGSI MODAL (POP-UP) ---
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
        const qrCodeContainer = document.getElementById('barcode-container');
        qrCodeContainer.innerHTML = '';
        if (user.memberId) {
            new QRCode(qrCodeContainer, { text: user.memberId, width: 200, height: 200 });
        } else {
            qrCodeContainer.innerHTML = '<p class="text-danger">Member ID tidak ditemukan.</p>';
        }
        viewBarcodeModal.show();
    };

    const openSetPackageModal = (user) => {
        document.getElementById('package-username').textContent = user.username;
        document.getElementById('set-package-userid').value = user._id;
        document.getElementById('set-package-form').reset();
        setPackageModal.show();
    };

    const openResetPasswordModal = (user) => {
        document.getElementById('reset-password-username').textContent = user.username;
        document.getElementById('reset-password-userid').value = user._id;
        document.getElementById('reset-password-form').reset();
        resetPasswordModal.show();
    };

    const openEditReviewModal = (review) => {
        document.getElementById('edit-review-id').value = review._id;
        document.getElementById('edit-rating').value = review.rating;
        document.getElementById('edit-comment').value = review.comment;
        editReviewModal.show();
    };

    // --- EVENT LISTENER UTAMA (EVENT DELEGATION) ---
    document.body.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const userRow = button.closest('tr[data-user-id]');
        if (userRow) {
            const userId = userRow.dataset.userId;
            const user = cachedUsers.find(u => u._id === userId);
            if (button.classList.contains('confirm-payment-btn')) return handleConfirmPayment(userId);
            if (button.classList.contains('delete-user-btn')) return deleteUser(userId);
            if (user) {
                if (button.classList.contains('edit-user-btn')) return openEditModal(user);
                if (button.classList.contains('view-barcode-btn')) return openBarcodeModal(user);
                if (button.classList.contains('set-package-btn')) return openSetPackageModal(user);
                if (button.classList.contains('reset-password-btn')) return openResetPasswordModal(user);
            }
        }

       // Aksi untuk tabel ulasan
    const reviewRow = button.closest('tr[data-review-id]');
    if (reviewRow) {
        const reviewId = reviewRow.dataset.reviewId;

        // Logika untuk tombol hapus ulasan
        if (button.classList.contains('delete-review-btn')) {
            return deleteReview(reviewId);
        }
        
        // --- LANJUTAN KODE ANDA DI SINI ---
        // Logika untuk tombol edit ulasan
        if (button.classList.contains('edit-review-btn')) {
            // Cari data ulasan lengkap dari cache berdasarkan ID
            const review = cachedReviews.find(r => r._id === reviewId);
            if (review) {
                // Jika ditemukan, panggil fungsi untuk membuka modal edit
                return openEditReviewModal(review);
            }
        }
    }
});

    // --- EVENT LISTENER UNTUK FORM SUBMISSIONS ---
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
            const response = await fetch('/api/users', { method: 'POST', headers: getHeaders(), body: JSON.stringify(userData) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg || 'Gagal menambah user.');
            showAlert('Pengguna baru berhasil ditambahkan.', 'success');
            addUserModal.hide();
            fetchUsers();
            fetchDashboardStats();
        } catch (error) { showAlert(error.message); }
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
            const response = await fetch(`/api/users/${userId}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(userData) });
            if (!response.ok) throw new Error('Gagal mengupdate user.');
            showAlert('Data pengguna berhasil diperbarui.', 'success');
            editUserModal.hide();
            fetchUsers();
        } catch (error) { showAlert(error.message); }
    });

    document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('reset-password-userid').value;
        const newPassword = document.getElementById('new-password-admin').value;
        try {
            const response = await fetch(`/api/users/${userId}/reset-password`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ newPassword }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg || 'Gagal reset sandi.');
            showAlert(result.msg, 'success');
            resetPasswordModal.hide();
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
            if (!response.ok) throw new Error(result.msg || 'Gagal mengatur paket.');
            showAlert(result.msg, 'success');
            setPackageModal.hide();
            fetchUsers();
        } catch (error) { showAlert(error.message); }
    });

    document.getElementById('edit-review-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const reviewId = document.getElementById('edit-review-id').value;
        const reviewData = {
            rating: document.getElementById('edit-rating').value,
            comment: document.getElementById('edit-comment').value,
        };
        try {
            const response = await fetch(`/api/reviews/${reviewId}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(reviewData) });
            if (!response.ok) throw new Error('Gagal mengupdate ulasan.');
            showAlert('Ulasan berhasil diperbarui.', 'success');
            editReviewModal.hide();
            fetchReviews();
        } catch (error) { showAlert(error.message); }
    });

    downloadButton.addEventListener('click', async () => {
        downloadButton.disabled = true;
        downloadButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Mengunduh...';
        try {
            const response = await fetch('/api/download-data', { headers: getHeaders(false) });
            if (!response.ok) throw new Error('Gagal mengunduh data.');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `data_autohidrolik_${new Date().toISOString().slice(0,10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            showAlert(error.message);
        } finally {
            downloadButton.disabled = false;
            downloadButton.innerHTML = '<i class="bi bi-download"></i> Download Data';
        }
    });

    document.getElementById('logout-button').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        window.location.href = '/login.html';
    });
    
    // --- INISIALISASI SAAT HALAMAN DIMUAT ---
    fetchDashboardStats();
    fetchUsers();
    fetchReviews();
});
