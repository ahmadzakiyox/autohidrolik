document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        document.body.innerHTML = `<div class="text-center p-5"><h2>Akses Ditolak</h2><p>Silakan login terlebih dahulu.</p><a href="/login.html" class="btn btn-primary">Login</a></div>`;
        return;
    }

    const fetchProfileData = async () => {
        try {
            document.getElementById('profile-loading').classList.remove('d-none');
            document.getElementById('profile-content').classList.add('d-none');
            const response = await fetch('/api/profile', { headers: { 'x-auth-token': token } });
            if (!response.ok) throw new Error('Sesi tidak valid, silakan login kembali.');
            const currentUserData = await response.json();
            displayProfile(currentUserData);
        } catch (error) {
            alert(error.message);
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            window.location.href = '/login.html';
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

        user.memberships.sort((a, b) => {
            if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
            return new Date(b.expiresAt) - new Date(a.expiresAt);
        });

        user.memberships.forEach(pkg => {
            const card = createPackageCard(pkg);
            membershipsContainer.appendChild(card);
            
            if (pkg.isPaid && new Date() < new Date(pkg.expiresAt)) {
                const qrContainer = document.getElementById(`qrcode-container-${pkg._id}`);
                const isNano = pkg.packageName.toLowerCase().includes('nano');
                
                if (qrContainer && (pkg.remainingWashes > 0 || isNano)) {
                     const qrData = `${user.memberId};${pkg.packageId}`;
                     console.log(`Generating QR for packageId: ${pkg.packageId}`);
                     new QRCode(qrContainer, {
                        text: qrData,
                        width: 128,
                        height: 128,
                    });
                }
            }
        });
    };

    const createPackageCard = (pkg) => {
        const card = document.createElement('div');
        card.className = 'card mb-4';
        const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
        const isExpired = new Date() > new Date(pkg.expiresAt);
        let statusBadge;

        if (!pkg.isPaid) {
            statusBadge = '<span class="badge bg-warning text-dark">Menunggu Konfirmasi</span>';
        } else if (isExpired) {
            statusBadge = '<span class="badge bg-danger">Kedaluwarsa</span>';
        } else {
            statusBadge = '<span class="badge bg-success">Aktif</span>';
        }
        
        const isNano = pkg.packageName.toLowerCase().includes('nano');
        let detailsHtml = '';
        let qrHtml = '';

        if (isNano) {
            detailsHtml = `
                <p class="mb-1"><small>Nama Pemilik:</small> <strong>${pkg.ownerName || 'Belum diisi'}</strong></p>
                <p><small>No. Polisi:</small> <strong>${pkg.plateNumber || 'Belum diisi'}</strong></p>
                <hr>
                <p><small>Berlaku hingga: <strong>${formatDate(pkg.expiresAt)}</strong></small></p>
            `;
        } else {
            detailsHtml = `
                <p class="display-4 fw-bold mb-0">${pkg.remainingWashes || 0}x</p>
                <p class="text-muted">Sisa Jatah Pencucian</p>
                <hr>
                <p><small>Berlaku hingga: <strong>${formatDate(pkg.expiresAt)}</strong></small></p>
            `;
        }

        if (pkg.isPaid && !isExpired) {
            if (pkg.remainingWashes > 0 || isNano) {
                qrHtml = `<div id="qrcode-container-${pkg._id}"></div><p class="small text-muted mt-2">Tunjukkan kode ini ke staf.</p>`;
            } else {
                 qrHtml = `<div class="qr-pending-message small p-3 text-center">Jatah cuci habis.</div>`;
            }
        } else if (!pkg.isPaid) {
            qrHtml = `<div class="qr-pending-message small p-3 text-center">QR Code akan muncul setelah pembayaran dikonfirmasi admin.</div>`;
        } else if (isExpired) {
             qrHtml = `<div class="text-danger fw-bold small p-3 text-center">Paket Kedaluwarsa</div>`;
        }

        card.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">${pkg.packageName}</h5>
                ${statusBadge}
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
