document.addEventListener('DOMContentLoaded', () => {
    // --- KONFIGURASI & INISIALISASI ---
    const token = localStorage.getItem('token');
    if (!token || localStorage.getItem('userRole') !== 'admin') {
        alert('Akses ditolak. Silakan login sebagai admin.');
        window.location.href = '/login.html';
        return;
    }

    // --- Elemen UI ---
    const alertPlaceholder = document.getElementById('alert-placeholder');
    const memberTableBody = document.getElementById('member-table-body');
    const nonMemberTableBody = document.getElementById('non-member-table-body');
    const reviewTableBody = document.getElementById('review-table-body');
    const memberCountElement = document.getElementById('member-count');
    const visitorCountElement = document.getElementById('visitor-count');
    const transactionTotalElement = document.getElementById('transaction-total');
    const downloadButton = document.getElementById('download-data-btn');
    const resetTransactionsButton = document.getElementById('reset-transactions-btn');

    // Inisialisasi semua modal (pop-up)
    const addUserModal = new bootstrap.Modal(document.getElementById('addUserModal'));
    const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
    const viewBarcodeModal = new bootstrap.Modal(document.getElementById('viewBarcodeModal'));
    const setPackageModal = new bootstrap.Modal(document.getElementById('setPackageModal'));
    const editReviewModal = new bootstrap.Modal(document.getElementById('editReviewModal'));
    const resetPasswordModal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
    
    let cachedUsers = [];
    let cachedReviews = [];

    // --- FUNGSI HELPER (PEMBANTU) ---
    const showAlert = (message, type = 'danger') => {
        if (alertPlaceholder) {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = `
                <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>`;
            alertPlaceholder.append(wrapper);
        } else {
            console.error('Elemen #alert-placeholder tidak ditemukan di HTML.');
        }
    };

    const getHeaders = (includeContentType = true) => {
        const headers = { 'x-auth-token': token };
        if (includeContentType) headers['Content-Type'] = 'application/json';
        return headers;
    };

    // Fungsi fetch data yang sudah menyertakan token
    const fetchData = async (url) => {
        const response = await fetch(url, { headers: getHeaders(false) });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                 localStorage.clear();
                 window.location.href = '/login.html';
            }
            const errorData = await response.json();
            throw new Error(errorData.msg || `Gagal memuat data dari ${url}`);
        }
        return await response.json();
    };

    // --- FUNGSI PENGAMBILAN & TAMPILAN DATA ---
    const loadAllData = async () => {
        try {
            // Jalankan semua permintaan data secara paralel untuk efisiensi
            const [stats, users, reviews, trendData] = await Promise.all([
                fetchData('/api/dashboard-stats'),
                fetchData('/api/users'),
                fetchData('/api/reviews/all'),
                fetchData('/api/revenue-trend')
            ]);

            // Tampilkan Statistik
            if (stats) {
                memberCountElement.textContent = stats.activeMembers;
                visitorCountElement.textContent = stats.totalVisitors;
                transactionTotalElement.textContent = `Rp ${stats.totalTransactions.toLocaleString('id-ID')}`;
            }

            // Tampilkan Pengguna
            if (users) {
                cachedUsers = users;
                const members = users.filter(user => user.membership);
                const nonMembers = users.filter(user => !user.membership);
                displayTableData(memberTableBody, members, renderMemberRow, 7, "Belum ada member.");
                displayTableData(nonMemberTableBody, nonMembers, renderNonMemberRow, 5, "Tidak ada pengguna non-member.");
            }

            // Tampilkan Ulasan
            if (reviews) {
                cachedReviews = reviews;
                displayTableData(reviewTableBody, reviews, renderReviewRow, 4, "Belum ada ulasan.");
            }

            // Tampilkan Grafik
            if (trendData && trendData.labels && trendData.data) {
                const ctx = document.getElementById('revenueChart').getContext('2d');
                new Chart(ctx, {
                    type: 'bar',
                    data: { labels: trendData.labels, datasets: [{ label: 'Pendapatan (Rp)', data: trendData.data, backgroundColor: 'rgba(111, 66, 193, 0.6)', borderColor: 'rgba(111, 66, 193, 1)', borderWidth: 1 }] },
                    options: { scales: { y: { beginAtZero: true } } }
                });
            }
        } catch (error) {
            showAlert(error.message);
        }
    };

    // --- FUNGSI UNTUK MERENDER BARIS TABEL ---
    const displayTableData = (tbody, data, renderRowFunc, colSpan, emptyMessage) => {
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center text-muted">${emptyMessage}</td></tr>`;
            return;
        }
        data.forEach((item, index) => tbody.appendChild(renderRowFunc(item, index + 1)));
    };

    const renderMemberRow = (user, index) => {
        const row = document.createElement('tr');
        row.dataset.userId = user._id;
        
        // --- PERBAIKAN LOGIKA TAMPILAN JATAH CUCI ---
        let membershipStatus = 'N/A';
        if (user.membership && user.membership.washes) {
            if (user.membership.packageName === 'Paket Kombinasi') {
                // Tampilan khusus untuk Paket Kombinasi
                membershipStatus = `Kombinasi (B:${user.membership.washes.bodywash}, H:${user.membership.washes.hidrolik})`;
            } else {
                // Tampilan untuk paket lain (menampilkan jatah yang ada)
                const remaining = user.membership.washes.bodywash > 0 
                    ? user.membership.washes.bodywash 
                    : user.membership.washes.hidrolik;
                membershipStatus = `${user.membership.packageName} (${remaining}x)`;
            }
        } else if (user.membership && typeof user.membership.remainingWashes !== 'undefined') {
            // Fallback untuk data lama jika skrip migrasi belum dijalankan
            membershipStatus = `${user.membership.packageName} (${user.membership.remainingWashes}x)`;
        }

        const paymentStatus = user.membership?.isPaid ? '<span class="badge bg-success">Lunas</span>' : '<span class="badge bg-warning text-dark">Belum Bayar</span>';
        let actionButtons = `<button class="btn btn-sm btn-outline-secondary reset-password-btn" title="Reset Sandi"><i class="bi bi-key-fill"></i></button><button class="btn btn-sm btn-outline-success set-package-btn" title="Atur Paket"><i class="bi bi-gem"></i></button><button class="btn btn-sm btn-outline-warning edit-user-btn" title="Edit"><i class="bi bi-pencil-square"></i></button><button class="btn btn-sm btn-outline-danger delete-user-btn" title="Hapus"><i class="bi bi-trash3"></i></button>`;
        
        if (user.membership?.isPaid) {
            actionButtons = `<button class="btn btn-sm btn-outline-info view-barcode-btn" title="QR Code"><i class="bi bi-qr-code"></i></button> ` + actionButtons;
        } else if (user.membership) {
            actionButtons = `<button class="btn btn-sm btn-info confirm-payment-btn" title="Konfirmasi Bayar"><i class="bi bi-check-circle"></i></button> ` + actionButtons;
        }
        
        row.innerHTML = `<td>${String(index).padStart(3, '0')}</td><td>${user.username}</td><td>${user.email || '-'}</td><td>${user.phone || '-'}</td><td>${membershipStatus}</td><td>${paymentStatus}</td><td><div class="btn-group">${actionButtons}</div></td>`;
        return row;
    };

    const renderNonMemberRow = (user, index) => {
        const row = document.createElement('tr');
        row.dataset.userId = user._id;
        const actionButtons = `<button class="btn btn-sm btn-outline-success set-package-btn" title="Jadikan Member"><i class="bi bi-gem"></i></button><button class="btn btn-sm btn-outline-warning edit-user-btn" title="Edit"><i class="bi bi-pencil-square"></i></button><button class="btn btn-sm btn-outline-danger delete-user-btn" title="Hapus"><i class="bi bi-trash3"></i></button>`;
        row.innerHTML = `<td>${index}</td><td>${user.username}</td><td>${user.email || '-'}</td><td>${user.phone || '-'}</td><td><div class="btn-group">${actionButtons}</div></td>`;
        return row;
    };

    const renderReviewRow = (review) => {
        const row = document.createElement('tr');
        row.dataset.reviewId = review._id;
        const ratingStars = '<span class="rating-stars">' + '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating) + '</span>';
        const username = review.user ? review.user.username : '<em class="text-muted">Pengguna Dihapus</em>';
        row.innerHTML = `<td>${username}</td><td>${ratingStars}</td><td>${review.comment}</td><td><div class="btn-group"><button class="btn btn-sm btn-outline-warning edit-review-btn"><i class="bi bi-pencil-square"></i></button><button class="btn btn-sm btn-outline-danger delete-review-btn"><i class="bi bi-trash3"></i></button></div></td>`;
        return row;
    };
    
    // --- EVENT LISTENER & HANDLER ---
    
    document.body.addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const userRow = button.closest('tr[data-user-id]');
        const reviewRow = button.closest('tr[data-review-id]');

        if (userRow) {
            const userId = userRow.dataset.userId;
            const user = cachedUsers.find(u => u._id === userId);

            if (button.classList.contains('delete-user-btn')) {
                if (confirm('Yakin ingin menghapus pengguna ini?')) {
                    try {
                        await fetch(`/api/users/${userId}`, { method: 'DELETE', headers: getHeaders(false) });
                        showAlert('Pengguna berhasil dihapus.', 'success');
                        loadAllData();
                    } catch (error) { showAlert(error.message); }
                }
            } else if (button.classList.contains('confirm-payment-btn')) {
                if (confirm('Anda yakin ingin mengonfirmasi pembayaran untuk pengguna ini?')) {
                    try {
                        const response = await fetch(`/api/confirm-payment/${userId}`, { method: 'POST', headers: getHeaders(false) });
                        if (!response.ok) { const err = await response.json(); throw new Error(err.msg); }
                        showAlert('Pembayaran berhasil dikonfirmasi.', 'success');
                        loadAllData();
                    } catch (error) { showAlert(error.message); }
                }
            } else if (user) {
                if (button.classList.contains('edit-user-btn')) {
                    document.getElementById('edit-user-id').value = user._id;
                    document.getElementById('edit-username').value = user.username;
                    document.getElementById('edit-email').value = user.email || '';
                    document.getElementById('edit-phone').value = user.phone;
                    document.getElementById('edit-role').value = user.role;
                    editUserModal.show();
                }
                if (button.classList.contains('view-barcode-btn')) {
                    document.getElementById('barcode-username').textContent = user.username;
                    const qrCodeContainer = document.getElementById('barcode-container');
                    qrCodeContainer.innerHTML = '';
                    new QRCode(qrCodeContainer, { text: user.memberId, width: 200, height: 200 });
                    viewBarcodeModal.show();
                }
                if (button.classList.contains('set-package-btn')) {
                    document.getElementById('package-username').textContent = user.username;
                    document.getElementById('set-package-userid').value = user._id;
                    document.getElementById('set-package-form').reset();
                    setPackageModal.show();
                }
                if (button.classList.contains('reset-password-btn')) {
                    document.getElementById('reset-password-username').textContent = user.username;
                    document.getElementById('reset-password-userid').value = user._id;
                    document.getElementById('reset-password-form').reset();
                    resetPasswordModal.show();
                }
            }
        }

        if (reviewRow) {
            const reviewId = reviewRow.dataset.reviewId;
            const review = cachedReviews.find(r => r._id === reviewId);
            if (button.classList.contains('delete-review-btn')) {
                if (confirm('Yakin ingin menghapus ulasan ini?')) {
                    try {
                        await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE', headers: getHeaders(false) });
                        showAlert('Ulasan berhasil dihapus.', 'success');
                        loadAllData();
                    } catch (error) { showAlert(error.message); }
                }
            } else if (button.classList.contains('edit-review-btn') && review) {
                document.getElementById('edit-review-id').value = review._id;
                document.getElementById('edit-rating').value = review.rating;
                document.getElementById('edit-comment').value = review.comment;
                editReviewModal.show();
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
            loadAllData();
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
            await fetch(`/api/users/${userId}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(userData) });
            showAlert('Data pengguna berhasil diperbarui.', 'success');
            editUserModal.hide();
            loadAllData();
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
        const packageName = select.value;
        try {
            const response = await fetch(`/api/purchase-membership-admin/${userId}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ packageName }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg || 'Gagal mengatur paket.');
            showAlert(result.msg, 'success');
            setPackageModal.hide();
            loadAllData();
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
            await fetch(`/api/reviews/${reviewId}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(reviewData) });
            showAlert('Ulasan berhasil diperbarui.', 'success');
            editReviewModal.hide();
            loadAllData();
        } catch (error) { showAlert(error.message); }
    });

    resetTransactionsButton.addEventListener('click', async () => {
        if (prompt('PERINGATAN: Ketik "RESET" untuk menghapus semua transaksi.') === 'RESET') {
            try {
                await fetch('/api/transactions/reset', { method: 'DELETE', headers: getHeaders(false) });
                showAlert('Semua transaksi berhasil direset.', 'success');
                loadAllData();
            } catch (error) { showAlert(error.message); }
        } else { showAlert('Reset dibatalkan.', 'info'); }
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
        } catch (error) { showAlert(error.message); } 
        finally {
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
    loadAllData();
});
