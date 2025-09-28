document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginMessage = document.getElementById('login-message');
    const loginButton = document.getElementById('login-button');

    loginForm.addEventListener('submit', async (e) => {
        // Mencegah form mengirim data secara tradisional
        e.preventDefault();
        
        // Memberikan feedback visual saat proses login berjalan
        loginButton.disabled = true;
        loginButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
        loginMessage.innerHTML = '';

        // Mengambil nilai dari input 'identifier' (bisa email atau nomor hp)
        const identifier = document.getElementById('identifier').value;
        const password = document.getElementById('password').value;

        try {
            // Mengirim permintaan ke server menggunakan path relatif
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ identifier, password })
            });

            // Mengambil data respons dari server
            const data = await response.json();

            // Jika server merespons dengan status error (misal: 400, 401)
            if (!response.ok) {
                // Lemparkan error dengan pesan dari server
                throw new Error(data.msg || 'Login gagal!');
            }

            // Jika login berhasil
            loginMessage.innerHTML = `<div class="alert alert-success"><strong>Login Berhasil!</strong> Mengarahkan...</div>`;

            // Simpan token dan role pengguna ke Local Storage browser
            // Ini penting untuk autentikasi di halaman lain (seperti admin dashboard)
            if (data.token) {
                localStorage.setItem('token', data.token);
            }
            if (data.user && data.user.role) {
                localStorage.setItem('userRole', data.user.role);
            }
            
            // Beri jeda sejenak lalu arahkan pengguna ke halaman yang sesuai
            setTimeout(() => {
                if (data.user && data.user.role === 'admin') {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/profile.html'; // atau halaman dashboard user
                }
            }, 1500);

        } catch (error) {
            // Jika terjadi error (dari server atau jaringan)
            loginMessage.innerHTML = `<div class="alert alert-danger"><strong>Error!</strong> ${error.message}</div>`;
            // Kembalikan tombol ke keadaan semula
            loginButton.disabled = false;
            loginButton.innerHTML = 'Login';
        }
    });
});
