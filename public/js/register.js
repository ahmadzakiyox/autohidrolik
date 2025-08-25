// File: /js/register.js (REVISED)

document.addEventListener('DOMContentLoaded', () => {
    // Pastikan API_URL didefinisikan di file config.js atau di sini
    const API_URL = 'https://autohidrolik.com/api'; 
    const registerForm = document.getElementById('register-form');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Validasi password
        if (password !== confirmPassword) {
            alert('Password dan konfirmasi password tidak cocok!');
            return;
        }

        // Siapkan data untuk dikirim ke backend
        const userData = {
            username,
            email,
            phone,
            password
        };

        try {
            // Kirim data ke server
            const response = await fetch(`${API_URL}/auth/register`, { // Pastikan endpoint API sudah benar
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });
            
            const result = await response.json();

            if (!response.ok) {
                // Jika server memberikan pesan error (misal: email sudah terdaftar)
                throw new Error(result.message || 'Terjadi kesalahan saat mendaftar.');
            }

            // Jika pendaftaran berhasil
            alert('Pendaftaran berhasil! Akun Anda telah dibuat. Silakan login.');
            window.location.href = '/login.html'; // Arahkan ke halaman login

        } catch (error) {
            // Jika terjadi error koneksi atau error dari server
            console.error('Pendaftaran gagal:', error);
            alert(`Error: ${error.message}`);
        }
    });
});
