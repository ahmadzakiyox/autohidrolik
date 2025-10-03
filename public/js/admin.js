document.addEventListener('DOMContentLoaded', () => {
    // Penjaga untuk memastikan skrip hanya berjalan di halaman admin
    const adminPageMarker = document.getElementById('member-table-body');
    if (!adminPageMarker) {
        return;
    }

    // --- KONFIGURASI & OTENTIKASI ---
    const token = localStorage.getItem('token');
    if (!token || localStorage.getItem('userRole') !== 'admin') {
        alert('Akses ditolak. Silakan login sebagai admin.');
        window.location.href = '/login.html';
        return;
    }

    // --- ELEMEN UI ---
    const alertPlaceholder = document.getElementById('alert-placeholder');
    const memberCountElement = document.getElementById('member-count');
    const visitorCountElement = document.getElementById('visitor-count');
    const transactionTotalElement = document.getElementById('transaction-total');
    const downloadButton = document.getElementById('download-data-btn');
    
    // Elemen Tabel
    const pendingPaymentTableBody = document.getElementById('pending-payment-table-body');
    const memberTableBody = document.getElementById('member-table-body');
    const expiredMemberTableBody = document.getElementById('expired-member-table-body');
    const nonMemberTableBody = document.getElementById('non-member-table-body');
    const reviewTableBody = document.getElementById('review-table-body');

    // --- INISIALISASI MODAL ---
    const addUserModal = new bootstrap.Modal(document.getElementById('addUserModal'));
    const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
    const editComboWashesModal = new bootstrap.Modal(document.getElementById('editComboWashesModal'));
    const editTransactionModal = new bootstrap.Modal(document.getElementById('editTransactionModal'));
    const editExpiryModal = new bootstrap.Modal(document.getElementById('editExpiryModal'));
    const viewBarcodeModal = new bootstrap.Modal(document.getElementById('viewBarcodeModal'));
    const setPackageModal = new bootstrap.Modal(document.getElementById('setPackageModal'));
    const editReviewModal = new bootstrap.Modal(document.getElementById('editReviewModal'));
    const resetPasswordModal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
    const extendMembershipModal = new bootstrap.Modal(document.getElementById('extendMembershipModal'));

    let cachedUsers = [];
    let cachedReviews = [];

    // --- FUNGSI HELPER ---
    const showAlert = (message, type = 'success') => {
        alertPlaceholder.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
    };

    const getHeaders = () => ({ 'Content-Type': 'application/json', 'x-auth-token': token });

    // --- FUNGSI FETCH DATA ---

    const fetchDashboardStats = async () => {
        try {
            const response = await fetch('/api/dashboard-stats', { headers: getHeaders() });
            if (!response.ok) throw new Error('Gagal mengambil data statistik.');
            const stats = await response.json();
            memberCountElement.textContent = stats.activeMembers;
            visitorCountElement.textContent = stats.totalVisitors;
            transactionTotalElement.textContent = `Rp ${stats.totalTransactions.toLocaleString('id-ID')}`;
        } catch (error) {
            showAlert(error.message, 'danger');
        }
    };
    
    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users', { headers: getHeaders() });
            if (!response.ok) throw new Error('Gagal mengambil data pengguna.');
            cachedUsers = await response.json();
            processAndDisplayUsers();
        } catch (error) {
            showAlert(error.message, 'danger');
        }
    };
    
    const fetchReviews = async () => {
        try {
            const response = await fetch('/api/reviews/all', { headers: getHeaders() });
            if (!response.ok) throw new Error('Gagal mengambil data ulasan.');
            cachedReviews = await response.json();
            displayReviews(cachedReviews);
        } catch (error) {
            reviewTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">${error.message}</td></tr>`;
        }
    };

    const fetchRevenueTrend = async () => {
        try {
            const response = await fetch('/api/revenue-trend', { headers: getHeaders() });
            if (!response.ok) throw new Error('Gagal mengambil data grafik.');
            const trendData = await response.json();
            const ctx = document.getElementById('revenueChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: trendData.labels,
                    datasets: [{
                        label: 'Pendapatan (Rp)',
                        data: trendData.data,
                        backgroundColor: 'rgba(111, 66, 193, 0.6)',
                        borderColor: 'rgba(111, 66, 193, 1)',
                        borderWidth: 1
                    }]
                },
                options: { scales: { y: { beginAtZero: true } } }
            });
        } catch (error) {
            showAlert(error.message, 'danger');
        }
    };
    
    // --- FUNGSI PROSES & TAMPILAN DATA ---

    const processAndDisplayUsers = () => {
        const pendingPayments = [];
        const activeMemberships = [];
        const expiredMemberships = [];
        const nonMembers = [];

        cachedUsers.forEach(user => {
            if (user.memberships && user.memberships.length > 0) {
                user.memberships.forEach(pkg => {
                    const data = { user, pkg };
                    const isExpired = new Date(pkg.expiresAt) < new Date();

                    if (!pkg.isPaid) {
                        pendingPayments.push(data);
                    } else if (isExpired) {
                        expiredMemberships.push(data);
                    } else {
                        activeMemberships.push(data);
                    }
                });
            } else {
                nonMembers.push(user);
            }
        });

        displayPendingPayments(pendingPayments);
        displayActiveMembers(activeMemberships);
        displayExpiredMembers(expiredMemberships);
        displayNonMembers(nonMembers);
    };

    const displayPendingPayments = (items) => {
        pendingPaymentTableBody.innerHTML = '';
        if (items.length === 0) {
            pendingPaymentTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Tidak ada pembayaran yang menunggu konfirmasi.</td></tr>`;
            return;
        }
        items.sort((a, b) => new Date(a.pkg.purchaseDate) - new Date(b.pkg.purchaseDate)); // Urutkan dari terlama
        items.forEach(({ user, pkg }) => {
            const row = document.createElement('tr');
            const purchaseDate = new Date(pkg.purchaseDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.phone || '-'}</td>
                <td>${pkg.packageName}</td>
                <td>${purchaseDate}</td>
                <td>
                    <button class="btn btn-sm btn-success confirm-payment-btn" data-user-id="${user._id}" data-package-id="${pkg._id}">
                        <i class="bi bi-check-circle"></i> Konfirmasi
                    </button>
                </td>
            `;
            pendingPaymentTableBody.appendChild(row);
        });
    };

    const displayActiveMembers = (items) => {
        memberTableBody.innerHTML = '';
        if (items.length === 0) {
            memberTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Belum ada member aktif.</td></tr>`;
            return;
        }

        const usersWithPackages = items.reduce((acc, { user, pkg }) => {
            if (!acc[user._id]) {
                acc[user._id] = { ...user, packages: [] };
            }
            acc[user._id].packages.push(pkg);
            return acc;
        }, {});

        let counter = 1;
        for (const userId in usersWithPackages) {
            const user = usersWithPackages[userId];
            const row = document.createElement('tr');

            const actionButtons = `
                <div class="btn-group">
                    <button class="btn btn-sm btn-primary view-packages-btn" data-user-id="${user._id}" title="Lihat Semua Paket & QR Code">
                        <i class="bi bi-card-list"></i> Lihat Paket
                    </button>
                    <button class="btn btn-sm btn-outline-secondary dropdown-toggle dropdown-toggle-split" type="button" data-bs-toggle="dropdown" aria-expanded="false"></button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item edit-user-btn" href="#" data-user-id="${user._id}"><i class="bi bi-pencil-square me-2"></i>Edit User</a></li>
                        <li><a class="dropdown-item set-package-btn" href="#" data-user-id="${user._id}"><i class="bi bi-gem me-2"></i>Tambah Paket</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger delete-user-btn" href="#" data-user-id="${user._id}"><i class="bi bi-trash3 me-2"></i>Hapus User</a></li>
                    </ul>
                </div>
            `;

            row.innerHTML = `
                <td>${counter++}</td>
                <td>${user.username}</td>
                <td>${user.email || '-'}</td>
                <td>${user.phone || '-'}</td>
                <td><span class="badge bg-info">${user.packages.length} Paket Aktif</span></td>
                <td>${actionButtons}</td>
            `;
            memberTableBody.appendChild(row);
        }
    };

    const displayExpiredMembers = (items) => {
        expiredMemberTableBody.innerHTML = '';
        if (items.length === 0) {
            expiredMemberTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Tidak ada member yang kedaluwarsa.</td></tr>`;
            return;
        }
        let counter = 1;
        items.forEach(({ user, pkg }) => {
            const row = document.createElement('tr');
            const expiryDate = new Date(pkg.expiresAt).toLocaleDateString('id-ID');
            row.innerHTML = `
                <td>${counter++}</td>
                <td>${user.username}</td>
                <td>${user.email || '-'}</td>
                <td>${pkg.packageName}</td>
                <td><span class="text-danger fw-bold">${expiryDate}</span></td>
                <td>
                    <button class="btn btn-sm btn-success set-package-btn" data-user-id="${user._id}">
                        <i class="bi bi-arrow-clockwise"></i> Perbarui Paket
                    </button>
                </td>
            `;
            expiredMemberTableBody.appendChild(row);
        });
    };
    
    const displayNonMembers = (users) => {
        nonMemberTableBody.innerHTML = '';
        if (users.length === 0) {
            nonMemberTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Tidak ada pengguna non-member.</td></tr>`;
            return;
        }
        let counter = 1;
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${counter++}</td>
                <td>${user.username}</td>
                <td>${user.email || '-'}</td>
                <td>${user.phone || '-'}</td>
                <td>
                     <button class="btn btn-sm btn-outline-success set-package-btn" data-user-id="${user._id}" title="Jadikan Member"><i class="bi bi-gem"></i></button>
                     <button class="btn btn-sm btn-outline-warning edit-user-btn" data-user-id="${user._id}" title="Edit"><i class="bi bi-pencil-square"></i></button>
                     <button class="btn btn-sm btn-outline-danger delete-user-btn" data-user-id="${user._id}" title="Hapus"><i class="bi bi-trash3"></i></button>
                </td>
            `;
            nonMemberTableBody.appendChild(row);
        });
    };

    const displayReviews = (reviews) => {
        reviewTableBody.innerHTML = '';
        reviews.forEach(review => {
            const row = document.createElement('tr');
            row.dataset.reviewId = review._id;
            const ratingStars = '<span class="rating-stars">' + '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating) + '</span>';
            const username = review.user ? review.user.username : '<em class="text-muted">Pengguna Dihapus</em>';
            row.innerHTML = `<td>${username}</td><td>${ratingStars}</td><td>${review.comment}</td><td><div class="btn-group"><button class="btn btn-sm btn-outline-warning edit-review-btn"><i class="bi bi-pencil-square"></i></button><button class="btn btn-sm btn-outline-danger delete-review-btn"><i class="bi bi-trash3"></i></button></div></td>`;
            reviewTableBody.appendChild(row);
        });
    };

    // --- FUNGSI-FUNGSI AKSI ---
    const handleConfirmPayment = async (userId, packageId) => {
        if (!confirm('Anda yakin ingin mengonfirmasi pembayaran untuk paket ini?')) return;
        try {
            const response = await fetch(`/api/confirm-payment/${userId}/${packageId}`, { method: 'POST', headers: getHeaders() });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg);
            showAlert(result.msg);
            fetchUsers();
            fetchDashboardStats();
        } catch (error) {
            showAlert(error.message, 'danger');
        }
    };

    const deleteUser = async (userId) => {
        if (!confirm('Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan.')) return;
        try {
            const response = await fetch(`/api/users/${userId}`, { method: 'DELETE', headers: getHeaders() });
            if (!response.ok) throw new Error('Gagal menghapus pengguna.');
            showAlert('Pengguna berhasil dihapus.');
            fetchUsers();
            fetchDashboardStats();
        } catch (error) { showAlert(error.message, 'danger'); }
    };
    
    const deleteReview = async (reviewId) => {
        if (!confirm('Anda yakin ingin menghapus ulasan ini?')) return;
        try {
            const response = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE', headers: getHeaders() });
            if (!response.ok) throw new Error('Gagal menghapus ulasan.');
            showAlert('Ulasan berhasil dihapus.');
            fetchReviews();
        } catch (error) { showAlert(error.message, 'danger'); }
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

    const openBarcodeModal = (memberId, packageId, username) => {
        document.getElementById('barcode-username').textContent = username;
        const qrCodeContainer = document.getElementById('barcode-container');
        qrCodeContainer.innerHTML = '';
        const qrData = `${memberId};${packageId}`;
        document.getElementById('barcode-data').textContent = qrData;
        new QRCode(qrCodeContainer, { text: qrData, width: 200, height: 200 });
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
    
    // ... (Fungsi modal lain yang sudah ada dipertahankan)

    // --- EVENT LISTENER UTAMA (EVENT DELEGATION) ---
    document.body.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        // Aksi Konfirmasi Pembayaran
        if (button.classList.contains('confirm-payment-btn')) {
            const userId = button.dataset.userId;
            const packageId = button.dataset.packageId;
            handleConfirmPayment(userId, packageId);
            return;
        }
        
        // Aksi Melihat Barcode
        if (button.classList.contains('view-barcode-btn')) {
            const { memberId, packageId, username } = button.dataset;
            openBarcodeModal(memberId, packageId, username);
            return;
        }

        // Aksi pada User (Edit, Hapus, Jadikan Member)
        const userId = button.dataset.userId;
        if (userId) {
            const user = cachedUsers.find(u => u._id === userId);
            if (!user) return;

            if (button.classList.contains('edit-user-btn')) openEditModal(user);
            if (button.classList.contains('delete-user-btn')) deleteUser(userId);
            if (button.classList.contains('set-package-btn')) openSetPackageModal(user);
            // Tambahkan event listener lain untuk user di sini jika ada
        }
        
        // Aksi pada Review
        const reviewRow = button.closest('tr[data-review-id]');
        if(reviewRow) {
            const reviewId = reviewRow.dataset.reviewId;
            const review = cachedReviews.find(r => r._id === reviewId);
            if (!review) return;

            if (button.classList.contains('edit-review-btn')) openEditReviewModal(review);
            if (button.classList.contains('delete-review-btn')) deleteReview(reviewId);
        }
    });

    // --- EVENT LISTENER UNTUK SUBMIT FORM ---
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
            if (!response.ok) throw new Error(result.msg);
            showAlert('Pengguna baru berhasil ditambahkan.');
            addUserModal.hide();
            fetchUsers();
            fetchDashboardStats();
        } catch (error) { showAlert(error.message, 'danger'); }
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
            showAlert('Data pengguna berhasil diperbarui.');
            editUserModal.hide();
            fetchUsers();
        } catch (error) { showAlert(error.message, 'danger'); }
    });
    
    document.getElementById('set-package-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('set-package-userid').value;
        const select = document.getElementById('package-name');
        const selectedOption = select.options[select.selectedIndex];
        const packageData = {
            packageName: selectedOption.value,
            totalWashes: parseInt(selectedOption.dataset.washes) || 0
        };
        try {
            const response = await fetch(`/api/purchase-membership-admin/${userId}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(packageData) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg);
            showAlert(result.msg);
            setPackageModal.hide();
            fetchUsers();
        } catch (error) { showAlert(error.message, 'danger'); }
    });
    
    document.getElementById('edit-transaction-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('transaction-amount').value;
        const note = document.getElementById('transaction-note').value;
        try {
            const response = await fetch('/api/transactions/correction', { method: 'POST', headers: getHeaders(), body: JSON.stringify({ amount, note }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg);
            showAlert('Transaksi koreksi berhasil disimpan.');
            editTransactionModal.hide();
            document.getElementById('edit-transaction-form').reset();
            fetchDashboardStats();
            fetchRevenueTrend();
        } catch (error) { showAlert(error.message, 'danger'); }
    });

    document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('reset-password-userid').value;
        const newPassword = document.getElementById('new-password-admin').value;
        try {
            const response = await fetch(`/api/users/${userId}/reset-password`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ newPassword }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg);
            showAlert(result.msg);
            resetPasswordModal.hide();
        } catch (error) { showAlert(error.message, 'danger'); }
    });

    document.getElementById('edit-expiry-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('edit-expiry-userid').value;
        const newExpiryDate = document.getElementById('edit-expiry-date').value;
        try {
            const response = await fetch(`/api/users/${userId}/update-expiry`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ newExpiryDate }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg);
            showAlert(result.msg);
            editExpiryModal.hide();
            fetchUsers();
        } catch (error) { showAlert(error.message, 'danger'); }
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
            showAlert('Ulasan berhasil diperbarui.');
            editReviewModal.hide();
            fetchReviews();
        } catch (error) { showAlert(error.message, 'danger'); }
    });

    document.getElementById('edit-combo-washes-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('edit-combo-userid').value;
        const comboData = {
            bodywash: document.getElementById('edit-bodywash-count').value,
            hidrolik: document.getElementById('edit-hidrolik-count').value,
        };
        try {
            const response = await fetch(`/api/users/${userId}/update-combo-washes`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(comboData) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg);
            showAlert(result.msg);
            editComboWashesModal.hide();
            fetchUsers();
        } catch (error) { showAlert(error.message, 'danger'); }
    });

    downloadButton.addEventListener('click', async () => {
        downloadButton.disabled = true;
        downloadButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Mengunduh...';
        try {
            const response = await fetch('/api/download-data', { headers: { 'x-auth-token': token } });
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
            showAlert(error.message, 'danger');
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
    fetchRevenueTrend();
});
