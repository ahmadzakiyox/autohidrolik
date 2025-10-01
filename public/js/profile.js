document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    let currentUserData = null; 

    // Elemen Loading
    const profileLoading = document.getElementById('profile-loading');
    const profileContent = document.getElementById('profile-content');
    
    // Elemen Modal Edit Profil
    const editProfileModal = new bootstrap.Modal(document.getElementById('editProfileModal'));
    const editProfileForm = document.getElementById('edit-profile-form');
    const saveProfileButton = document.getElementById('save-profile-button');
    
    // ================== KODE BARU DI SINI ==================
    // Elemen Modal Edit Kartu Nano
    const editNanoCardModal = new bootstrap.Modal(document.getElementById('editNanoCardModal'));
    const editNanoCardForm = document.getElementById('edit-nanocard-form');
    const saveNanoCardButton = document.getElementById('save-nanocard-button');
    // ================= AKHIR KODE BARU =================
    
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
            
            currentUserData = await response.json();
            displayProfileData(currentUserData);

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
                memberCodeSection.innerHTML = `<div class="qr-pending-message">QR code akan muncul setelah pembayaran dikonfirmasi.</div>`;
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

        const nanoCardSection = document.getElementById('nano-card-section');
        if (user.nanoCoatingCard && user.nanoCoatingCard.isActive) {
            const card = user.nanoCoatingCard;
            const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

            if (card.plateNumber) {
                document.getElementById('nano-card-display').classList.remove('d-none');
                document.getElementById('nano-card-form-container').classList.add('d-none');

                document.getElementById('nano-card-number').textContent = card.cardNumber;
                document.getElementById('nano-owner-name-display').textContent = card.ownerName;
                document.getElementById('nano-plate-number-display').textContent = card.plateNumber;
                document.getElementById('nano-coating-date').textContent = formatDate(card.coatingDate);
                document.getElementById('nano-expires-at').textContent = formatDate(card.expiresAt);
            } 
            else {
                document.getElementById('nano-card-display').classList.add('d-none');
                document.getElementById('nano-card-form-container').classList.remove('d-none');
                document.getElementById('nano-card-number-form').value = card.cardNumber;
                document.getElementById('nano-owner-name-form').value = card.ownerName || user.username;
            }
            
            nanoCardSection.classList.remove('d-none');
        }

        profileLoading.classList.add('d-none');
        profileContent.classList.remove('d-none');
    };
    
    // Event listener untuk tombol "Edit Data"
    document.getElementById('edit-profile-btn').addEventListener('click', () => {
        if (currentUserData) {
            document.getElementById('edit-profile-username').value = currentUserData.username || '';
            document.getElementById('edit-profile-email').value = currentUserData.email || '';
            document.getElementById('edit-profile-phone').value = currentUserData.phone || '';
        }
    });

    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageDiv = document.getElementById('edit-profile-message');
            messageDiv.innerHTML = '';
            saveProfileButton.disabled = true;
            saveProfileButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Menyimpan...`;

            const updatedData = {
                username: document.getElementById('edit-profile-username').value,
                email: document.getElementById('edit-profile-email').value,
                phone: document.getElementById('edit-profile-phone').value,
            };

            try {
                const response = await fetch('/api/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                    body: JSON.stringify(updatedData)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.msg || 'Gagal menyimpan data.');
                messageDiv.innerHTML = `<div class="alert alert-success">Profil berhasil diperbarui.</div>`;
                setTimeout(() => {
                    messageDiv.innerHTML = '';
                    editProfileModal.hide();
                    fetchProfileData();
                }, 2000);
            } catch (error) {
                messageDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
            } finally {
                saveProfileButton.disabled = false;
                saveProfileButton.innerHTML = 'Simpan Perubahan';
            }
        });
    }

    // ================== KODE BARU DI SINI ==================
    // Event listener untuk tombol "Edit Kartu Nano"
    const editNanoCardBtn = document.getElementById('edit-nanocard-btn');
    if (editNanoCardBtn) {
        editNanoCardBtn.addEventListener('click', () => {
            if (currentUserData && currentUserData.nanoCoatingCard) {
                const card = currentUserData.nanoCoatingCard;
                document.getElementById('edit-nanocard-owner').value = card.ownerName || '';
                document.getElementById('edit-nanocard-plate').value = card.plateNumber || '';
            }
        });
    }

    // Event listener untuk form edit kartu nano
    if (editNanoCardForm) {
        editNanoCardForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageDiv = document.getElementById('edit-nanocard-message');
            messageDiv.innerHTML = '';
            saveNanoCardButton.disabled = true;
            saveNanoCardButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Menyimpan...`;

            const updatedNanoData = {
                ownerName: document.getElementById('edit-nanocard-owner').value,
                plateNumber: document.getElementById('edit-nanocard-plate').value
            };

            try {
                // Menggunakan endpoint yang sudah kita buat sebelumnya
                const response = await fetch('/api/profile/update-nanocard', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                    body: JSON.stringify(updatedNanoData)
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.msg);

                messageDiv.innerHTML = `<div class="alert alert-success">${result.msg}</div>`;
                setTimeout(() => {
                    messageDiv.innerHTML = '';
                    editNanoCardModal.hide();
                    fetchProfileData();
                }, 2000);

            } catch (error) {
                messageDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
            } finally {
                saveNanoCardButton.disabled = false;
                saveNanoCardButton.innerHTML = 'Simpan Perubahan';
            }
        });
    }
    // ================= AKHIR KODE BARU =================
    
    // --- Event Listeners yang Sudah Ada ---
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
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                const result = await response.json();
                if (!response.ok) { throw new Error(result.msg || 'Gagal mengubah password.'); }
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
                setTimeout(() => { fetchProfileData(); }, 2000);
            } catch (error) {
                messageDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
            }
        });
    }

    fetchProfileData();
});
