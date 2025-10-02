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
    
    // Elemen Tabel Baru
    const pendingPaymentTableBody = document.getElementById('pending-payment-table-body');
    const memberTableBody = document.getElementById('member-table-body');
    const expiredMemberTableBody = document.getElementById('expired-member-table-body');
    const nonMemberTableBody = document.getElementById('non-member-table-body');
    const reviewTableBody = document.getElementById('review-table-body');

    // Inisialisasi semua modal
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

            displayPendingPayments(cachedUsers);
            displayActiveMembers(cachedUsers);
            displayExpiredMembers(cachedUsers);
            displayNonMembers(cachedUsers);

            const reviewsResponse = await fetch('/api/reviews/all', { headers: { 'x-auth-token': token } });
            if(reviewsResponse.ok) {
                cachedReviews = await reviewsResponse.json();
                displayReviews(cachedReviews);
            }

            fetchDashboardStats();
            fetchRevenueTrend();
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

    // --- FUNGSI TAMPILAN ---
    const displayPendingPayments = (users) => {
        pendingPaymentTableBody.innerHTML = '';
        let hasPending = false;
        users.forEach(user => {
            const pendingPackages = user.memberships.filter(pkg => !pkg.isPaid);
            if (pendingPackages.length > 0) {
                hasPending = true;
                pendingPackages.forEach(pkg => {
                    const row = document.createElement('tr');
                    const purchaseDate = new Date(pkg.purchaseDate).toLocaleDateString('id-ID');
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
            }
        });
        if (!hasPending) {
            pendingPaymentTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Tidak ada pembayaran yang menunggu konfirmasi.</td></tr>';
        }
    };

    const displayActiveMembers = (users) => {
        memberTableBody.innerHTML = '';
        let counter = 1;
        const activeMemberList = users.filter(user => user.memberships && user.memberships.some(pkg => pkg.isPaid));

        activeMemberList.forEach(user => {
            const activePackages = user.memberships.filter(pkg => pkg.isPaid && new Date(pkg.expiresAt) >= new Date());
            if (activePackages.length === 0) return;

            const row = document.createElement('tr');
            const packagesHtml = activePackages.map(pkg => {
                const remaining = pkg.packageName.toLowerCase().includes('nano') ? 'Aktif' : `${pkg.remainingWashes}x`;
                return `<div><span class="fw-bold">${pkg.packageName}:</span> ${remaining}</div>`;
            }).join('');
            
            const expiryDate = new Date(activePackages[0].expiresAt).toLocaleDateString('id-ID');
            row.innerHTML = `
                <td>${counter++}</td>
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
        let counter = 1;
        const expiredMemberList = users.filter(user => user.memberships && user.memberships.length > 0 && user.memberships.every(pkg => new Date(pkg.expiresAt) < new Date()));
        
        expiredMemberList.forEach(user => {
            const lastPackage = user.memberships.sort((a, b) => new Date(b.expiresAt) - new Date(a.expiresAt))[0];
            const row = document.createElement('tr');
            const expiryDate = new Date(lastPackage.expiresAt).toLocaleDateString('id-ID');
            row.innerHTML = `
                <td>${counter++}</td>
                <td>${user.username}</td>
                <td>${user.email || '-'}</td>
                <td>${lastPackage.packageName}</td>
                <td class="text-danger fw-bold">${expiryDate}</td>
                <td><button class="btn btn-sm btn-success set-package-btn" data-user-id="${user._id}">Perbarui Paket</button></td>
            `;
            expiredMemberTableBody.appendChild(row);
        });
    };

    const displayNonMembers = (users) => {
        nonMemberTableBody.innerHTML = '';
        let counter = 1;
        const nonMemberList = users.filter(user => !user.memberships || user.memberships.length === 0);

        nonMemberList.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${counter++}</td>
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
                <td>${review.username}</td>
                <td class="rating-stars">${ratingStars}</td>
                <td>${review.comment}</td>
                <td></td>
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
