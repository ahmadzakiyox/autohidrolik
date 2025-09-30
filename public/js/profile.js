document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    const profileLoading = document.getElementById('profile-loading');
    const profileContent = document.getElementById('profile-content');

    if (!token) {
        document.querySelector('.profile-container').innerHTML = `
            <div class="text-center">
                <h2>Data tidak ditemukan!</h2>
                <p class="text-muted">Silakan login terlebih dahulu untuk melihat profil Anda.</p>
                <a href="/login" class="btn btn-primary mt-3">Login</a>
            </div>
        `;
        return;
    }

    const fetchProfileData = async () => {
        try {
            const response = await fetch(`/api/profile`, {
                headers: { 'x-auth-token': token }
            });
            if (!response.ok) throw new Error('Sesi tidak valid.');
            const user = await response.json();
            displayProfileData(user);
        } catch (error) {
            alert(error.message);
            window.location.href = '/login';
        }
    };

    const displayProfileData = (user) => {
        document.getElementById('profile-username').textContent = user.username || '-';
        document.getElementById('profile-email').textContent = user.email || '-';
        document.getElementById('profile-phone').textContent = user.phone || '-';

        const membershipStatus = document.getElementById('membership-status');
        const memberCodeSection = document.getElementById('member-code-section');

        if (user.membership) {
            const formatDate = (dateString) => {
                const options = { year: 'numeric', month: 'long', day: 'numeric' };
                return new Date(dateString).toLocaleDateString('id-ID', options);
            };

            const isExpired = new Date() > new Date(user.membership.expiresAt);

            membershipStatus.innerHTML = `
                <h5 class="card-title">${user.membership.packageName}</h5>
                <p class="display-4 fw-bold">${user.membership.remainingWashes}x</p>
                <p class="text-muted">Sisa Jatah Pencucian</p>
                <hr>
                <p>Berlaku hingga: <strong>${formatDate(user.membership.expiresAt)}</strong></p>
                <p>Status Pembayaran: 
                    ${user.membership.isPaid 
                        ? '<span class="badge bg-success">Lunas</span>' 
                        : '<span class="badge bg-warning text-dark">Menunggu Konfirmasi</span>'}
                </p>
                ${isExpired ? '<p class="text-danger fw-bold mt-2">Paket Anda sudah kedaluwarsa!</p>' : ''}
            `;
            
            if (user.membership.isPaid && user.membership.remainingWashes > 0 && !isExpired) {
                memberCodeSection.innerHTML = `
                    <div id="qrcode-wrapper" class="d-flex flex-column align-items-center justify-content-center">
                        <div id="qrcode-container"></div>
                        <p class="mt-3 text-muted">Tunjukkan kode ini kepada staf kami.</p>
                    </div>
                `;
                
                const qrCodeContainer = document.getElementById('qrcode-container');
                qrCodeContainer.innerHTML = ''; 

                if (user.memberId) {
                    new QRCode(qrCodeContainer, {
                        text: user.memberId,
                        width: 180,
                        height: 180,
                        colorDark : "#000000",
                        colorLight : "#ffffff",
                        correctLevel : QRCode.CorrectLevel.H
                    });
                    
                    const memberIdText = document.createElement('p');
                    memberIdText.className = 'mt-2 fw-bold';
                    memberIdText.textContent = user.memberId;
                    qrCodeContainer.appendChild(memberIdText);
                } else {
                    memberCodeSection.innerHTML = '<p class="text-danger">Member ID tidak ditemukan.</p>';
                }
            } else if (!user.membership.isPaid) {
                memberCodeSection.innerHTML = `<p class="text-center text-white p-4">QR code akan muncul setelah pembayaran dikonfirmasi.</p>`;
            } else if (isExpired) {
                memberCodeSection.innerHTML = `<p class="text-center text-danger p-4 fw-bold">Paket telah hangus.</p>`;
            } else {
                memberCodeSection.innerHTML = `<p class="text-center text-white p-4">Jatah cuci Anda sudah habis.</p>`;
            }

        } else {
            membershipStatus.innerHTML = `
                <p class="text-white">Anda saat ini bukan member aktif.</p>
                <a href="/" class="btn btn-primary">Lihat Paket Member</a>
            `;
            memberCodeSection.innerHTML = `
                <p class="text-center text-white p-4">Beli paket member untuk mendapatkan kode Anda.</p>
            `;
        }

        // ======================= LOGIKA BARU UNTUK KARTU NANO =======================
       <div id="nano-card-section" class="mb-4 d-none">
    <div class="nano-card-background">
        <div class="nano-card-header text-center">
            <img src="/images/logo.png" alt="Logo" class="nano-card-logo">
            <h5 class="nano-card-title mt-2">KARTU MAINTENANCE NANO COATING</h5>
        </div>

        <div class="nano-card-content">
            <div id="nano-card-display" class="d-none">
                <div class="nano-card-field">
                    <label>No. Kartu</label>
                    <span id="nano-card-number"></span>
                </div>
                <div class="nano-card-field">
                    <label>Nama Pemilik</label>
                    <span id="nano-owner-name-display"></span>
                </div>
                <div class="nano-card-field">
                    <label>No. Polisi Mobil</label>
                    <span id="nano-plate-number-display"></span>
                </div>
                <div class="nano-card-field">
                    <label>Tanggal Coating</label>
                    <span id="nano-coating-date"></span>
                </div>
                <div class="nano-card-field">
                    <label>Berlaku Hingga</label>
                    <span id="nano-expires-at"></span>
                </div>
            </div>

            <div id="nano-card-form-container">
                <p class="text-center small">Silakan lengkapi detail kartu Anda.</p>
                <form id="nano-card-form">
                    <div id="nano-form-message"></div>
                    <div class="mb-2">
                        <label class="form-label small">Nama Pemilik</label>
                        <input type="text" class="form-control form-control-sm" id="nano-owner-name-form" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small">No. Polisi Mobil</label>
                        <input type="text" class="form-control form-control-sm" id="nano-plate-number-form" placeholder="Contoh: B 1234 ABC" required>
                    </div>
                    <button type="submit" class="btn btn-primary btn-sm w-100">Simpan Detail</button>
                </form>
            </div>
        </div>

        <div class="nano-card-footer">
            <h6>Keterangan Maintenance:</h6>
            <ul>
                <li>Kartu ini berlaku 1 tahun sejak tanggal coating.</li>
                <li>Selama periode berlaku, pemilik berhak melakukan maintenance nano coating (1 layer) seharga Rp 500.000.</li>
                <li>Maintenance menjaga kilap & proteksi hydrophobic.</li>
                <li>Tidak mencakup kerusakan akibat kecelakaan, goresan kasar, atau perawatan yang salah.</li>
                <li>Disarankan perawatan & pencucian di Auto Hidrolik untuk hasil terbaik.</li>
            </ul>
        </div>
    </div>
</div>
        profileLoading.classList.add('d-none');
        profileContent.classList.remove('d-none');
    };

    // --- EVENT LISTENER UNTUK FORM GANTI PASSWORD ---
    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const messageDiv = document.getElementById('password-message');
            const submitButton = document.getElementById('change-password-button');
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmNewPassword = document.getElementById('confirm-new-password').value;

            messageDiv.innerHTML = '';
            submitButton.disabled = true;
            submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Menyimpan...`;

            if (newPassword !== confirmNewPassword) {
                messageDiv.innerHTML = `<div class="alert alert-danger">Konfirmasi password baru tidak cocok.</div>`;
                submitButton.disabled = false;
                submitButton.innerHTML = 'Simpan Perubahan';
                return;
            }

            try {
                const response = await fetch('/api/profile/change-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token
                    },
                    body: JSON.stringify({ currentPassword, newPassword })
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.msg || 'Gagal mengubah password.');
                }

                messageDiv.innerHTML = `<div class="alert alert-success">${result.msg}</div>`;
                changePasswordForm.reset();

                setTimeout(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
                    modal.hide();
                    messageDiv.innerHTML = '';
                }, 2000);

            } catch (error) {
                messageDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Simpan Perubahan';
            }
        });
    }

    // --- EVENT LISTENER BARU UNTUK FORM KARTU NANO ---
    const nanoCardForm = document.getElementById('nano-card-form');
    if (nanoCardForm) {
        nanoCardForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageDiv = document.getElementById('nano-form-message');
            messageDiv.innerHTML = '';

            const ownerName = document.getElementById('nano-owner-name-form').value;
            const plateNumber = document.getElementById('nano-plate-number-form').value;

            try {
                const response = await fetch('/api/profile/update-nanocard', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                    body: JSON.stringify({ ownerName, plateNumber })
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.msg);

                messageDiv.innerHTML = `<div class="alert alert-success">${result.msg}</div>`;

                // Muat ulang data profil setelah 2 detik untuk menampilkan kartu digital
                setTimeout(() => {
                    fetchProfileData();
                }, 2000);

            } catch (error) {
                messageDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
            }
        });
    }

    fetchProfileData();
});
