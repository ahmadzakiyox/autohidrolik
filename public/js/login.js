// File: /js/login.js (Telah Diperbarui)

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://autohidrolik.com';
    const loginForm = document.getElementById('login-form');
    const loginMessage = document.getElementById('login-message'); // Wadah notifikasi
    const loginButton = document.getElementById('login-button'); // Tombol login

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Nonaktifkan tombol untuk mencegah klik ganda
        loginButton.disabled = true;
        loginButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
        loginMessage.innerHTML = ''; // Kosongkan pesan sebelumnya

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

            // --- Ganti alert() dengan notifikasi inline ---
            loginMessage.innerHTML = `
                <div class="alert alert-success">
                    <strong>Login Berhasil!</strong> Mengarahkan Anda ke halaman...
                </div>
            `;

            // Simpan token dan role ke Local Storage
            localStorage.setItem('token', data.token);
            localStorage.setItem('userRole', data.user.role);
            
            // Beri jeda 1.5 detik sebelum redirect
            setTimeout(() => {
                if (data.user.role === 'admin') {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/profile.html';
                }
            }, 1500);

        } catch (error) {
            // Tampilkan pesan error di wadah notifikasi
            loginMessage.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error!</strong> ${error.message}
                </div>
            `;
            
            // Aktifkan kembali tombol
            loginButton.disabled = false;
            loginButton.innerHTML = 'Login';
        }
    });
});
