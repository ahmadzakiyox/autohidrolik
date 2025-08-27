// File: /js/profile.js (Sudah disesuaikan)

document.addEventListener('DOMContentLoaded', () => {
    // Pastikan URL API ini sesuai dengan alamat backend Anda
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
            // Tampilan jika pengguna sudah membeli paket
            membershipStatus.innerHTML = `
                <h5 class="card-title">${user.membership.packageName}</h5>
                <p class="display-4 fw-bold">${user.membership.remainingWashes}x</p>
                <p class="text-muted">Sisa Jatah Pencucian</p>
                <hr>
                <p>Status Pembayaran: 
                    ${user.membership.isPaid 
                        ? '<span class="badge bg-success">Lunas</span>' 
                        : '<span class="badge bg-warning text-dark">Menunggu Konfirmasi</span>'}
                </p>
            `;
            
            if (user.membership.isPaid && user.membership.remainingWashes > 0) {
                // Tampilkan barcode HANYA jika sudah lunas dan jatah masih ada
                memberCodeSection.innerHTML = `
                    <div id="barcode-wrapper">
                        <svg id="barcode-container"></svg>
                    </div>
                    <p class="mt-3 text-muted">Tunjukkan kode ini kepada staf kami.</p>
                `;
                // --- Kode JsBarcode yang sudah disesuaikan ---
               // --- FUNGSI INI YANG DIPERBAIKI ---
                // PASTIKAN MENGGUNAKAN user.memberId
                JsBarcode("#barcode-container", user.memberId, {
                    format: "CODE128",
                    lineColor: "#000",
                    width: 1.5,
                    height: 60,
                    displayValue: true // Tampilkan teks ID juga
                });
            } else if (!user.membership.isPaid) {
                memberCodeSection.innerHTML = `<p class="text-center text-muted p-4">Barcode akan muncul setelah pembayaran dikonfirmasi oleh admin.</p>`;
            } else {
                memberCodeSection.innerHTML = `<p class="text-center text-muted p-4">Jatah cuci Anda sudah habis.</p>`;
            }

        } else {
            // Tampilan untuk non-member
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
