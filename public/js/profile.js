// File: /js/profile.js

document.addEventListener('DOMContentLoaded', () => {
    // --- PERBAIKAN DI SINI ---
    // Ganti 'localhost:3000' dengan URL Render Anda
    const API_URL = 'https://autohidrolik.com/api'; 
    const token = localStorage.getItem('token');

    const profileLoading = document.getElementById('profile-loading');
    const profileContent = document.getElementById('profile-content');

    // --- Keamanan: Cek apakah pengguna sudah login ---
    if (!token) {
        document.querySelector('main').innerHTML = `
            <div class="text-center">
                <h2>Data tidak ditemukan!</h2>
                <p>Silakan login atau register terlebih dahulu.</p>
                <a href="/register.html" class="btn btn-primary">Register</a>
                <a href="/login.html" class="btn btn-secondary">Login</a>
            </div>
        `;
        return;
    }

    // --- Fungsi untuk mengambil data profil dari server ---
    const fetchProfileData = async () => {
        try {
            const response = await fetch(`${API_URL}/profile`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                }
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

    // --- Fungsi untuk menampilkan data DAN membuat QR Code ---
    const displayProfileData = (user) => {
        // Tampilkan data teks
        document.getElementById('profile-username').textContent = user.username;
        document.getElementById('profile-fullname').textContent = user.fullName || '-';
        document.getElementById('profile-email').textContent = user.email;
        document.getElementById('profile-phone').textContent = user.phone || '-';
        document.getElementById('profile-address').textContent = user.address || '-';

        const vehicleListContainer = document.getElementById('profile-vehicle-list');
        vehicleListContainer.innerHTML = '';

        if (user.vehicles && user.vehicles.length > 0) {
            const list = document.createElement('ul');
            list.className = 'list-group';
            user.vehicles.forEach(vehicle => {
                const item = document.createElement('li');
                item.className = 'list-group-item d-flex justify-content-between align-items-center';
                item.innerHTML = `
                    <div>
                        <h6 class="my-0">${vehicle.brand}</h6>
                        <small class="text-muted">${vehicle.licensePlate}</small>
                    </div>
                    <span class="badge bg-primary rounded-pill">${vehicle.type}</span>
                `;
                list.appendChild(item);
            });
            vehicleListContainer.appendChild(list);
        } else {
            vehicleListContainer.innerHTML = '<p class="text-muted">Belum ada kendaraan yang didaftarkan.</p>';
        }

        // --- BUAT QR CODE ---
        const qrContainer = document.getElementById('qrcode-container');
        qrContainer.innerHTML = ''; // Kosongkan container sebelum membuat QR baru
        
        new QRCode(qrContainer, {
            text: JSON.stringify(user, null, 2), // Isi QR code adalah semua data user dalam format JSON
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Tampilkan konten setelah semua data dimuat
        profileLoading.classList.add('d-none');
        profileContent.classList.remove('d-none');
    };

    // Panggil fungsi untuk memulai proses
    fetchProfileData();
});
