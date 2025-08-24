// File: /js/register.js (REVISED)

document.addEventListener('DOMContentLoaded', () => {
    const step1Div = document.getElementById('step-1');
    const step2Div = document.getElementById('step-2');
    const stepIndicator = document.getElementById('step-indicator');
    
    const initialForm = document.getElementById('initial-register-form');
    const completeProfileForm = document.getElementById('complete-profile-form');

    let registrationData = {};

    // --- LOGIKA UNTUK LANGKAH 1 (Tidak ada perubahan) ---
    initialForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            alert('Password and confirmation do not match!');
            return;
        }

        registrationData.email = email;
        registrationData.username = username;
        registrationData.password = password;

        stepIndicator.textContent = 'Step 2 of 2: Complete Your Profile';
        document.getElementById('email-display').value = email;
        
        step1Div.classList.add('d-none');
        step2Div.classList.remove('d-none');
    });

    // --- LOGIKA UNTUK LANGKAH 2 (Tidak ada perubahan pada tambah/hapus) ---
    const addVehicleBtn = document.getElementById('add-vehicle-btn');
    const vehicleList = document.getElementById('vehicle-list');
    let vehicleCount = 1;

    addVehicleBtn.addEventListener('click', () => {
        vehicleCount++;
        const newVehicleEntry = document.createElement('div');
        newVehicleEntry.className = 'vehicle-entry p-3 mb-3 border rounded';
        newVehicleEntry.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <h6>Kendaraan ${vehicleCount}</h6>
                <button type="button" class="btn-close remove-vehicle-btn"></button>
            </div>
            <div class="row">
                <div class="col-md-6 mb-3"><label class="form-label">Jenis Kendaraan</label><select class="form-select vehicle-type" required><option value="" selected disabled>Pilih Jenis</option><option value="Motor">Motor</option><option value="Mobil Kecil">Mobil Kecil</option><option value="Mobil Sedang">Mobil Sedang</option><option value="Mobil Besar">Mobil Besar</option></select></div>
                <div class="col-md-6 mb-3"><label class="form-label">Merk & Tipe</label><input type="text" class="form-control vehicle-brand" required></div>
            </div>
            <div class="mb-2"><label class="form-label">Nomor Polisi (Nopol)</label><input type="text" class="form-control vehicle-license" required></div>
        `;
        vehicleList.appendChild(newVehicleEntry);
    });

    vehicleList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-vehicle-btn')) {
            e.target.closest('.vehicle-entry').remove();
            vehicleList.querySelectorAll('.vehicle-entry').forEach((entry, index) => {
                entry.querySelector('h6').innerText = `Kendaraan ${index + 1}`;
            });
            vehicleCount = vehicleList.querySelectorAll('.vehicle-entry').length;
        }
    });

    // --- REVISI UTAMA ADA DI SINI ---
    // Saat form final di-submit, kirim data ke server
    completeProfileForm.addEventListener('submit', async (e) => { // Gunakan 'async'
        e.preventDefault();

        // 1. Kumpulkan semua data menjadi satu objek
        const finalUserData = {
            personalData: {
                email: registrationData.email,
                username: registrationData.username,
                password: registrationData.password,
                fullName: document.getElementById('fullName').value,
                phone: document.getElementById('phone').value,
                address: document.getElementById('address').value,
            },
            vehicles: []
        };

        const vehicleEntries = document.querySelectorAll('.vehicle-entry');
        vehicleEntries.forEach(entry => {
            const vehicle = {
                type: entry.querySelector('.vehicle-type').value,
                brand: entry.querySelector('.vehicle-brand').value,
                licensePlate: entry.querySelector('.vehicle-license').value.toUpperCase()
            };
            finalUserData.vehicles.push(vehicle);
        });

        // 2. Kirim data ke backend menggunakan fetch API
        try {
            const response = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(finalUserData),
            });
            
            const result = await response.json();

            if (!response.ok) {
                // Jika server mengembalikan error (misal: email sudah ada)
                throw new Error(result.msg || 'Something went wrong');
            }

            // Jika berhasil
            alert('Registration successful! Your account has been created.');
            window.location.href = '/login.html'; // Arahkan ke halaman login

        } catch (error) {
            // Jika terjadi error (misal: server tidak aktif atau error lainnya)
            console.error('Registration failed:', error);
            alert(`Error: ${error.message}`);
        }
    });
}); 