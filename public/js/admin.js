document.addEventListener('DOMContentLoaded', () => {
    // --- PERBAIKAN KUNCI: Gunakan path relatif agar URL terdeteksi otomatis ---
    const API_URL = ''; 
    const token = localStorage.getItem('token');
    
    // Periksa otorisasi di awal
    if (!token || localStorage.getItem('userRole') !== 'admin') {
        // Menggunakan notifikasi yang lebih baik daripada alert()
        console.error('Akses ditolak. Pengguna bukan admin atau tidak login.');
        window.location.href = '/login.html';
        return;
    }

    // Ambil semua elemen UI yang dibutuhkan
    const userTableBody = document.getElementById('user-table-body');
    const reviewTableBody = document.getElementById('review-table-body');
    const memberCountElement = document.getElementById('member-count');
    const alertPlaceholder = document.getElementById('alert-placeholder');
    const downloadButton = document.getElementById('download-data-btn');

    // Inisialisasi semua modal (jendela pop-up)
    const addUserModal = new bootstrap.Modal(document.getElementById('addUserModal'));
    const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
    const viewBarcodeModal = new bootstrap.Modal(document.getElementById('viewBarcodeModal'));
    const setPackageModal = new bootstrap.Modal(document.getElementById('setPackageModal'));
    const editReviewModal = new bootstrap.Modal(document.getElementById('editReviewModal'));
    const resetPasswordModal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));

    let cachedUsers = []; // Variabel untuk menyimpan data pengguna sementara

    // --- FUNGSI HELPER ---

    /**
     * Menampilkan notifikasi yang lebih modern di atas halaman.
     * @param {string} message Pesan yang ingin ditampilkan.
     * @param {string} type Tipe notifikasi ('success' atau 'danger').
     */
    const showAlert = (message, type = 'danger') => {
        if (alertPlaceholder) {
            alertPlaceholder.innerHTML = `
                <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>`;
        } else {
            console.error('Elemen #alert-placeholder tidak ditemukan di HTML.');
        }
    };

    /**
     * Membuat header otentikasi untuk setiap permintaan ke server.
     */
    const getHeaders = (includeContentType = true) => {
        const headers = { 'x-auth-token': token };
        if (includeContentType) headers['Content-Type'] = 'application/json';
        return headers;
    };
    
    // --- MANAJEMEN PENGGUNA ---

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/users`, { headers: getHeaders(false) });
            if (!response.ok) throw new Error('Gagal mengambil data pengguna.');
            cachedUsers = await response.json();
            displayUsers(cachedUsers);
        } catch (error) {
            showAlert(error.message);
        }
    };

    const displayUsers = (users) => {
        userTableBody.innerHTML = '';
        const memberCount = users.filter(u => u.membership && u.membership.isPaid).length;
        let userCounter = 1;

        users.filter(u => u.role !== 'admin').forEach(user => {
            const row = document.createElement('tr');
            // Simpan ID pengguna di baris tabel untuk akses mudah
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
            
            row.innerHTML = `<td>${userCounter++}</td><td>${user.username}</td><td>${user.email}</td><td>${membershipStatus}</td><td>${paymentStatus}</td><td><div class="btn-group">${actionButtons}</div></td>`;
            userTableBody.appendChild(row);
        });
        memberCountElement.textContent = memberCount;
    };

    const handleConfirmPayment = async (userId) => {
        if (!confirm('Anda yakin ingin mengonfirmasi pembayaran untuk pengguna ini?')) return;
        try {
            const response = await fetch(`${API_URL}/api/confirm-payment/${userId}`, { method: 'POST', headers: getHeaders(false) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg || 'Gagal konfirmasi.');
            showAlert(`Pembayaran untuk ${result.user.username} berhasil dikonfirmasi.`, 'success');
            
            // PERBAIKAN PENTING: Muat ulang data untuk memperbarui tabel secara otomatis
            fetchUsers(); 

        } catch (error) { showAlert(error.message); }
    };

    const deleteUser = async (userId) => {
        if (confirm('Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan.')) {
            try {
                const response = await fetch(`${API_URL}/api/users/${userId}`, {
                    method: 'DELETE',
                    headers: getHeaders(false)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.msg || 'Gagal menghapus pengguna.');
                showAlert('Pengguna berhasil dihapus.', 'success');
                fetchUsers();
            } catch (error) {
                showAlert(error.message);
            }
        }
    };
    
    // --- MANAJEMEN ULASAN ---
    const fetchReviews = async () => {
        try {
            const response = await fetch(`${API_URL}/api/reviews/all`, { headers: getHeaders(false) });
            if (!response.ok) throw new Error('Gagal mengambil data ulasan.');
            const reviews = await response.json();
            displayReviews(reviews);
        } catch (error) {
            showAlert(error.message);
        }
    };

    const displayReviews = (reviews) => {
        reviewTableBody.innerHTML = '';
        reviews.forEach(review => {
            const row = document.createElement('tr');
            row.dataset.reviewId = review._id;
            const ratingStars = '<span class="rating-stars">' + '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating) + '</span>';
            const username = review.user ? review.user.username : '<em class="text-muted">Pengguna Dihapus</em>';
            row.innerHTML = `
                <td>${username}</td>
                <td>${ratingStars}</td>
                <td>${review.comment}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-warning edit-review-btn"><i class="bi bi-pencil-square"></i></button>
                        <button class="btn btn-sm btn-outline-danger delete-review-btn"><i class="bi bi-trash3"></i></button>
                    </div>
                </td>
            `;
            reviewTableBody.appendChild(row);
        });
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

    // --- FUNGSI-FUNGSI MODAL ---
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

    const openEditReviewModal = (review) => {
        document.getElementById('edit-review-id').value = review._id;
        document.getElementById('edit-rating').value = review.rating;
        document.getElementById('edit-comment').value = review.comment;
        editReviewModal.show();
    };

    // --- EVENT LISTENER UTAMA (MENGGUNAKAN EVENT DELEGATION) ---
    document.body.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        // Aksi untuk tabel pengguna
        const userRow = button.closest('tr[data-user-id]');
        if (userRow) {
            const userId = userRow.dataset.userId;
            const user = cachedUsers.find(u => u._id === userId);

            if (button.classList.contains('confirm-payment-btn')) handleConfirmPayment(userId);
            if (button.classList.contains('delete-user-btn')) deleteUser(userId);
            if (user) {
                if (button.classList.contains('edit-user-btn')) openEditModal(user);
                if (button.classList.contains('view-barcode-btn')) openBarcodeModal(user);
                if (button.classList.contains('set-package-btn')) openSetPackageModal(user);
                if (button.classList.contains('reset-password-btn')) openResetPasswordModal(user);
            }
        }

        // Aksi untuk tabel ulasan
        const reviewRow = button.closest('tr[data-review-id]');
        if (reviewRow) {
            const reviewId = reviewRow.dataset.reviewId;
            // if (button.classList.contains('edit-review-btn')) openEditReviewModal(review);
            if (button.classList.contains('delete-review-btn')) deleteReview(reviewId);
        }
    });

    // --- FORM SUBMISSIONS ---
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
                method: 'POST', headers: getHeaders(), body: JSON.stringify(userData)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg || 'Gagal menambah user.');
            showAlert('Pengguna baru berhasil ditambahkan.', 'success');
            addUserModal.hide();
            fetchUsers();
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
            const response = await fetch(`${API_URL}/api/users/${userId}`, {
                method: 'PUT', headers: getHeaders(), body: JSON.stringify(userData)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg || 'Gagal mengupdate user.');
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
            const response = await fetch(`${API_URL}/api/users/${userId}/reset-password`, {
                method: 'POST', headers: getHeaders(), body: JSON.stringify({ newPassword })
            });
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
            const response = await fetch(`${API_URL}/api/purchase-membership-admin/${userId}`, {
                method: 'POST', headers: getHeaders(), body: JSON.stringify(packageData)
            });
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
            const response = await fetch(`${API_URL}/api/reviews/${reviewId}`, {
                method: 'PUT', headers: getHeaders(), body: JSON.stringify(reviewData)
            });
            if (!response.ok) throw new Error('Gagal mengupdate ulasan.');
            showAlert('Ulasan berhasil diperbarui.', 'success');
            editReviewModal.hide();
            fetchReviews();
        } catch (error) { showAlert(error.message); }
    });

    // --- Tombol Download ---
    downloadButton.addEventListener('click', async () => {
        downloadButton.disabled = true;
        downloadButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Mengunduh...';
        try {
            const response = await fetch(`${API_URL}/api/download-data`, {
                method: 'GET', headers: getHeaders(false)
            });
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

    // --- LOGOUT ---
    document.getElementById('logout-button').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        window.location.href = '/login.html';
    });
    
    // --- Inisialisasi Data ---
    fetchUsers();
    fetchReviews();
});
