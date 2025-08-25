// File: /js/profile.js

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
                <a href="/login.html" class="btn btn-primary mt-3">Login</a>
            </div>
        `;
        return;
    }

    const fetchProfileData = async () => {
        try {
            const response = await fetch(`${API_URL}/api/profile`, {
                headers: { 'x-auth-token': token }
            });

            if (!response.ok) {
                localStorage.removeItem('token');
                localStorage.removeItem('userRole');
                throw new Error('Sesi tidak valid, silakan login kembali.');
            }

            const user = await response.json();
            displayProfileData(user);

        } catch (error) {
            alert(error.message);
            window.location.href = '/login.html';
        }
    };

    const displayProfileData = (user) => {
        document.getElementById('profile-username').textContent = user.username || '-';
        document.getElementById('profile-email').textContent = user.email || '-';
        document.getElementById('profile-phone').textContent = user.phone || '-';

        // --- REVISI DI SINI ---
        // Membuat data gabungan untuk barcode
        if (user.username && user.email && user.phone) {
            // Gabungkan username, email, dan nomor hp menjadi satu string
            const barcodeData = `${user.username};${user.email};${user.phone}`;
            
            JsBarcode("#barcode-container", barcodeData, {
                format: "CODE128",
                lineColor: "#000",
                width: 1.5, // Sedikit diperkecil agar muat
                height: 80,
                displayValue: false // Teks tidak ditampilkan agar barcode lebih bersih
            });
        }

        // Tampilkan konten setelah semua data dimuat
        if (profileLoading) profileLoading.classList.add('d-none');
        if (profileContent) profileContent.classList.remove('d-none');
    };

    fetchProfileData();
});
