document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        document.body.innerHTML = `<div class="text-center p-5"><h2>Akses Ditolak</h2><p>Silakan login terlebih dahulu.</p><a href="/login" class="btn btn-primary">Login</a></div>`;
        return;
    }

    let currentUserData = null;
    const editPackageDetailModal = new bootstrap.Modal(document.getElementById('editPackageDetailModal'));

    const fetchProfileData = async () => {
        try {
            document.getElementById('profile-loading').classList.remove('d-none');
            document.getElementById('profile-content').classList.add('d-none');
            const response = await fetch('/api/profile', { headers: { 'x-auth-token': token } });
            if (!response.ok) throw new Error('Sesi tidak valid, silakan login kembali.');
            currentUserData = await response.json();
            displayProfile(currentUserData);
        } catch (error) {
            alert(error.message);
            window.location.href = '/login';
        }
    };

    const displayProfile = (user) => {
        document.getElementById('profile-loading').classList.add('d-none');
        document.getElementById('profile-content').classList.remove('d-none');

        document.getElementById('profile-username').textContent = user.username || '-';
        document.getElementById('profile-email').textContent = user.email || '-';
        document.getElementById('profile-phone').textContent = user.phone || '-';

        const membershipsContainer = document.getElementById('memberships-container');
        membershipsContainer.innerHTML = '';

        if (!user.memberships || user.memberships.length === 0) {
            membershipsContainer.innerHTML = `<div class="card card-body text-center"><p>Anda belum memiliki paket aktif.</p><a href="/" class="btn btn-primary">Lihat Pilihan Paket</a></div>`;
            return;
        }

        user.memberships.forEach(pkg => {
            const isNano = pkg.packageName.toLowerCase().includes('nano');
            const card = createPackageCard(pkg, user.memberId, isNano);
            membershipsContainer.appendChild(card);
            
            if (pkg.isPaid && new Date() < new Date(pkg.expiresAt)) {
                if (isNano || pkg.remainingWashes > 0) {
                    const qrContainer = document.getElementById(`qrcode-container-${pkg.packageId}`);
                    if (qrContainer) {
                        new QRCode(qrContainer, {
                            text: `${user.memberId};${pkg.packageId}`,
                            width: 128,
                            height: 128,
                        });
                    }
                }
            }
        });

        document.querySelectorAll('.edit-pkg-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const packageId = e.currentTarget.dataset.pkgId;
                const pkg = currentUserData.memberships.find(m => m._id === packageId);
                if (pkg) {
                    document.getElementById('edit-package-id').value = pkg._id;
                    document.getElementById('edit-package-owner').value = pkg.ownerName || '';
                    document.getElementById('edit-package-plate').value = pkg.plateNumber || '';
                    editPackageDetailModal.show();
                }
            });
        });
    };

    const createPackageCard = (pkg, memberId, isNano) => {
        const card = document.createElement('div');
        card.className = 'card mb-4';
        const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
        const isExpired = new Date() > new Date(pkg.expiresAt);
        const statusBadge = pkg.isPaid ? '<span class="badge bg-success">Lunas</span>' : '<span class="badge bg-warning text-dark">Menunggu Konfirmasi</span>';
        
        let detailsHtml = '';
        let qrHtml = '';

        if (isNano) {
            detailsHtml = `
                <p class="mb-1"><small>Nama Pemilik:</small> <strong>${pkg.ownerName || 'Belum diisi'}</strong></p>
                <p><small>No. Polisi:</small> <strong>${pkg.plateNumber || 'Belum diisi'}</strong></p>
                <hr>
                <p><small>Berlaku hingga: <strong>${formatDate(pkg.expiresAt)}</strong></small></p>
            `;
            if (pkg.isPaid && !isExpired) {
                 qrHtml = `<div id="qrcode-container-${pkg.packageId}"></div><p class="small text-muted mt-2">Tunjukkan untuk maintenance.</p>`;
            }
        } else {
            detailsHtml = `
                <p class="display-4 fw-bold mb-0">${pkg.remainingWashes}x</p>
                <p class="text-muted">Sisa Jatah Pencucian</p>
                <hr>
                <p><small>Berlaku hingga: <strong>${formatDate(pkg.expiresAt)}</strong></small></p>
            `;
            if (pkg.isPaid && !isExpired && pkg.remainingWashes > 0) {
                 qrHtml = `<div id="qrcode-container-${pkg.packageId}"></div><p class="small text-muted mt-2">Tunjukkan kode ini ke staf.</p>`;
            }
        }

        if (!qrHtml && pkg.isPaid && !isExpired) {
            qrHtml = `<div class="qr-pending-message small p-3">Layanan Habis/Selesai</div>`;
        } else if (!pkg.isPaid) {
            qrHtml = `<div class="qr-pending-message small p-3">QR Code muncul setelah lunas.</div>`;
        } else if (isExpired) {
             qrHtml = `<div class="text-danger fw-bold small p-3">Paket Kedaluwarsa</div>`;
        }

        card.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">${pkg.packageName}</h5>
                <div>
                    ${isNano ? `<button class="btn btn-sm btn-outline-info me-2 edit-pkg-btn" data-bs-toggle="modal" data-bs-target="#editPackageDetailModal" data-pkg-id="${pkg._id}"><i class="bi bi-pencil"></i></button>` : ''}
                    ${statusBadge}
                </div>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-7">${detailsHtml}</div>
                    <div class="col-md-5 text-center d-flex flex-column justify-content-center align-items-center">${qrHtml}</div>
                </div>
            </div>
        `;
        return card;
    };

    fetchProfileData();
});
