document.addEventListener('DOMContentLoaded', () => {
    // ======================= PERBAIKAN UTAMA DI SINI =======================
    // "Penjaga" untuk memastikan kode ini hanya berjalan di halaman admin.
    // Kita gunakan 'member-table-body' sebagai penanda unik halaman admin.
    const adminPageMarker = document.getElementById('member-table-body');
    if (!adminPageMarker) {
        return; // Jika bukan di halaman admin, hentikan eksekusi seluruh script ini.
    }
    // ===================== AKHIR DARI PERBAIKAN =====================

    // --- KONFIGURASI & INISIALISASI (Hanya berjalan jika di halaman admin) ---
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
    
    // Inisialisasi semua modal (pop-up)
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

    // --- FUNGSI HELPER (PEMBANTU) ---
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

    // --- FUNGSI PENGAMBILAN DATA (FETCH) ---
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

        // --- LOGIKA KLASIFIKASI BARU YANG BENAR ---
        const today = new Date();
        const activeMembers = [];
        const pendingUsers = []; // Pengguna dengan paket yang belum lunas
        const expiredMembers = [];
        const nonMembers = [];

        cachedUsers.forEach(user => {
            // 1. Jika tidak ada array 'memberships' atau array-nya kosong, dia adalah Non-Member.
            if (!user.memberships || user.memberships.length === 0) {
                nonMembers.push(user);
                return; // Lanjut ke user berikutnya
            }

            // 2. Cek status paket yang dimiliki
            const hasActivePackage = user.memberships.some(p => p.isPaid && new Date(p.expiresAt) >= today);
            const hasPendingPackage = user.memberships.some(p => !p.isPaid);

            // 3. Masukkan user ke kategori yang sesuai
            if (hasActivePackage) {
                activeMembers.push(user);
            }
            
            if (hasPendingPackage) {
                // User ini juga akan muncul di daftar pending
                pendingUsers.push(user);
            }
            
            // 4. Jika tidak punya paket aktif atau pending, berarti semua paketnya sudah kedaluwarsa.
            if (!hasActivePackage && !hasPendingPackage) {
                expiredMembers.push(user);
            }
        });
        
        // Panggil fungsi-fungsi untuk menampilkan data ke tabel
        displayMembers(activeMembers);
        displayPendingPayments(pendingUsers); // Ini fungsi baru untuk konfirmasi
        displayExpiredMembers(expiredMembers);
        displayNonMembers(nonMembers);

    } catch (error) {
        showAlert(error.message, 'danger');
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

const displayMembers = (members) => {
    memberTableBody.innerHTML = '';
    if (members.length === 0) {
        memberTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Belum ada member aktif.</td></tr>`;
        return;
    }
    let counter = 1;
    members.forEach(user => {
        const row = document.createElement('tr');
        row.dataset.userId = user._id;

        // Ambil SEMUA paket yang aktif
        const activePackages = user.memberships.filter(p => p.isPaid && new Date(p.expiresAt) >= new Date());
        
        // Gabungkan detail dari setiap paket aktif menjadi satu tampilan
        const membershipStatus = activePackages.map(p => {
            return `<div>${p.packageName} (Sisa: ${p.remainingWashes}x)</div>`;
        }).join('');

        // Cari tanggal kedaluwarsa terdekat dari semua paket aktif
        const closestExpiry = new Date(Math.min(...activePackages.map(p => new Date(p.expiresAt))));

        // Tombol aksi
        const actionButtons = `<button class="btn btn-sm btn-outline-info view-barcode-btn" title="QR Code"><i class="bi bi-qr-code"></i></button>
                             <button class="btn btn-sm btn-warning edit-user-btn" title="Edit User"><i class="bi bi-pencil-square"></i></button>
                             <button class="btn btn-sm btn-info set-package-btn" title="Tambah Paket Baru"><i class="bi bi-plus-circle"></i></button>`;

        row.innerHTML = `<td>${counter++}</td>
                         <td>${user.username}</td>
                         <td>${user.email || '-'}</td>
                         <td>${user.phone || '-'}</td>
                         <td>${membershipStatus}</td>
                         <td><span class="badge bg-success">Aktif</span></td>
                         <td>${closestExpiry.toLocaleDateString('id-ID')}</td>
                         <td><div class="btn-group">${actionButtons}</div></td>`;
        memberTableBody.appendChild(row);
    });
};

// TAMBAHKAN FUNGSI BARU INI
// TAMBAHKAN FUNGSI BARU INI
const displayPendingPayments = (users) => {
    // Pastikan Anda sudah menambahkan const ini di bagian atas file
    const pendingPaymentTableBody = document.getElementById('pending-payment-table-body');
    
    pendingPaymentTableBody.innerHTML = '';
    if (users.length === 0) {
        pendingPaymentTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Tidak ada pembayaran yang tertunda.</td></tr>`;
        return;
    }

    let html = '';
    users.forEach(user => {
        // Buat baris terpisah untuk SETIAP paket yang belum lunas
        user.memberships.filter(p => !p.isPaid).forEach(pkg => {
            html += `
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
                </tr>`;
        });
    });
    pendingPaymentTableBody.innerHTML = html;
};

    const displayExpiredMembers = (members) => {
        expiredMemberTableBody.innerHTML = '';
        if (members.length === 0) {
            expiredMemberTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Tidak ada member yang kedaluwarsa.</td></tr>`;
            return;
        }
        let counter = 1;
        members.forEach(user => {
            const row = document.createElement('tr');
            row.dataset.userId = user._id;
            const lastPackage = `${user.membership.packageName}`;
            const expiryDate = new Date(user.membership.expiresAt);
            const formattedDate = expiryDate.toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const actionButtons = `<button class="btn btn-sm btn-success set-package-btn" title="Perbarui Paket Member"><i class="bi bi-arrow-clockwise"></i> Perbarui Paket</button>`;
            row.innerHTML = `<td>${String(counter++)}</td><td>${user.username}</td><td>${user.email || '-'}</td><td>${lastPackage}</td><td><span class="text-danger fw-bold">${formattedDate}</span></td><td><div class="btn-group">${actionButtons}</div></td>`;
            expiredMemberTableBody.appendChild(row);
        });
    };

    const displayNonMembers = (nonMembers) => {
        nonMemberTableBody.innerHTML = '';
        if (nonMembers.length === 0) {
            nonMemberTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Tidak ada pengguna non-member.</td></tr>`;
            return;
        }
        let counter = 1;
        nonMembers.forEach(user => {
            const row = document.createElement('tr');
            row.dataset.userId = user._id;
            let actionButtons = `<button class="btn btn-sm btn-outline-success set-package-btn" title="Jadikan Member"><i class="bi bi-gem"></i></button><button class="btn btn-sm btn-outline-warning edit-user-btn" title="Edit"><i class="bi bi-pencil-square"></i></button><button class="btn btn-sm btn-outline-danger delete-user-btn" title="Hapus"><i class="bi bi-trash3"></i></button>`;
            row.innerHTML = `<td>${String(counter++)}</td><td>${user.username}</td><td>${user.email}</td><td>${user.phone || '-'}</td><td><div class="btn-group">${actionButtons}</div></td>`;
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
        fetchUsers(); // Muat ulang semua data tabel
        fetchDashboardStats();
    } catch (error) { 
        showAlert(error.message, 'danger'); 
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

    const openEditComboWashesModal = (user) => {
        document.getElementById('edit-combo-userid').value = user._id;
        document.getElementById('edit-combo-username').textContent = user.username;
        document.getElementById('edit-bodywash-count').value = user.membership.washes.bodywash;
        document.getElementById('edit-hidrolik-count').value = user.membership.washes.hidrolik;
        editComboWashesModal.show();
    };

    const openEditExpiryModal = (user) => {
        document.getElementById('edit-expiry-userid').value = user._id;
        document.getElementById('edit-expiry-username').textContent = user.username;
        if (user.membership.expiresAt) {
            const currentDate = new Date(user.membership.expiresAt);
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            document.getElementById('edit-expiry-date').value = `${year}-${month}-${day}`;
        }
        editExpiryModal.show();
    };

    const openExtendMembershipModal = (user) => {
        document.getElementById('extend-userid').value = user._id;
        document.getElementById('extend-username').textContent = user.username;
        const currentExpiry = new Date(user.membership.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        document.getElementById('extend-current-expiry').textContent = currentExpiry;
        extendMembershipModal.show();
    };
    
    // --- EVENT LISTENER UTAMA ---

    document.body.addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        if (button.classList.contains('extend-btn')) {
            const userId = document.getElementById('extend-userid').value;
            const months = button.dataset.months;
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            try {
                const response = await fetch(`/api/users/${userId}/extend-membership`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ months })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.msg);
                showAlert(result.msg, 'success');
                extendMembershipModal.hide();
                fetchUsers();
            } catch (error) {
                showAlert(error.message);
            } finally {
                document.querySelectorAll('.extend-btn').forEach((btn, index) => {
                    btn.disabled = false;
                    const durations = [1, 3, 6];
                    btn.innerHTML = `+ ${durations[index]} Bulan`;
                });
            }
            return;
        }

        const userRow = button.closest('tr[data-user-id]');
        if (userRow) {
            const userId = userRow.dataset.userId;
            const user = cachedUsers.find(u => u._id === userId);
            if (user) {
               if (button.classList.contains('confirm-payment-btn')) {
    const row = button.closest('tr');
    // Pastikan kita mendapatkan kedua ID dari baris tabel
    if (row && row.dataset.userId && row.dataset.packageId) {
        handleConfirmPayment(row.dataset.userId, row.dataset.packageId);
    }
    return;
}
                if (button.classList.contains('delete-user-btn')) return deleteUser(userId);
                if (button.classList.contains('edit-user-btn')) return openEditModal(user);
                if (button.classList.contains('view-barcode-btn')) return openBarcodeModal(user);
                if (button.classList.contains('set-package-btn')) return openSetPackageModal(user);
                if (button.classList.contains('reset-password-btn')) return openResetPasswordModal(user);
                if (button.classList.contains('edit-combo-btn')) return openEditComboWashesModal(user);
                if (button.classList.contains('edit-expiry-btn')) return openEditExpiryModal(user);
                if (button.classList.contains('extend-membership-btn')) return openExtendMembershipModal(user);
            }
        }

        const reviewRow = button.closest('tr[data-review-id]');
        if (reviewRow) {
            const reviewId = reviewRow.dataset.reviewId;
            const review = cachedReviews.find(r => r._id === reviewId);
            if (button.classList.contains('delete-review-btn')) return deleteReview(reviewId);
            if (review && button.classList.contains('edit-review-btn')) return openEditReviewModal(review);
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
            if (!response.ok) throw new Error(result.msg);
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

    document.getElementById('edit-transaction-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('transaction-amount').value;
        const note = document.getElementById('transaction-note').value;
        try {
            const response = await fetch('/api/transactions/correction', { method: 'POST', headers: getHeaders(), body: JSON.stringify({ amount, note }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg);
            showAlert('Transaksi koreksi berhasil disimpan.', 'success');
            editTransactionModal.hide();
            document.getElementById('edit-transaction-form').reset();
            fetchDashboardStats();
            fetchRevenueTrend();
        } catch (error) { showAlert(error.message); }
    });

    document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('reset-password-userid').value;
        const newPassword = document.getElementById('new-password-admin').value;
        try {
            const response = await fetch(`/api/users/${userId}/reset-password`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ newPassword }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg);
            showAlert(result.msg, 'success');
            resetPasswordModal.hide();
        } catch (error) { showAlert(error.message); }
    });

    document.getElementById('edit-expiry-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('edit-expiry-userid').value;
        const newExpiryDate = document.getElementById('edit-expiry-date').value;
        try {
            const response = await fetch(`/api/users/${userId}/update-expiry`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ newExpiryDate }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg);
            showAlert(result.msg, 'success');
            editExpiryModal.hide();
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
            showAlert(result.msg, 'success');
            editComboWashesModal.hide();
            fetchUsers();
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
    fetchRevenueTrend();
});
