// File: /js/login.js

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://autohidrolik.com'; // Sesuaikan dengan URL API Anda
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

            // --- PERBAIKAN DI SINI ---
            // Simpan token DAN role ke Local Storage
            localStorage.setItem('token', data.token);
            localStorage.setItem('userRole', data.user.role);

            alert('Login berhasil!');

            // Arahkan ke halaman yang sesuai berdasarkan role
            if (data.user.role === 'admin') {
                window.location.href = '/admin';
            } else {
                window.location.href = '/profile';
            }

        } catch (error) {
            console.error('Login error:', error);
            alert(`Error: ${error.message}`);
        }
    });
});
