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
    
    // Elemen Modal Edit Kartu Nano
    const editNanoCardModal = new bootstrap.Modal(document.getElementById('editNanoCardModal'));
    const editNanoCardForm = document.getElementById('edit-nanocard-form');
    const saveNanoCardButton = document.getElementById('save-nanocard-button');
    
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

        const membershipsContainer = document.getElementById('memberships-container');
        membershipsContainer.innerHTML = ''; 

        if (user.memberships && user.memberships.length > 0) {
            user.memberships.forEach(membership => {
                const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
                const isExpired = new Date() > new Date(membership.expiresAt);

                const card = document.createElement('div');
                card.className = 'card mb-4';
                
                let cardBody = `
                    <div class="card-header d-flex justify-content-between">
                        <h5 class="mb-0">${membership.packageName}</h5>
                        ${membership.isPaid ? '<span class="badge bg-success">Lunas</span>' : '<span class="badge bg-warning text-dark">Menunggu Konfirmasi</span>'}
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-7">
                                <p class="display-4 fw-bold">${membership.remainingWashes}x</p>
                                <p class="text-muted">Sisa Jatah Pencucian</p>
                                <hr>
                                <p><small>Berlaku hingga: <strong>${formatDate(membership.expiresAt)}</strong></small></p>
                                ${isExpired ? '<p class="text-danger fw-bold">Paket sudah kedaluwarsa!</p>' : ''}
                            </div>
                            <div class="col-md-5 text-center d-flex flex-column justify-content-center align-items-center">
                `;

                if (membership.isPaid && !isExpired && membership.remainingWashes > 0) {
                    cardBody += `<div id="qrcode-container-${membership.packageId}" class="mb-2"></div><p class="small text-muted">Tunjukkan kode ini ke staf.</p>`;
                } else {
                    cardBody += `<div class="qr-pending-message small">QR Code akan muncul setelah pembayaran dikonfirmasi.</div>`;
                }

                cardBody += `</div></div></div>`;
                
                card.innerHTML = cardBody;
                membershipsContainer.appendChild(card);
                
                if (membership.isPaid && !isExpired && membership.remainingWashes > 0) {
                    const qrContainer = document.getElementById(`qrcode-container-${membership.packageId}`);
                    const qrData = `${user.memberId};${membership.packageId}`;
                    new QRCode(qrContainer, { text: qrData, width: 128, height: 128 });
                }
            });
        } else {
            membershipsContainer.innerHTML = `<div class="card"><div class="card-body text-center"><p>Anda belum memiliki paket member aktif.</p><a href="/" class="btn btn-primary">Lihat Pilihan Paket</a></div></div>`;
        }
        
        const nanoCardSection = document.getElementById('nano-card-section');
        if (user.nanoCoatingCard && user.nanoCoatingCard.isActive) {
            const card = user.nanoCoatingCard;
            const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            
            document.getElementById('nano-card-number').textContent = card.cardNumber || '-';
            document.getElementById('nano-owner-name-display').textContent = card.ownerName || 'Belum diisi';
            document.getElementById('nano-plate-number-display').textContent = card.plateNumber || 'Belum diisi';
            document.getElementById('nano-coating-date').textContent = formatDate(card.coatingDate);
            document.getElementById('nano-expires-at').textContent = formatDate(card.expiresAt);
            
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

    fetchProfileData();
});
