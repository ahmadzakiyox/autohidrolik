// File: /js/profile.js

document.addEventListener('DOMContentLoaded', () => {
    // Ambil data pengguna dari Local Storage
    const userDataString = localStorage.getItem('loggedInUser');
    
    if (!userDataString) {
        // Jika tidak ada data, tampilkan pesan dan redirect
        document.body.innerHTML = `
            <div class="container text-center mt-5">
                <h2>Data tidak ditemukan!</h2>
                <p>Silakan login atau register terlebih dahulu.</p>
                <a href="/register.html" class="btn btn-primary">Register</a>
                <a href="/login.html" class="btn btn-secondary">Login</a>
            </div>
        `;
        return;
    }

    // Ubah data dari string JSON menjadi object
    const userData = JSON.parse(userDataString);

    // 1. Tampilkan Data Personal
    document.getElementById('profile-name').textContent = userData.personalData.fullName;
    document.getElementById('profile-email').textContent = userData.personalData.email;
    document.getElementById('profile-phone').textContent = userData.personalData.phone;
    document.getElementById('profile-address').textContent = userData.personalData.address;

    // 2. Tampilkan Daftar Kendaraan
    const vehicleListContainer = document.getElementById('profile-vehicle-list');
    if (userData.vehicles && userData.vehicles.length > 0) {
        let vehicleHtml = '<ul class="list-group list-group-flush">';
        userData.vehicles.forEach(vehicle => {
            vehicleHtml += `
                <li class="list-group-item">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${vehicle.brand}</h6>
                        <small>${vehicle.type}</small>
                    </div>
                    <p class="mb-1"><strong>${vehicle.licensePlate}</strong></p>
                </li>
            `;
        });
        vehicleHtml += '</ul>';
        vehicleListContainer.innerHTML = vehicleHtml;
    } else {
        vehicleListContainer.innerHTML = '<p class="text-muted">Tidak ada kendaraan terdaftar.</p>';
    }

    // 3. Buat QR Code
    const qrContainer = document.getElementById('qrcode-container');
    // Hapus QR Code lama jika ada
    qrContainer.innerHTML = ''; 
    
    new QRCode(qrContainer, {
        text: JSON.stringify(userData, null, 2), // Mengubah object utuh menjadi teks JSON untuk di-scan
        width: 200,
        height: 200,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
});