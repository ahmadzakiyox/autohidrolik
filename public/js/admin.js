document.addEventListener('DOMContentLoaded', () => {
    // Penjaga untuk memastikan skrip hanya berjalan di halaman admin
    const adminPageMarker = document.getElementById('member-table-body');
    if (!adminPageMarker) return;

    // --- KONFIGURASI & OTENTIKASI ---
    const token = localStorage.getItem('token');
    if (!token || localStorage.getItem('userRole') !== 'admin') {
        alert('Akses ditolak. Silakan login sebagai admin.');
        window.location.href = '/login.html';
        return;
    }

    // --- ELEMEN UI & MODAL---
    const ui = {
        alertPlaceholder: document.getElementById('alert-placeholder'),
        memberCount: document.getElementById('member-count'),
        visitorCount: document.getElementById('visitor-count'),
        transactionTotal: document.getElementById('transaction-total'),
        downloadButton: document.getElementById('download-data-btn'),
        tables: {
            pending: document.getElementById('pending-payment-table-body'),
            active: document.getElementById('member-table-body'),
            expired: document.getElementById('expired-member-table-body'),
            nonMember: document.getElementById('non-member-table-body'),
            reviews: document.getElementById('review-table-body'),
        }
    };

    const modals = {
        addUser: new bootstrap.Modal(document.getElementById('addUserModal')),
        editUser: new bootstrap.Modal(document.getElementById('editUserModal')),
        setPackage: new bootstrap.Modal(document.getElementById('setPackageModal')),
        viewPackages: new bootstrap.Modal(document.getElementById('viewPackagesModal')),
        editReview: new bootstrap.Modal(document.getElementById('editReviewModal')),
        resetPassword: new bootstrap.Modal(document.getElementById('resetPasswordModal')),
        editTransaction: new bootstrap.Modal(document.getElementById('editTransactionModal')),
    };

    let cachedData = { users: [], reviews: [] };

    // --- FUNGSI HELPER & API ---
    const showAlert = (message, type = 'success') => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
        ui.alertPlaceholder.append(wrapper);
        setTimeout(() => wrapper.remove(), 5000);
    };

    const apiRequest = async (endpoint, options = {}) => {
        options.headers = { ...options.headers, 'x-auth-token': token };
        if (options.body && typeof options.body !== 'string') {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }
        const response = await fetch(endpoint, options);
        const result = await response.json();
        if (!response.ok) throw new Error(result.msg || 'Terjadi kesalahan pada server.');
        return result;
    };

    // --- FUNGSI RENDER TAMPILAN ---
    const render = () => {
        const data = { pending: [], active: [], expired: [], nonMembers: [] };
        cachedData.users.forEach(user => {
            if (user.memberships && user.memberships.length > 0) {
                user.memberships.forEach(pkg => {
                    const item = { user, pkg };
                    if (!pkg.isPaid) data.pending.push(item);
                    else if (new Date(pkg.expiresAt) < new Date()) data.expired.push(item);
                    else data.active.push(item);
                });
            } else {
                data.nonMembers.push(user);
            }
        });

        renderPending(data.pending);
        renderActive(data.active);
        renderExpired(data.expired);
        renderNonMembers(data.nonMembers);
        renderReviews(cachedData.reviews);
    };

    const renderPending = (items) => {
        ui.tables.pending.innerHTML = items.length === 0
            ? `<tr><td colspan="5" class="text-center text-muted">Tidak ada pembayaran menunggu.</td></tr>`
            : items.map(({ user, pkg }) => `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.phone || '-'}</td>
                    <td>${pkg.packageName}</td>
                    <td>${new Date(pkg.purchaseDate).toLocaleDateString('id-ID')}</td>
                    <td><button class="btn btn-sm btn-success confirm-payment-btn" data-user-id="${user._id}" data-package-id="${pkg._id}"><i class="bi bi-check-circle"></i> Konfirmasi</button></td>
                </tr>`).join('');
    };

    const renderActive = (items) => {
        const usersMap = items.reduce((acc, { user, pkg }) => {
            if (!acc[user._id]) acc[user._id] = { ...user, packages: [] };
            acc[user._id].packages.push(pkg);
            return acc;
        }, {});

        ui.tables.active.innerHTML = Object.keys(usersMap).length === 0
            ? `<tr><td colspan="6" class="text-center text-muted">Tidak ada member aktif.</td></tr>`
            : Object.values(usersMap).map((user, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${user.username}</td>
                    <td>${user.email || '-'}</td>
                    <td>${user.phone || '-'}</td>
                    <td><span class="badge bg-info">${user.packages.length} Paket Aktif</span></td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-primary view-packages-btn" data-user-id="${user._id}"><i class="bi bi-card-list"></i> Lihat Paket</button>
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown"></button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item edit-user-btn" href="#" data-user-id="${user._id}"><i class="bi bi-pencil-square me-2"></i>Edit User</a></li>
                                <li><a class="dropdown-item set-package-btn" href="#" data-user-id="${user._id}"><i class="bi bi-gem me-2"></i>Tambah Paket</a></li>
                                <li><a class="dropdown-item reset-password-btn" href="#" data-user-id="${user._id}"><i class="bi bi-key-fill me-2"></i>Reset Password</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger delete-user-btn" href="#" data-user-id="${user._id}"><i class="bi bi-trash3 me-2"></i>Hapus User</a></li>
                            </ul>
                        </div>
                    </td>
                </tr>`).join('');
    };
    
    const renderExpired = (items) => {
        ui.tables.expired.innerHTML = items.length === 0
            ? `<tr><td colspan="6" class="text-center text-muted">Tidak ada member kedaluwarsa.</td></tr>`
            : items.map(({ user, pkg }, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${user.username}</td>
                    <td>${user.email || '-'}</td>
                    <td>${pkg.packageName}</td>
                    <td><span class="text-danger fw-bold">${new Date(pkg.expiresAt).toLocaleDateString('id-ID')}</span></td>
                    <td><button class="btn btn-sm btn-success set-package-btn" data-user-id="${user._id}"><i class="bi bi-arrow-clockwise"></i> Perbarui</button></td>
                </tr>`).join('');
    };

    const renderNonMembers = (users) => {
        ui.tables.nonMember.innerHTML = users.length === 0
            ? `<tr><td colspan="5" class="text-center text-muted">Tidak ada non-member.</td></tr>`
            : users.map((user, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${user.username}</td>
                    <td>${user.email || '-'}</td>
                    <td>${user.phone || '-'}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-success set-package-btn" data-user-id="${user._id}"><i class="bi bi-gem"></i> Jadikan Member</button>
                            <button class="btn btn-sm btn-outline-warning edit-user-btn" data-user-id="${user._id}"><i class="bi bi-pencil-square"></i></button>
                            <button class="btn btn-sm btn-outline-danger delete-user-btn" data-user-id="${user._id}"><i class="bi bi-trash3"></i></button>
                        </div>
                    </td>
                </tr>`).join('');
    };
    
    const renderReviews = (reviews) => {
        ui.tables.reviews.innerHTML = reviews.length === 0
            ? `<tr><td colspan="4" class="text-center text-muted">Belum ada ulasan.</td></tr>`
            : reviews.map(review => `
                <tr data-review-id="${review._id}">
                    <td>${review.user ? review.user.username : '<em>Dihapus</em>'}</td>
                    <td><span class="rating-stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span></td>
                    <td>${review.comment}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-warning edit-review-btn"><i class="bi bi-pencil-square"></i></button>
                            <button class="btn btn-sm btn-outline-danger delete-review-btn"><i class="bi bi-trash3"></i></button>
                        </div>
                    </td>
                </tr>`).join('');
    };

    // --- FUNGSI MODAL & AKSI ---
    const openPackagesModal = (userId) => {
        const user = cachedData.users.find(u => u._id === userId);
        if (!user) return;
        
        document.getElementById('packages-modal-username').textContent = user.username;
        const container = document.getElementById('packages-list-container');
        const activePackages = user.memberships.filter(pkg => pkg.isPaid && new Date(pkg.expiresAt) > new Date());

        // ... di dalam fungsi openPackagesModal
container.innerHTML = activePackages.length === 0
    ? '<p class="text-center text-muted">Pengguna ini tidak memiliki paket aktif.</p>'
    : activePackages.map(pkg => {
        const sisaCuci = pkg.packageName.toLowerCase().includes('kombinasi')
            ? `Bodywash: <strong>${pkg.washes.bodywash}x</strong>, Hidrolik: <strong>${pkg.washes.hidrolik}x</strong>`
            : `${pkg.remainingWashes}x`;
        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-7">
                            <h5 class="card-title">${pkg.packageName}</h5>
                            <p class="card-text mb-1">Sisa Jatah: ${sisaCuci}</p>
                            <p class="card-text"><small class="text-muted">Berlaku hingga: ${new Date(pkg.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</small></p>
                            
                            <button class="btn btn-sm btn-outline-danger delete-package-btn mt-2" data-user-id="${user._id}" data-package-id="${pkg._id}">
                                <i class="bi bi-trash3"></i> Hapus Paket Ini
                            </button>

                        </div>
                        <div class="col-md-5 text-center" id="qr-container-${pkg._id}"></div>
                    </div>
                </div>
            </div>`;
    }).join('');
// ...
        
        modals.viewPackages.show();
        
        setTimeout(() => {
            activePackages.forEach(pkg => {
                const qrContainer = document.getElementById(`qr-container-${pkg._id}`);
                if (qrContainer) {
                    qrContainer.innerHTML = '';
                    new QRCode(qrContainer, { text: `${user.memberId};${pkg.packageId}`, width: 128, height: 128, colorDark: "#000000", colorLight: "#ffffff" });
                }
            });
        }, 300);
    };

    const handleFormSubmit = async (form, successMessage, modalToHide) => {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        if (form.id === 'set-package-form') {
            const select = document.getElementById('package-name-select');
            data.totalWashes = select.options[select.selectedIndex].dataset.washes || 0;
        }

        const endpoint = form.dataset.endpoint.replace(':id', data.id);
        const method = form.dataset.method;
        if (form.dataset.endpoint.includes(':id')) delete data.id;

        try {
            const result = await apiRequest(endpoint, { method, body: data });
            showAlert(successMessage || result.msg);
            modalToHide.hide();
            form.reset();
            initialize();
        } catch (error) {
            showAlert(error.message, 'danger');
        }
    };
    
    // --- PENGELOLA EVENT ---
    document.body.addEventListener('click', async (e) => {
        const button = e.target.closest('button, a.dropdown-item');
        if (!button) return;

        const userId = button.dataset.userId;
        const reviewId = button.closest('tr')?.dataset.reviewId;

        try {
            if (button.classList.contains('confirm-payment-btn')) {
                if (confirm('Anda yakin ingin mengonfirmasi pembayaran ini?')) {
                    const result = await apiRequest(`/api/confirm-payment/${button.dataset.userId}/${button.dataset.packageId}`, { method: 'POST' });
                    showAlert(result.msg);
                    initialize();
                }
            } else if (button.classList.contains('view-packages-btn')) {
                openPackagesModal(userId);
            } else if (button.classList.contains('edit-user-btn')) {
                const user = cachedData.users.find(u => u._id === userId);
                if (user) {
                    const form = document.getElementById('edit-user-form');
                    form.querySelector('#edit-user-id').value = user._id;
                    form.querySelector('#edit-username').value = user.username;
                    form.querySelector('#edit-email').value = user.email || '';
                    form.querySelector('#edit-phone').value = user.phone;
                    modals.editUser.show();
                }
            } else if (button.classList.contains('set-package-btn')) {
                 const user = cachedData.users.find(u => u._id === userId);
                if (user) {
                    document.getElementById('package-username').textContent = user.username;
                    document.getElementById('set-package-userid').value = user._id;
                    modals.setPackage.show();
                }
            } else if (button.classList.contains('delete-user-btn')) {
                if (confirm('Anda yakin ingin menghapus pengguna ini?')) {
                    const result = await apiRequest(`/api/users/${userId}`, { method: 'DELETE' });
                    showAlert(result.msg);
                    initialize();
                }
            } else if (button.classList.contains('reset-password-btn')) {
                const user = cachedData.users.find(u => u._id === userId);
                if(user) {
                    document.getElementById('reset-password-username').textContent = user.username;
                    document.getElementById('reset-password-userid').value = user._id;
                    modals.resetPassword.show();
                }
            } else if (button.classList.contains('delete-review-btn')) {
                 if (confirm('Anda yakin ingin menghapus ulasan ini?')) {
                    const result = await apiRequest(`/api/reviews/${reviewId}`, { method: 'DELETE' });
                    showAlert(result.msg);
                    initialize();
                }
            } else if (button.classList.contains('edit-review-btn')) {
                const review = cachedData.reviews.find(r => r._id === reviewId);
                if (review) {
                    const form = document.getElementById('edit-review-form');
                    form.querySelector('#edit-review-id').value = review._id;
                    form.querySelector('#edit-rating').value = review.rating;
                    form.querySelector('#edit-comment').value = review.comment;
                    modals.editReview.show();
                }
            }
// ===== TAMBAHKAN BLOK BARU DI BAWAH INI =====
else if (button.classList.contains('delete-package-btn')) {
    const packageId = button.dataset.packageId;
    if (confirm('Anda yakin ingin menghapus paket ini secara permanen? Tindakan ini tidak bisa dibatalkan.')) {
        const result = await apiRequest(`/api/users/${userId}/packages/${packageId}`, { method: 'DELETE' });
        showAlert(result.msg);
        modals.viewPackages.hide(); // Tutup modal setelah berhasil
        initialize(); // Muat ulang data
    }
}
        } catch (error) {
            showAlert(error.message, 'danger');
        }
    });

    // --- INISIALISASI ---
    const initialize = async () => {
        try {
            const [users, stats, reviews] = await Promise.all([
                apiRequest('/api/users'),
                apiRequest('/api/dashboard-stats'),
                apiRequest('/api/reviews/all')
            ]);
            cachedData = { users, reviews };
            ui.memberCount.textContent = stats.activeMembers;
            ui.visitorCount.textContent = stats.totalVisitors;
            ui.transactionTotal.textContent = `Rp ${stats.totalTransactions.toLocaleString('id-ID')}`;
            render();
        } catch (error) {
            showAlert(error.message, 'danger');
        }
    };
    
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const modal = bootstrap.Modal.getInstance(this.closest('.modal'));
            const successMessage = this.dataset.successMessage || 'Aksi berhasil dijalankan.'; 
            handleFormSubmit(this, successMessage, modal);
        });
    });
    
    document.getElementById('logout-button').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        window.location.href = '/login.html';
    });
    
    ui.downloadButton.addEventListener('click', async () => {
        ui.downloadButton.disabled = true;
        ui.downloadButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Mengunduh...';
        try {
            const response = await fetch('/api/download-data', { headers: { 'x-auth-token': token } });
            if (!response.ok) throw new Error('Gagal mengunduh data.');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `data_autohidrolik_${new Date().toISOString().slice(0,10)}.xlsx`;
            document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
        } catch (error) {
            showAlert(error.message, 'danger');
        } finally {
            ui.downloadButton.disabled = false;
            ui.downloadButton.innerHTML = '<i class="bi bi-download"></i> Download Data';
        }
    });
    
    // Hubungkan select dengan input tersembunyi untuk totalWashes
    document.getElementById('package-name-select')?.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        document.getElementById('total-washes-input').value = selectedOption.dataset.washes || 0;
    });

    initialize();
});
