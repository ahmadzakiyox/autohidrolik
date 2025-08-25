// File: /js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    // Ambil semua elemen menu dari navbar
    const navLogin = document.getElementById('nav-login');
    const navRegister = document.getElementById('nav-register');
    
    const navOrder = document.getElementById('nav-order');
    const navProfile = document.getElementById('nav-profile');
    const navAdmin = document.getElementById('nav-admin');
    const navLogout = document.getElementById('nav-logout');

    if (token) {
        // --- KONDISI JIKA PENGGUNA SUDAH LOGIN ---

        // Sembunyikan tombol Login dan Register
        if (navLogin) navLogin.style.display = 'none';
        if (navRegister) navRegister.style.display = 'none';

        // Tampilkan menu untuk pengguna yang sudah login
        if (navOrder) navOrder.style.display = 'block';
        if (navProfile) navProfile.style.display = 'block';
        if (navLogout) navLogout.style.display = 'block';

        // Tampilkan menu Admin HANYA jika rolenya adalah 'admin'
        if (userRole === 'admin' && navAdmin) {
            navAdmin.style.display = 'block';
        }

    } else {
        // --- KONDISI JIKA PENGGUNA BELUM LOGIN ---

        // Tampilkan tombol Login dan Register
        if (navLogin) navLogin.style.display = 'block';
        if (navRegister) navRegister.style.display = 'block';

        // Sembunyikan menu untuk pengguna yang sudah login
        if (navOrder) navOrder.style.display = 'none';
        if (navProfile) navProfile.style.display = 'none';
        if (navAdmin) navAdmin.style.display = 'none';
        if (navLogout) navLogout.style.display = 'none';
    }

    // --- FUNGSI UNTUK LOGOUT ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Mencegah link berpindah halaman secara default
            
            // Hapus data sesi dari penyimpanan browser
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            
            // Arahkan pengguna ke halaman login
            alert('Anda telah berhasil logout.');
            window.location.href = '/login.html';
        });
    }
});
