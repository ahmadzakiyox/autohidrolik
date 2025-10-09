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
        editOrder: new bootstrap.Modal(document.getElementById('editOrderModal'))
    };

    let cachedData = { users: [], reviews: [] };

    // --- FUNGSI HELPER & API ---
    const showAlert = (message, type = 'success') => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `<div class="bg-${type === 'danger' ? 'red' : 'green'}-100 border-l-4 border-${type === 'danger' ? 'red' : 'green'}-500 text-${type === 'danger' ? 'red' : 'green'}-700 p-4 mb-4" role="alert"><p>${message}</p></div>`;
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
    
    // --- FUNGSI RENDER UTAMA (YANG SEBELUMNYA HILANG) ---
    const render = () => {
        const data = { pending: [], active: [], expired: [], nonMembers: [] };

        cachedData.users.forEach(user => {
            if (!user.memberships || user.memberships.length === 0) {
                data.nonMembers.push(user);
                return;
            }

            let hasActivePackage = false;
            let latestExpiredPackage = null;

            user.memberships.forEach(pkg => {
                if (pkg.isPaid) {
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
            } else if (user.memberships.every(p => !p.isPaid)) {
                // Jika semua paketnya hanya pending, user ini belum masuk kategori manapun
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


    // --- FUNGSI RENDER TAMPILAN (DESAIN BARU) ---
    const renderRow = (content) => `<tr class="bg-white hover:bg-gray-50/50 transition-colors">${content}</tr>`;
    
    const renderPending = (items) => {
        ui.tables.pending.innerHTML = items.length === 0
            ? renderRow(`<td colspan="5" class="px-6 py-4 text-center text-gray-500">Tidak ada pembayaran menunggu.</td>`)
            : items.map(({ user, pkg }) => renderRow(`
                <td class="px-6 py-4 font-medium text-gray-900">${user.username}</td>
                <td class="px-6 py-4">${user.phone || '-'}</td>
                <td class="px-6 py-4">${pkg.packageName}</td>
                <td class="px-6 py-4">${new Date(pkg.purchaseDate).toLocaleDateString('id-ID')}</td>
                <td class="px-6 py-4 text-center">
                    <button class="font-semibold text-green-600 hover:text-green-800 confirm-payment-btn" data-user-id="${user._id}" data-package-id="${pkg._id}">Konfirmasi</button>
                </td>
            `)).join('');
    };

    const renderActive = (activeItems) => {
        ui.tables.active.innerHTML = activeItems.length === 0
            ? renderRow(`<td colspan="6" class="px-6 py-4 text-center text-gray-500">Tidak ada member aktif.</td>`)
            : activeItems.map(({ user }) => renderRow(`
                <td class="px-6 py-4 font-semibold text-gray-700 text-center align-middle">
                    ${user.displayOrder || '-'}
                    <button class="ml-2 text-gray-400 hover:text-indigo-600 edit-order-btn" data-user-id="${user._id}" title="Edit No. Urut"><i class="bi bi-pencil" style="font-size: 0.8rem;"></i></button>
                </td>
                <td class="px-6 py-4 font-medium text-gray-900 align-middle">${user.username}</td>
                <td class="px-6 py-4 text-gray-600 align-middle">${user.email || '-'}</td>
                <td class="px-6 py-4 text-gray-600 align-middle">${user.phone || '-'}</td>
                <td class="px-6 py-4 text-center align-middle"><span class="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">${user.memberships.filter(p=>p.isPaid && new Date(p.expiresAt) > new Date()).length} Paket Aktif</span></td>
                <td class="px-6 py-4 text-center align-middle">
                    <button class="px-3 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md shadow-sm hover:opacity-90 transition-opacity view-packages-btn" data-user-id="${user._id}">Lihat Paket</button>
                </td>
            `)).join('');
    };

    const renderExpired = (items) => {
        ui.tables.expired.innerHTML = items.length === 0
            ? renderRow(`<td colspan="5" class="px-6 py-4 text-center text-gray-500">Tidak ada member kedaluwarsa.</td>`)
            : items.map(({ user, pkg }) => renderRow(`
                <td class="px-6 py-4 font-semibold text-gray-700 text-center align-middle">${user.displayOrder || '-'}</td>
                <td class="px-6 py-4 font-medium text-gray-900 align-middle">${user.username}</td>
                <td class="px-6 py-4 text-gray-600 align-middle">${pkg.packageName}</td>
                <td class="px-6 py-4 align-middle"><span class="font-medium text-red-600">${new Date(pkg.expiresAt).toLocaleDateString('id-ID')}</span></td>
                <td class="px-6 py-4 text-center align-middle">
                    <button class="font-semibold text-indigo-600 hover:text-indigo-800 set-package-btn" data-user-id="${user._id}">Perbarui Paket</button>
                </td>
            `)).join('');
    };

    const renderNonMembers = (users) => {
        ui.tables.nonMember.innerHTML = users.length === 0
            ? renderRow(`<td colspan="5" class="px-6 py-4 text-center text-gray-500">Tidak ada non-member.</td>`)
            : users.map(user => renderRow(`
                <td class="px-6 py-4 font-semibold text-gray-700 text-center align-middle">${user.displayOrder || '-'}</td>
                <td class="px-6 py-4 font-medium text-gray-900 align-middle">${user.username}</td>
                <td class="px-6 py-4 text-gray-600 align-middle">${user.email || '-'}</td>
                <td class="px-6 py-4 text-gray-600 align-middle">${user.phone || '-'}</td>
                <td class="px-6 py-4 text-center align-middle">
                    <button class="font-semibold text-green-600 hover:text-green-800 set-package-btn" data-user-id="${user._id}">Jadikan Member</button>
                </td>
            `)).join('');
    };

    const renderReviews = (reviews) => {
        ui.tables.reviews.innerHTML = reviews.length === 0
            ? renderRow(`<td colspan="4" class="px-6 py-4 text-center text-gray-500">Tidak ada ulasan.</td>`)
            : reviews.map(review => renderRow(`
                <td class="px-6 py-4 font-medium text-gray-900">${review.username || '<em>Pengguna Dihapus</em>'}</td>
                <td class="px-6 py-4 text-yellow-500 font-bold">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</td>
                <td class="px-6 py-4 text-gray-600">${review.comment}</td>
                <td class="px-6 py-4 text-center">
                    <button class="text-gray-400 hover:text-red-600 delete-review-btn" data-review-id="${review._id}" title="Hapus Ulasan"><i class="bi bi-trash3"></i></button>
                </td>
            `)).join('');
    };
    
    const openPackagesModal = (userId) => {
        const user = cachedData.users.find(u => u._id === userId);
        if (!user) return;
        
        document.getElementById('packages-modal-username').textContent = user.username;
        const container = document.getElementById('packages-list-container');
        const activePackages = user.memberships.filter(pkg => pkg.isPaid && new Date(pkg.expiresAt) > new Date());

        container.innerHTML = activePackages.length === 0
            ? '<div class="text-center p-8 text-gray-500">Pengguna ini tidak memiliki paket aktif.</div>'
            : activePackages.map(pkg => {
                const isKombinasi = pkg.packageName.toLowerCase().includes('kombinasi');
                const sisaCuci = isKombinasi
                    ? `<div class="flex items-center space-x-3"><div class="p-2 bg-blue-100 rounded-full"><i class="bi bi-car-front-fill text-blue-600"></i></div><div><div class="font-bold text-lg text-gray-800">${pkg.washes.bodywash || 0}x</div><div class="text-xs text-gray-500">Body Wash</div></div></div><div class="flex items-center space-x-3"><div class="p-2 bg-sky-100 rounded-full"><i class="bi bi-water text-sky-600"></i></div><div><div class="font-bold text-lg text-gray-800">${pkg.washes.hidrolik || 0}x</div><div class="text-xs text-gray-500">Hidrolik</div></div></div>`
                    : `<div class="font-bold text-2xl text-gray-800">${pkg.remainingWashes}x <span class="text-base font-normal text-gray-500">Cuci</span></div>`;

                return `
                <div class="bg-white rounded-xl shadow-md overflow-hidden mb-4 transition-all hover:shadow-lg">
                    <div class="p-5">
                        <div class="flex flex-col md:flex-row justify-between gap-5">
                            <div class="flex-grow">
                                <h5 class="text-xl font-bold text-gray-900">${pkg.packageName}</h5>
                                <p class="text-sm text-gray-500 mt-1">Berlaku hingga: ${new Date(pkg.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                <div class="mt-4 pt-4 border-t border-gray-200 flex items-center gap-6">
                                    <h6 class="text-sm font-semibold text-gray-700">Sisa Jatah:</h6>
                                    <div class="flex gap-6">${sisaCuci}</div>
                                </div>
                            </div>
                            <div class="flex-shrink-0 text-center flex flex-col items-center justify-center bg-gray-50 p-3 rounded-lg">
                                <div class="p-2 bg-white rounded-lg shadow-inner" id="qr-container-${pkg._id}"></div>
                                <p class="text-xs text-gray-500 mt-2">Scan di kasir</p>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-50 px-5 py-3 flex items-center justify-end space-x-3">
                        <button class="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition edit-user-btn" data-user-id="${user._id}">
                            <i class="bi bi-person-fill-gear"></i> Edit User
                        </button>
                        <button class="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition delete-package-btn" data-user-id="${user._id}" data-package-id="${pkg._id}">
                            <i class="bi bi-trash3"></i> Hapus Paket
                        </button>
                    </div>
                </div>`;
            }).join('');
        
        modals.viewPackages.show();
        
        setTimeout(() => {
            activePackages.forEach(pkg => {
                const qrContainer = document.getElementById(`qr-container-${pkg._id}`);
                const totalWashesLeft = isKombinasi ? ((pkg.washes.bodywash || 0) + (pkg.washes.hidrolik || 0)) : pkg.remainingWashes;
                if (qrContainer && totalWashesLeft > 0) {
                    qrContainer.innerHTML = '';
                    new QRCode(qrContainer, { text: `${user.memberId};${pkg.packageId}`, width: 100, height: 100 });
                } else if (qrContainer) {
                    qrContainer.innerHTML = '<div class="w-[100px] h-[100px] flex items-center justify-center text-center text-xs font-semibold text-red-500 p-2">Jatah Cuci Habis</div>';
                }
            });
        }, 100);
    };

    const initialize = async () => {
        try {
            const [users, stats, reviews] = await Promise.all([
                apiRequest('/api/users'),
                apiRequest('/api/dashboard-stats'),
                apiRequest('/api/reviews/all')
            ]);

            users.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

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
    
    document.getElementById('package-name-select')?.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        document.getElementById('total-washes-input').value = selectedOption.dataset.washes || 0;
    });

    initialize();
});
