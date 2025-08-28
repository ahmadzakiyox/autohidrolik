document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://autohidrolik.com'; 
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
            const response = await fetch(`${API_URL}/api/profile`, {
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
                memberCodeSection.innerHTML = `<p class="text-center text-muted p-4">QR code akan muncul setelah pembayaran dikonfirmasi.</p>`;
            } else if (isExpired) {
                memberCodeSection.innerHTML = `<p class="text-center text-danger p-4 fw-bold">Paket telah hangus.</p>`;
            } else {
                memberCodeSection.innerHTML = `<p class="text-center text-muted p-4">Jatah cuci Anda sudah habis.</p>`;
            }

        } else {
            // Display for non-members (no change)
            membershipStatus.innerHTML = `
                <p class="text-muted">Anda saat ini bukan member aktif.</p>
                <a href="/" class="btn btn-primary">Lihat Paket Member</a>
            `;
            memberCodeSection.innerHTML = `
                <p class="text-center text-muted p-4">Beli paket member untuk mendapatkan kode Anda.</p>
            `;
        }

        profileLoading.classList.add('d-none');
        profileContent.classList.remove('d-none');
    };

    fetchProfileData();
});
