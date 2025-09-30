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
            // --- NEW LOGIC FOR EXPIRATION ---
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
            
            // --- END OF NEW LOGIC ---
            
            if (user.membership.isPaid && user.membership.remainingWashes > 0 && !isExpired) {
                // Display QR code ONLY if paid, washes remain, AND not expired
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
            // Display for non-members (no change)
            membershipStatus.innerHTML = `
                <p class="text-white">Anda saat ini bukan member aktif.</p>
                <a href="/" class="btn btn-primary">Lihat Paket Member</a>
            `;
            memberCodeSection.innerHTML = `
                <p class="text-center text-white p-4">Beli paket member untuk mendapatkan kode Anda.</p>
            `;
        }

    const nanoCardSection = document.getElementById('nano-card-section');
    if (user.nanoCoatingCard && user.nanoCoatingCard.isActive) {
        const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        document.getElementById('nano-card-number').textContent = user.nanoCoatingCard.cardNumber;
        document.getElementById('nano-plate-number').textContent = user.nanoCoatingCard.plateNumber || 'Belum diisi Admin';
        document.getElementById('nano-coating-date').textContent = formatDate(user.nanoCoatingCard.coatingDate);
        document.getElementById('nano-expires-at').textContent = formatDate(user.nanoCoatingCard.expiresAt);

        nanoCardSection.classList.remove('d-none'); // Tampilkan kartu
    }

        profileLoading.classList.add('d-none');
        profileContent.classList.remove('d-none');
    };

    // --- EVENT LISTENER BARU UNTUK FORM GANTI PASSWORD ---
    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const messageDiv = document.getElementById('password-message');
            const submitButton = document.getElementById('change-password-button');
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmNewPassword = document.getElementById('confirm-new-password').value;

            // Reset pesan
            messageDiv.innerHTML = '';
            submitButton.disabled = true;
            submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Menyimpan...`;

            // Validasi di sisi klien
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
                changePasswordForm.reset(); // Kosongkan form setelah berhasil

                // Tutup modal setelah 2 detik
                setTimeout(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
                    modal.hide();
                    messageDiv.innerHTML = ''; // Bersihkan pesan lagi
                }, 2000);


            } catch (error) {
                messageDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Simpan Perubahan';
            }
        });
    }

    fetchProfileData();
});
