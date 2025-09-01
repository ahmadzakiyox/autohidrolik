document.addEventListener('DOMContentLoaded', () => {
    // Gunakan path relatif agar konsisten dengan lokasi server
    const API_URL = 'https://autohidrolik.com'; 
    const registerForm = document.getElementById('register-form');
    
    // Siapkan elemen untuk notifikasi
    let messageDiv = document.getElementById('register-message');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'register-message';
        messageDiv.className = 'mb-3';
        registerForm.prepend(messageDiv);
    }

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageDiv.innerHTML = ''; // Kosongkan pesan sebelumnya

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            messageDiv.innerHTML = `<div class="alert alert-danger">Konfirmasi password tidak cocok!</div>`;
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, phone, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || 'Registrasi gagal!');
            }
            
            // --- PERUBAHAN UTAMA DI SINI ---
            // Pesan diubah dan pengalihan dipastikan ke login.html
            messageDiv.innerHTML = `<div class="alert alert-success">Registrasi berhasil! Anda akan dialihkan ke halaman login...</div>`;

            setTimeout(() => {
                // Mengarahkan langsung ke halaman login.html
                window.location.href = '/login.html';
            }, 2000);

        } catch (error) {
            messageDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        }
    });
});
