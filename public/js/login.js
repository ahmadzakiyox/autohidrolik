// File: /js/login.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    // Pastikan URL ini sesuai dengan server Render Anda
    const API_URL = 'https://autohidrolik.com/api'; 

    // Cek jika ada parameter ?verified=true di URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
        const messageDiv = document.getElementById('verification-message');
        if (messageDiv) {
            messageDiv.textContent = 'Verifikasi email berhasil! Silakan login.';
            messageDiv.style.display = 'block';
        }
    }

    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.msg || 'Terjadi kesalahan');
            }

            // Simpan token dan role ke localStorage
            localStorage.setItem('token', result.token);
            localStorage.setItem('userRole', result.user.role);

            alert('Login berhasil!');
            
            // Arahkan ke dashboard jika admin, jika tidak ke profil
            if (result.user.role === 'admin') {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/profile.html';
            }

        } catch (error) {
            console.error('Error:', error);
            alert(`Login gagal: ${error.message}`);
        }
    });
});
