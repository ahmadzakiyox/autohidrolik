// File: /js/login.js

document.addEventListener('DOMContentLoaded', () => {
    // Pastikan URL API ini sesuai dengan alamat backend Anda
    const API_URL = 'https://autohidrolik.com/';
    const loginForm = document.getElementById('login-form');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || 'Login gagal!');
            }

            // Simpan token dan role ke Local Storage
            localStorage.setItem('token', data.token);
            localStorage.setItem('userRole', data.user.role);

            alert('Login berhasil!');

            // Arahkan ke halaman yang sesuai berdasarkan role
            if (data.user.role === 'admin') {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/profile.html';
            }

        } catch (error) {
            console.error('Login error:', error);
            alert(`Error: ${error.message}`);
        }
    });
});
