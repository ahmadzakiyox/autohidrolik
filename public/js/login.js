// File: /js/login.js (Tanpa API_URL)

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginMessage = document.getElementById('login-message');
    const loginButton = document.getElementById('login-button');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        loginButton.disabled = true;
        loginButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Loading...';
        loginMessage.innerHTML = '';

        const identifier = document.getElementById('identifier').value;
        const password = document.getElementById('password').value;

        try {
            // PERUBAHAN DI SINI: Langsung menggunakan path relatif
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ identifier, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || 'Login gagal!');
            }

            loginMessage.innerHTML = `<div class="alert alert-success"><strong>Login Berhasil!</strong> Mengarahkan...</div>`;

            if (data.token) localStorage.setItem('token', data.token);
            if (data.user && data.user.role) localStorage.setItem('userRole', data.user.role);
            
            setTimeout(() => {
                if (data.user && data.user.role === 'admin') {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/profile.html';
                }
            }, 1500);

        } catch (error) {
            loginMessage.innerHTML = `<div class="alert alert-danger"><strong>Error!</strong> ${error.message}</div>`;
            loginButton.disabled = false;
            loginButton.innerHTML = 'Login';
        }
    });
});
