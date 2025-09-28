// File: /js/login.js (Direvisi)

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginMessage = document.getElementById('login-message');
    const loginButton = document.getElementById('login-button');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        loginButton.disabled = true;
        loginButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
        loginMessage.innerHTML = '';

        // PERUBAHAN DI SINI: Mengambil nilai dari input 'identifier'
        const identifier = document.getElementById('identifier').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                // PERUBAHAN DI SINI: Mengirim 'identifier' ke backend
                body: JSON.stringify({ identifier, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || 'Login gagal!');
            }

            loginMessage.innerHTML = `<div class="alert alert-success"><strong>Login Berhasil!</strong> Mengarahkan...</div>`;

            // Simpan token dan role (jika ada) ke Local Storage
            if (data.token) localStorage.setItem('token', data.token);
            if (data.user && data.user.role) localStorage.setItem('userRole', data.user.role);
            
            setTimeout(() => {
                if (data.user && data.user.role === 'admin') {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/profile.html'; // atau halaman dashboard user
                }
            }, 1500);

        } catch (error) {
            loginMessage.innerHTML = `<div class="alert alert-danger"><strong>Error!</strong> ${error.message}</div>`;
            loginButton.disabled = false;
            loginButton.innerHTML = 'Login';
        }
    });
});
