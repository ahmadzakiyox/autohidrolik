document.addEventListener('DOMContentLoaded', () => {
    // --- PENYESUAIAN KUNCI ---
    // Gunakan path relatif agar berfungsi di localhost dan server produksi.
    const API_URL = ''; 
    const token = localStorage.getItem('token');
    
    // Pengecekan otorisasi di awal
    if (!token || localStorage.getItem('userRole') !== 'admin') {
        alert('Akses ditolak. Silakan login sebagai admin.');
        window.location.href = '/login.html';
        return;
    }

    // Ambil elemen UI
    const userTableBody = document.getElementById('user-table-body');
    const reviewTableBody = document.getElementById('review-table-body');
    const memberCountElement = document.getElementById('member-count');
    const alertPlaceholder = document.getElementById('alert-placeholder'); // Untuk notifikasi

    // Inisialisasi semua modal Bootstrap
    const addUserModal = new bootstrap.Modal(document.getElementById('addUserModal'));
    const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
    const viewBarcodeModal = new bootstrap.Modal(document.getElementById('viewBarcodeModal'));
    const setPackageModal = new bootstrap.Modal(document.getElementById('setPackageModal'));
    const editReviewModal = new bootstrap.Modal(document.getElementById('editReviewModal'));
    const resetPasswordModal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));

    /**
     * Fungsi untuk menampilkan notifikasi/alert yang lebih baik.
     */
    const showAlert = (message, type = 'danger') => {
        alertPlaceholder.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>`;
    };

    /**
     * Membuat header otentikasi untuk setiap permintaan API.
     */
    const getHeaders = (includeContentType = true) => {
        const headers = {};
        if (includeContentType) {
            headers['Content-Type'] = 'application/json';
        }
        headers['x-auth-token'] = token;
        return headers;
    };
    
    // --- MANAJEMEN PENGGUNA ---
    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/users`, { headers: getHeaders(false) });
            if (!response.ok) throw new Error('Gagal mengambil data pengguna.');
            const users = await response.json();
            displayUsers(users);
        } catch (error) {
            showAlert(error.message);
            userTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Gagal memuat data.</td></tr>`;
        }
    };

    const displayUsers = (users) => {
        userTableBody.innerHTML = '';
        let memberCount = 0;
        let userCounter = 1;

        users.filter(u => u.role !== 'admin').forEach(user => {
            const row = document.createElement('tr');
            let membershipStatus = '<span class="text-muted">Non-Member</span>';
            let paymentStatus = '-';
            let actionButtons = `
                <button class="btn btn-sm btn-outline-secondary reset-password-btn" title="Reset Sandi"><i class="bi bi-key-fill"></i></button>
                <button class="btn btn-sm btn-outline-success set-package-btn" title="Atur Paket"><i class="bi bi-gem"></i></button> 
                <button class="btn btn-sm btn-outline-warning edit-user-btn" title="Edit"><i class="bi bi-pencil-square"></i></button> 
                <button class="btn btn-sm btn-outline-danger delete-user-btn" title="Hapus"><i class="bi bi-trash3"></i></button>`;
            
            if (user.membership) {
                memberCount++;
                membershipStatus = `${user.membership.packageName} (${user.membership.remainingWashes}x)`;
                paymentStatus = user.membership.isPaid
                    ? '<span class="badge bg-success">Lunas</span>'
                    : '<span class="badge bg-warning text-dark">Belum Bayar</span>';

                if (!user.membership.isPaid) {
                    actionButtons = `<button class="btn btn-sm btn-info confirm-payment-btn" title="Konfirmasi Bayar"><i class="bi bi-check-circle"></i></button> ` + actionButtons;
                } else {
                     actionButtons = `<button class="btn btn-sm btn-outline-info view-barcode-btn" title="QR Code"><i class="bi bi-qr-code"></i></button> ` + actionButtons;
                }
            }
            
            row.innerHTML = `
                <td>${userCounter++}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${membershipStatus}</td>
                <td>${paymentStatus}</td>
                <td><div class="btn-group">${actionButtons}</div></td>`;

            // Tambahkan event listener ke setiap tombol di baris
            row.querySelector('.edit-user-btn')?.addEventListener('click', () => openEditModal(user));
            row.querySelector('.delete-user-btn')?.addEventListener('click', () => deleteUser(user._id));
            row.querySelector('.view-barcode-btn')?.addEventListener('click', () => openBarcodeModal(user));
            row.querySelector('.set-package-btn')?.addEventListener('click', () => openSetPackageModal(user));
            row.querySelector('.confirm-payment-btn')?.addEventListener('click', () => handleConfirmPayment(user._id));
            row.querySelector('.reset-password-btn')?.addEventListener('click', () => openResetPasswordModal(user));
            userTableBody.appendChild(row);
        });
        memberCountElement.textContent = memberCount;
    };

    const handleConfirmPayment = async (userId) => {
        if (confirm('Anda yakin ingin mengonfirmasi pembayaran untuk pengguna ini?')) {
            try {
                const response = await fetch(`${API_URL}/api/confirm-payment/${userId}`, {
                    method: 'POST',
                    headers: getHeaders(false)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.msg || 'Gagal konfirmasi.');
                showAlert(`Pembayaran untuk ${result.user.username} berhasil dikonfirmasi.`, 'success');
                fetchUsers();
            } catch (error) { showAlert(error.message); }
        }
    };
    
    // --- FUNGSI MODAL (TIDAK BERUBAH BANYAK) ---
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
            new QRCode(qrCodeContainer, {
                text: user.memberId, width: 200, height: 200
            });
            const memberIdText = document.createElement('p');
            memberIdText.className = 'mt-3 fw-bold';
            memberIdText.textContent = user.memberId;
            qrCodeContainer.appendChild(memberIdText);
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
    
    // --- EVENT LISTENER FORM (TIDAK BERUBAH BANYAK) ---
    // (Submit Add User, Edit User, Set Package, Reset Password, dll.)
    // ... (Logika form dari file unggahan Anda dipertahankan di sini) ...
    
    // --- MANAJEMEN ULASAN ---
    const fetchReviews = async () => {
         try {
            const response = await fetch(`${API_URL}/api/reviews/all`, { headers: getHeaders(false) });
            if (!response.ok) throw new Error('Gagal mengambil data ulasan.');
            const reviews = await response.json();
            displayReviews(reviews);
        } catch (error) {
            showAlert(error.message);
            reviewTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Gagal memuat data.</td></tr>`;
        }
    };

    const displayReviews = (reviews) => {
        reviewTableBody.innerHTML = '';
        reviews.forEach(review => {
            const row = document.createElement('tr');
            const ratingStars = '<span class="rating-stars">' + '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating) + '</span>';
            const username = review.user ? review.user.username : '<em class="text-muted">User Dihapus</em>';
            row.innerHTML = `
                <td>${username}</td>
                <td>${ratingStars}</td>
                <td>${review.comment}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-warning edit-review-btn"><i class="bi bi-pencil-square"></i></button>
                        <button class="btn btn-sm btn-outline-danger delete-review-btn"><i class="bi bi-trash3"></i></button>
                    </div>
                </td>`;
            row.querySelector('.edit-review-btn').addEventListener('click', () => openEditReviewModal(review));
            row.querySelector('.delete-review-btn').addEventListener('click', () => deleteReview(review._id));
            reviewTableBody.appendChild(row);
        });
    };

    const openEditReviewModal = (review) => {
        document.getElementById('edit-review-id').value = review._id;
        document.getElementById('edit-rating').value = review.rating;
        document.getElementById('edit-comment').value = review.comment;
        editReviewModal.show();
    };

    const deleteReview = async (reviewId) => {
        if (confirm('Anda yakin ingin menghapus ulasan ini?')) {
            try {
                const response = await fetch(`${API_URL}/api/reviews/${reviewId}`, {
                    method: 'DELETE',
                    headers: getHeaders(false)
                });
                if (!response.ok) throw new Error('Gagal menghapus ulasan.');
                showAlert('Ulasan berhasil dihapus.', 'success');
                fetchReviews();
            } catch (error) { showAlert(error.message); }
        }
    };

    // --- LOGOUT & INISIALISASI ---
    document.getElementById('logout-button').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        window.location.href = '/login.html';
    });
    
    fetchUsers();
    fetchReviews();
});

