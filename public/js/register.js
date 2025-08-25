// File: /js/register.js

document.addEventListener('DOMContentLoaded', () => {
    // Pastikan URL API ini sesuai dengan alamat backend Anda
    const API_URL = 'https://autohidrolik.com'; 
    const registerForm = document.getElementById('register-form');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            alert('Password dan konfirmasi password tidak cocok!');
            return;
        }

        const userData = {
            username,
            email,
            phone,
            password
        };

        try {
            const response = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });
            
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.msg || 'Terjadi kesalahan saat mendaftar.');
            }

            alert('Pendaftaran berhasil! Akun Anda telah dibuat. Silakan login.');
            window.location.href = '/login.html';

        } catch (error) {
            console.error('Pendaftaran gagal:', error);
            alert(`Error: ${error.message}`);
        }
    });
});
