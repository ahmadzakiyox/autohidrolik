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
    const reviewTableBody = document.getElementById('review-table-body');
    const memberCountElement = document.getElementById('member-count');
    const visitorCountElement = document.getElementById('visitor-count');
    const transactionTotalElement = document.getElementById('transaction-total');
    const downloadButton = document.getElementById('download-data-btn');
    const memberTableBody = document.getElementById('member-table-body');
    const nonMemberTableBody = document.getElementById('non-member-table-body');
    const expiredMemberTableBody = document.getElementById('expired-member-table-body');
    const pendingPaymentTableBody = document.getElementById('pending-payment-table-body'); // Tambahkan ini

    // Inisialisasi semua modal
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

    const fetchRevenueTrend = async () => {
        try {
            const response = await fetch('/api/revenue-trend', { headers: getHeaders(false) });
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
            showAlert(error.message);
        }
    };
    
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
            
            // ================== LOGIKA PEMFILTERAN BARU ==================
            const today = new Date();
            const pendingUsers = [];
            const activeUsers = [];
            const expiredUsers = [];
            const nonMemberUsers = [];

            cachedUsers.forEach(user => {
                if (!user.memberships || user.memberships.length === 0) {
                    nonMemberUsers.push(user);
                    return;
                }

                const hasPendingPackage = user.memberships.some(pkg => !pkg.isPaid);
                const hasActivePackage = user.memberships.some(pkg => pkg.isPaid && new Date(pkg.expiresAt) >= today);

                if (hasPendingPackage) {
                    pendingUsers.push(user);
                }

                if (hasActivePackage) {
                    activeUsers.push(user);
                } 
                else if (!hasActivePackage && !hasPendingPackage) {
                    expiredUsers.push(user);
                }
            });

            displayPendingPayments(pendingUsers);
            displayActiveMembers(activeUsers);
            displayExpiredMembers(expiredUsers);
            displayNonMembers(nonMemberUsers);
            // ================== AKHIR LOGIKA PEMFILTERAN ==================

        } catch (error) {
            const errorMsg = `<tr><td colspan="8" class="text-center text-danger">${error.message}</td></tr>`;
            memberTableBody.innerHTML = errorMsg;
            expiredMemberTableBody.innerHTML = errorMsg;
            nonMemberTableBody.innerHTML = errorMsg;
        }
    };

    const fetchReviews = async () => {
        try {
            const response = await fetch('/api/reviews/all', { headers: getHeaders(false) });
            if (!response.ok) throw new Error('Gagal mengambil data ulasan.');
            cachedReviews = await response.json();
            displayReviews(cachedReviews);
        } catch (error) {
            reviewTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">${error.message}</td></tr>`;
        }
    };

    // --- FUNGSI TAMPILAN (DISPLAY) ---
    const displayPendingPayments = (users) => {
        pendingPaymentTableBody.innerHTML = '';
        if (users.length === 0) {
            pendingPaymentTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Tidak ada pembayaran yang menunggu konfirmasi.</td></tr>';
            return;
        }
        users.forEach(user => {
            user.memberships.filter(pkg => !pkg.isPaid).forEach(pkg => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.username}</td>
                    <td>${user.phone || '-'}</td>
                    <td>${pkg.packageName}</td>
                    <td>${new Date(pkg.purchaseDate).toLocaleDateString('id-ID')}</td>
                    <td>
                        <button class="btn btn-sm btn-success confirm-payment-btn" data-user-id="${user._id}" data-package-id="${pkg._id}">
                            <i class="bi bi-check-circle"></i> Konfirmasi
                        </button>
                    </td>
                `;
                pendingPaymentTableBody.appendChild(row);
            });
        });
    };

    const displayActiveMembers = (users) => {
        memberTableBody.innerHTML = '';
        if (users.length === 0) {
            memberTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Tidak ada member aktif.</td></tr>';
            return;
        }
        users.forEach((user, index) => {
            const activePackages = user.memberships.filter(pkg => pkg.isPaid && new Date(pkg.expiresAt) >= new Date());
            const packagesHtml = activePackages.map(pkg => {
                const remaining = pkg.packageName.toLowerCase().includes('nano') ? 'Aktif' : `${pkg.remainingWashes}x`;
                return `<div><span class="fw-bold">${pkg.packageName}:</span> ${remaining}</div>`;
            }).join('<hr class="my-1">');
            const expiryDate = new Date(activePackages.sort((a,b) => new Date(b.expiresAt) - new Date(a.expiresAt))[0].expiresAt).toLocaleDateString('id-ID');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${user.username}</td>
                <td>${packagesHtml}</td>
                <td>${expiryDate}</td>
                <td>
                    <button class="btn btn-sm btn-outline-info view-barcode-btn" data-user-id="${user._id}" title="Lihat QR Codes"><i class="bi bi-qr-code"></i></button>
                </td>
            `;
            memberTableBody.appendChild(row);
        });
    };
    
    const displayExpiredMembers = (users) => {
        expiredMemberTableBody.innerHTML = '';
        if (users.length === 0) {
            expiredMemberTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Tidak ada member yang kedaluwarsa.</td></tr>';
            return;
        }
        users.forEach((user, index) => {
            const lastPackage = user.memberships.sort((a, b) => new Date(b.expiresAt) - new Date(a.expiresAt))[0];
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${user.username}</td>
                <td>${user.email || '-'}</td>
                <td>${lastPackage.packageName}</td>
                <td class="text-danger fw-bold">${new Date(lastPackage.expiresAt).toLocaleDateString('id-ID')}</td>
                <td><button class="btn btn-sm btn-success set-package-btn" data-user-id="${user._id}">Perbarui Paket</button></td>
            `;
            expiredMemberTableBody.appendChild(row);
        });
    };

    const displayNonMembers = (users) => {
        nonMemberTableBody.innerHTML = '';
        if (users.length === 0) {
            nonMemberTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Tidak ada pengguna non-member.</td></tr>';
            return;
        }
        users.forEach((user, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${user.username}</td>
                <td>${user.email || '-'}</td>
                <td>${user.phone || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-success set-package-btn" data-user-id="${user._id}">Jadikan Member</button>
                </td>
            `;
            nonMemberTableBody.appendChild(row);
        });
    };

    const displayReviews = (reviews) => {
        reviewTableBody.innerHTML = '';
        reviews.forEach(review => {
            const row = document.createElement('tr');
            const ratingStars = '<span class="rating-stars">' + '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating) + '</span>';
            const username = review.user ? review.user.username : '<em class="text-muted">Pengguna Dihapus</em>';
            row.innerHTML = `<td>${username}</td><td>${ratingStars}</td><td>${review.comment}</td><td><div class="btn-group"><button class="btn btn-sm btn-outline-warning edit-review-btn" data-review-id="${review._id}"><i class="bi bi-pencil-square"></i></button><button class="btn btn-sm btn-outline-danger delete-review-btn" data-review-id="${review._id}"><i class="bi bi-trash3"></i></button></div></td>`;
            reviewTableBody.appendChild(row);
        });
    };

    // --- FUNGSI AKSI & EVENT LISTENER ---
    document.body.addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        if (button.classList.contains('confirm-payment-btn')) {
            const userId = button.dataset.userId;
            const packageId = button.dataset.packageId;
            if (confirm('Anda yakin ingin mengonfirmasi pembayaran untuk paket ini?')) {
                try {
                    const response = await fetch(`/api/confirm-payment/${userId}/${packageId}`, { 
                        method: 'POST', 
                        headers: getHeaders() 
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.msg);
                    showAlert('Pembayaran berhasil dikonfirmasi.');
                    fetchUsers(); // Cukup panggil fetchUsers, karena fetch lain akan dipanggil di dalamnya jika perlu
                    fetchDashboardStats();
                } catch (error) {
                    showAlert(error.message, 'danger');
                }
            }
        }
    });

    document.getElementById('logout-button').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        window.location.href = '/login.html';
    });
    
    // --- INISIALISASI ---
    fetchDashboardStats();
    fetchUsers();
    fetchReviews();
    fetchRevenueTrend();
});
