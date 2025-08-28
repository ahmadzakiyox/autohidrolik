document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://autohidrolik.com';
    const loginForm = document.getElementById('login-form');
    const loginMessage = document.getElementById('login-message');
    const loginButton = document.getElementById('login-button');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        loginButton.disabled = true;
        loginButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
        loginMessage.innerHTML = '';

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                // Cek flag 'notVerified' dari server
                if (data.notVerified) {
                    alert(data.msg); // Beri tahu user bahwa akun belum aktif
                    // Arahkan ke halaman verifikasi
                    window.location.href = `/verify.html?email=${encodeURIComponent(data.email)}`;
                } else {
                    throw new Error(data.msg || 'Login gagal!');
                }
                // Hentikan proses lebih lanjut jika ada error
                loginButton.disabled = false;
                loginButton.innerHTML = 'Login';
                return;
            }

            loginMessage.innerHTML = `
                <div class="alert alert-success">
                    <strong>Login Berhasil!</strong> Mengarahkan Anda ke halaman...
                </div>
            `;

            localStorage.setItem('token', data.token);
            localStorage.setItem('userRole', data.user.role);
            
            setTimeout(() => {
                if (data.user.role === 'admin') {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/profile.html';
                }
            }, 1500);

        } catch (error) {
            loginMessage.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error!</strong> ${error.message}
                </div>
            `;
            
            loginButton.disabled = false;
            loginButton.innerHTML = 'Login';
        }
    });

    // --- LOGIKA UNTUK INTIP SANDI ---
    const togglePassword = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            // Toggle tipe input
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Toggle ikon mata
            this.classList.toggle('bi-eye-slash-fill');
            this.classList.toggle('bi-eye-fill');
        });
    }
});
