document.addEventListener('DOMContentLoaded', () => {
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
    const downloadButton = document.getElementById('download-data-btn');
    
    const pendingPaymentTableBody = document.getElementById('pending-payment-table-body');
    const memberTableBody = document.getElementById('member-table-body');
    const expiredMemberTableBody = document.getElementById('expired-member-table-body');
    const nonMemberTableBody = document.getElementById('non-member-table-body');
    const reviewTableBody = document.getElementById('review-table-body');

    // Inisialisasi modals
    const addUserModal = new bootstrap.Modal(document.getElementById('addUserModal'));
    const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
    const editTransactionModal = new bootstrap.Modal(document.getElementById('editTransactionModal'));
    const viewBarcodeModal = new bootstrap.Modal(document.getElementById('viewBarcodeModal'));
    const setPackageModal = new bootstrap.Modal(document.getElementById('setPackageModal'));
    const editReviewModal = new bootstrap.Modal(document.getElementById('editReviewModal'));
    const resetPasswordModal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
    const extendMembershipModal = new bootstrap.Modal(document.getElementById('extendMembershipModal'));

    let cachedUsers = [];
    let cachedReviews = [];

    // --- FUNGSI HELPER ---
    function showAlert(message, type = 'success') {
        alertPlaceholder.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
    }

    // --- FUNGSI PENGAMBILAN DATA ---
    const fetchAllData = async () => {
        try {
            const usersResponse = await fetch('/api/users', { headers: { 'x-auth-token': token } });
            if (!usersResponse.ok) throw new Error('Gagal mengambil data pengguna.');
            cachedUsers = await usersResponse.json();

            const today = new Date();
            const pendingUsers = [];
            const activeUsers = [];
            const expiredUsers = [];
            const nonMemberUsers = [];

            cachedUsers.forEach(user => {
                if (!user.memberships || user.memberships.length === 0) {
                    nonMemberUsers.push(user);
                } else {
                    const hasPending = user.memberships.some(pkg => !pkg.isPaid);
                    const hasActive = user.memberships.some(pkg => pkg.isPaid && new Date(pkg.expiresAt) >= today);
                    
                    if (hasPending) {
                        pendingUsers.push(user);
                    }
                    
                    if (hasActive) {
                        activeUsers.push(user);
                    } 
                    
                    if (!hasActive && !hasPending) {
                        expiredUsers.push(user);
                    }
                }
            });

            displayPendingPayments(pendingUsers);
            displayActiveMembers(activeUsers);
            displayExpiredMembers(expiredUsers);
            displayNonMembers(nonMemberUsers);

            fetchDashboardStats();
            fetchRevenueTrend();
            fetchReviews();
        } catch (error) {
            showAlert(error.message, 'danger');
        }
    };

    const fetchDashboardStats = async () => {
        try {
            const response = await fetch('/api/dashboard-stats', { headers: { 'x-auth-token': token } });
            if (!response.ok) return;
            const stats = await response.json();
            memberCountElement.textContent = stats.activeMembers;
            visitorCountElement.textContent = stats.totalVisitors;
            transactionTotalElement.textContent = `Rp ${stats.totalTransactions.toLocaleString('id-ID')}`;
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchRevenueTrend = async () => {
        try {
            const response = await fetch('/api/revenue-trend', { headers: { 'x-auth-token': token } });
            if (!response.ok) return;
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
                    }]
                },
                options: { scales: { y: { beginAtZero: true } } }
            });
        } catch (error) {
            console.error('Error fetching revenue trend:', error);
        }
    };

    const fetchReviews = async () => {
        try {
            const response = await fetch('/api/reviews/all', { headers: { 'x-auth-token': token } });
            if (response.ok) {
                cachedReviews = await response.json();
                displayReviews(cachedReviews);
            }
        } catch (error) {
             console.error('Error fetching reviews:', error);
        }
    };

    // --- FUNGSI TAMPILAN ---
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
            }).join('');
            const expiryDate = new Date(activePackages[0].expiresAt).toLocaleDateString('id-ID');
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
            const ratingStars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            row.innerHTML = `
                <td>${review.username || 'Anonim'}</td>
                <td class="rating-stars">${ratingStars}</td>
                <td>${review.comment}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger delete-review-btn" data-review-id="${review._id}"><i class="bi bi-trash3"></i></button>
                </td>
            `;
            reviewTableBody.appendChild(row);
        });
    };

    // --- EVENT LISTENER ---
    document.body.addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        if (button.classList.contains('confirm-payment-btn')) {
            const userId = button.dataset.userId;
            const packageId = button.dataset.packageId;
            if (!confirm('Anda yakin ingin mengonfirmasi pembayaran untuk paket ini?')) return;
            try {
                const response = await fetch(`/api/confirm-payment/${userId}/${packageId}`, { 
                    method: 'POST', 
                    headers: { 'x-auth-token': token } 
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.msg);
                showAlert('Pembayaran berhasil dikonfirmasi.');
                fetchAllData();
            } catch (error) {
                showAlert(error.message, 'danger');
            }
        }
    });

    document.getElementById('logout-button').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        window.location.href = '/login.html';
    });
    
    // Inisialisasi
    fetchAllData();
});
