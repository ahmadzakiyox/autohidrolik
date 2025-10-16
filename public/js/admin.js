document.addEventListener('DOMContentLoaded', () => {
    const adminPageMarker = document.getElementById('member-table-body');
    if (!adminPageMarker) return;

    const token = localStorage.getItem('token');
    if (!token || localStorage.getItem('userRole') !== 'admin') {
        alert('Akses ditolak. Silakan login sebagai admin.');
        window.location.href = '/login.html';
        return;
    }

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
        editOrder: new bootstrap.Modal(document.getElementById('editOrderModal'))
    };

    let cachedData = { users: [], reviews: [] };

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
        if (!response.ok) {
            const result = await response.json().catch(() => ({ msg: 'Terjadi kesalahan pada server.' }));
            throw new Error(result.msg);
        }
        return await response.json();
    };
    
    const render = () => {
        const data = { pending: [], active: [], expired: [], nonMembers: [] };

        cachedData.users.forEach(user => {
            if (!user.memberships || user.memberships.length === 0) {
                data.nonMembers.push(user);
                return;
            }

            let hasActivePackage = false;
            let latestExpiredPackage = null;
            let allPackagesPending = true;

            user.memberships.forEach(pkg => {
                if (pkg.isPaid) {
                    allPackagesPending = false;
                    if (new Date(pkg.expiresAt) >= new Date()) {
                        hasActivePackage = true;
                    } else {
                        if (!latestExpiredPackage || new Date(pkg.expiresAt) > new Date(latestExpiredPackage.expiresAt)) {
                            latestExpiredPackage = pkg;
                        }
                    }
                } else {
                    data.pending.push({ user, pkg });
                }
            });

            if (hasActivePackage) {
                data.active.push({ user });
            } else if (latestExpiredPackage) {
                data.expired.push({ user, pkg: latestExpiredPackage });
            } else if (allPackagesPending) {
                // Jangan tampilkan di mana-mana jika hanya punya paket pending
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
        ? `<tr><td colspan="5" class="text-center text-muted p-4">Tidak ada pembayaran menunggu.</td></tr>`
        : items.map(({ user, pkg }) => `
            <tr>
                <td class="px-3 align-middle">${user.username}</td>
                <td class="align-middle">${user.phone || '-'}</td>
                <td class="align-middle">${pkg.packageName}</td>
                <td class="align-middle">${new Date(pkg.purchaseDate).toLocaleDateString('id-ID')}</td>
                <td class="text-center align-middle">
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-success confirm-payment-btn" data-user-id="${user._id}" data-package-id="${pkg._id}">Konfirmasi</button>
                        <button class="btn btn-sm btn-danger ms-2 cancel-payment-btn" data-user-id="${user._id}" data-package-id="${pkg._id}">Batal</button>
                    </div>
                </td>
            </tr>`).join('');
};

    const renderActive = (activeItems) => {
        ui.tables.active.innerHTML = activeItems.length === 0
            ? `<tr><td colspan="6" class="text-center text-muted p-4">Tidak ada member aktif.</td></tr>`
            : activeItems.map(({ user }) => `
                <tr>
                    <td class="px-3 text-center align-middle">
                        ${user.displayOrder || '-'}
                        <button class="btn btn-sm btn-link p-0 ms-1 edit-order-btn" data-user-id="${user._id}" title="Edit No. Urut"><i class="bi bi-pencil"></i></button>
                    </td>
                    <td class="align-middle">${user.username}</td>
                    <td class="align-middle">${user.email || '-'}</td>
                    <td class="align-middle">${user.phone || '-'}</td>
                    <td class="text-center align-middle"><span class="badge bg-primary rounded-pill">${user.memberships.filter(p => p.isPaid && new Date(p.expiresAt) > new Date()).length}</span></td>
                    <td class="text-center align-middle">
                        <div class="btn-group">
                            <button class="btn btn-sm btn-primary view-packages-btn" data-user-id="${user._id}">Lihat Paket</button>
                            <button type="button" class="btn btn-sm btn-primary dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                <span class="visually-hidden">Toggle Dropdown</span>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><a class="dropdown-item set-package-btn" href="#" data-user-id="${user._id}"><i class="bi bi-gem me-2"></i>Tambah Paket Baru</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item edit-user-btn" href="#" data-user-id="${user._id}"><i class="bi bi-pencil-square me-2"></i>Edit User</a></li>
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
            ? `<tr><td colspan="5" class="text-center text-muted p-4">Tidak ada member kedaluwarsa.</td></tr>`
            : items.map(({ user, pkg }) => `
                <tr>
                    <td class="px-3 text-center align-middle">${user.displayOrder || '-'}</td>
                    <td class="align-middle">${user.username}</td>
                    <td class="align-middle">${pkg.packageName}</td>
                    <td class="align-middle"><span class="text-danger">${new Date(pkg.expiresAt).toLocaleDateString('id-ID')}</span></td>
                    <td class="text-center align-middle">
                        <button class="btn btn-sm btn-info text-white set-package-btn" data-user-id="${user._id}">Perbarui</button>
                    </td>
                </tr>`).join('');
    };

    const renderNonMembers = (users) => {
        ui.tables.nonMember.innerHTML = users.length === 0
            ? `<tr><td colspan="5" class="text-center text-muted p-4">Tidak ada non-member.</td></tr>`
            : users.map(user => `
                <tr>
                    <td class="px-3 text-center align-middle">${user.displayOrder || '-'}</td>
                    <td class="align-middle">${user.username}</td>
                    <td class="align-middle">${user.email || '-'}</td>
                    <td class="align-middle">${user.phone || '-'}</td>
                    <td class="text-center align-middle">
                        <button class="btn btn-sm btn-success set-package-btn" data-user-id="${user._id}">Jadikan Member</button>
                    </td>
                </tr>`).join('');
    };

    const renderReviews = (reviews) => {
        ui.tables.reviews.innerHTML = reviews.length === 0
            ? `<tr><td colspan="4" class="text-center text-muted p-4">Tidak ada ulasan.</td></tr>`
            : reviews.map(review => `
                <tr>
                    <td class="px-3 align-middle">${review.username || '<em>Pengguna Dihapus</em>'}</td>
                    <td class="align-middle" style="color: #ffc107;">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</td>
                    <td class="align-middle">${review.comment}</td>
                    <td class="text-center align-middle">
                        <button class="btn btn-sm btn-outline-danger delete-review-btn" data-review-id="${review._id}"><i class="bi bi-trash3"></i></button>
                    </td>
                </tr>`).join('');
    };
    
    const openPackagesModal = (userId) => {
        const user = cachedData.users.find(u => u._id === userId);
        if (!user) return;
        
        document.getElementById('packages-modal-username').textContent = user.username;
        const container = document.getElementById('packages-list-container');
        const activePackages = user.memberships.filter(pkg => pkg.isPaid && new Date(pkg.expiresAt) > new Date());

        container.innerHTML = activePackages.length === 0
            ? '<div class="text-center p-4 text-muted">Pengguna ini tidak memiliki paket aktif.</div>'
            : activePackages.map(pkg => {
                const isKombinasi = pkg.packageName.toLowerCase().includes('kombinasi');
                const sisaCuci = isKombinasi
                    ? `Bodywash: <strong class="text-dark">${pkg.washes.bodywash || 0}x</strong>, Hidrolik: <strong class="text-dark">${pkg.washes.hidrolik || 0}x</strong>`
                    : `<strong class="text-dark">${pkg.remainingWashes || 0}x</strong> Sisa Cuci`;

                return `
                <div class="card mb-3 shadow-sm">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-8">
                                <h5 class="card-title fw-bold text-dark">${pkg.packageName}</h5>
                                <p class="card-text text-muted mb-2"><small>Berlaku hingga: ${new Date(pkg.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</small></p>
                                <hr>
                                <h6 class="card-subtitle mb-2 text-muted">Sisa Jatah:</h6>
                                <p class="card-text fs-5">${sisaCuci}</p>
                            </div>
                            <div class="col-md-4 text-center mt-3 mt-md-0">
                                <div id="qr-container-${pkg._id}" class="d-inline-block p-2 bg-white rounded border shadow-sm"></div>
                                <p class="small text-muted mt-2">Tunjukkan kode ini ke staf.</p>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer bg-light d-flex justify-content-end gap-2">
                        <button class="btn btn-sm btn-outline-secondary edit-user-btn" data-user-id="${user._id}"><i class="bi bi-person-fill-gear"></i> Edit User</button>
                        <button class="btn btn-sm btn-outline-danger delete-package-btn" data-user-id="${user._id}" data-package-id="${pkg._id}"><i class="bi bi-trash3"></i> Hapus Paket</button>
                    </div>
                </div>`;
            }).join('');
        
        modals.viewPackages.show();
        
        setTimeout(() => {
            activePackages.forEach(pkg => {
                const qrContainer = document.getElementById(`qr-container-${pkg._id}`);
                const isKombinasi = pkg.packageName.toLowerCase().includes('kombinasi');
                const totalWashesLeft = isKombinasi ? ((pkg.washes.bodywash || 0) + (pkg.washes.hidrolik || 0)) : (pkg.remainingWashes || 0);
                
                if (qrContainer && totalWashesLeft > 0) {
                    qrContainer.innerHTML = '';
                    new QRCode(qrContainer, { text: `${user.memberId};${pkg.packageId}`, width: 120, height: 120 });
                } else if (qrContainer) {
                    qrContainer.innerHTML = '<div style="width: 120px; height: 120px;" class="d-flex align-items-center justify-content-center text-center small fw-bold text-danger bg-light rounded">Jatah Habis</div>';
                }
            });
        }, 200);
    };

    const initialize = async () => {
        try {
            const [users, stats, reviews] = await Promise.all([
                apiRequest('/api/users'),
                apiRequest('/api/dashboard-stats'),
                apiRequest('/api/reviews/all')
            ]);

            users.sort((a, b) => (a.displayOrder || Infinity) - (b.displayOrder || Infinity));

            cachedData = { users, reviews };
            ui.memberCount.textContent = stats.activeMembers;
            ui.visitorCount.textContent = stats.totalVisitors;
            ui.transactionTotal.textContent = `Rp ${stats.totalTransactions.toLocaleString('id-ID')}`;
            render();
        } catch (error) {
            showAlert(error.message, 'danger');
        }
    };
    
    document.body.addEventListener('click', async (e) => {
        const button = e.target.closest('button, a.dropdown-item');
        if (!button) return;
        
        const userId = button.dataset.userId || button.closest('[data-user-id]')?.dataset.userId;
        const reviewId = button.closest('tr')?.dataset.reviewId;

        try {
            if (button.classList.contains('confirm-payment-btn')) {
                if (confirm('Anda yakin ingin mengonfirmasi pembayaran ini?')) {
                    const result = await apiRequest(`/api/confirm-payment/${button.dataset.userId}/${button.dataset.packageId}`, { method: 'POST' });
                    showAlert(result.msg);
                    initialize();
                }
               else if (button.classList.contains('cancel-payment-btn')) {
            if (confirm('Anda yakin ingin MEMBATALKAN pesanan ini? Tindakan ini akan menghapus data pembelian.')) {
                const userId = button.dataset.userId;
                const packageId = button.dataset.packageId;
                const result = await apiRequest(`/api/cancel-payment/${userId}/${packageId}`, { method: 'DELETE' });
                showAlert(result.msg, 'warning'); // Tampilkan notifikasi
                initialize(); // Muat ulang data tabel
            }
              }
            } else if (button.classList.contains('view-packages-btn')) {
                openPackagesModal(userId);
            } else if (button.classList.contains('edit-user-btn')) {
                const user = cachedData.users.find(u => u._id === userId);
                if (user) {
                    if(modals.viewPackages._isShown) modals.viewPackages.hide();
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
            } else if (button.classList.contains('delete-package-btn')) {
                const packageId = button.dataset.packageId;
                if (confirm('Anda yakin ingin menghapus paket ini secara permanen? Tindakan ini tidak bisa dibatalkan.')) {
                    const result = await apiRequest(`/api/users/${userId}/packages/${packageId}`, { method: 'DELETE' });
                    showAlert(result.msg);
                    modals.viewPackages.hide();
                    initialize();
                }
            } 
            else if (button.classList.contains('edit-order-btn')) {
                const user = cachedData.users.find(u => u._id === userId);
                if (user) {
                    document.getElementById('edit-order-userid').value = user._id;
                    document.getElementById('edit-order-username').textContent = user.username;
                    document.getElementById('edit-order-input').value = user.displayOrder || 0;
                    modals.editOrder.show();
                }
            }
        } catch (error) {
            showAlert(error.message, 'danger');
        }
    });

    const handleFormSubmit = async (form, successMessage, modal) => {
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
            if (modal) modal.hide();
            form.reset();
            initialize();
        } catch (error) {
            showAlert(error.message, 'danger');
        }
    };

    document.querySelectorAll('form').forEach(form => {
        if (form.id === 'edit-order-form') return;
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const modalEl = this.closest('.modal');
            if (!modalEl) return;
            const modal = bootstrap.Modal.getInstance(modalEl);
            const successMessage = this.dataset.successMessage || 'Aksi berhasil dijalankan.'; 
            handleFormSubmit(this, successMessage, modal);
        });
    });

    document.getElementById('edit-order-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const userId = document.getElementById('edit-order-userid').value;
        const newOrder = parseInt(document.getElementById('edit-order-input').value, 10);
        
        if (isNaN(newOrder)) {
            return showAlert('Nomor urut harus berupa angka.', 'danger');
        }

        try {
            const result = await apiRequest(`/api/users/${userId}/update-order`, {
                method: 'PUT',
                body: { newOrder }
            });
            showAlert(result.msg);
            modals.editOrder.hide();
            initialize();
        } catch (error) {
            showAlert(error.message, 'danger');
        }
    });

    document.getElementById('logout-button').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        window.location.href = '/login.html';
    });
    
    document.getElementById('download-data-btn').addEventListener('click', async () => {
        const btn = document.getElementById('download-data-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Mengunduh...';
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
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-download me-2"></i> Download Data';
        }
    });
    
    document.getElementById('package-name-select')?.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        document.getElementById('total-washes-input').value = selectedOption.dataset.washes || 0;
    });

    initialize();
});
