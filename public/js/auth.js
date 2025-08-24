document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');

    // Handle Registration
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Hapus pesan alert sebelumnya jika ada
            const existingAlert = registerForm.querySelector('.alert');
            if (existingAlert) existingAlert.remove();

            try {
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password }),
                });

                const data = await res.json();
                const alert = document.createElement('div');
                alert.textContent = data.msg;

                if (res.ok) {
                    alert.className = 'alert alert-success mt-3';
                    registerForm.reset(); // Kosongkan form jika berhasil
                } else {
                    alert.className = 'alert alert-danger mt-3';
                }
                registerForm.appendChild(alert);

            } catch (err) {
                console.error(err);
                alert('Terjadi kesalahan. Silakan coba lagi.');
            }
        });
    }

    // Handle Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

             // Hapus pesan alert sebelumnya jika ada
            const existingAlert = loginForm.querySelector('.alert');
            if (existingAlert) existingAlert.remove();

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });

                const data = await res.json();
                if (res.ok) {
    localStorage.setItem('token', data.token);

    // -- LOGIKA PENGALIHAN BERDASARKAN ROLE --
    if (data.user.role === 'admin') {
        window.location.href = '/admin.html'; // Arahkan admin ke dashboard
    } else {
        window.location.href = '/'; // Arahkan user biasa ke halaman utama
    }
    // -----------------------------------------

} else {
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger mt-3';
    alert.textContent = data.msg || 'Login failed';
    // Hapus alert lama sebelum menambahkan yang baru
    const existingAlert = loginForm.querySelector('.alert');
    if(existingAlert) existingAlert.remove();
    loginForm.appendChild(alert);
}
            } catch (err) {
                console.error(err);
                alert('An error occurred.');
            }
        });
    }
});