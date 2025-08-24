// File: /js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});

function checkLoginStatus() {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    // Ambil semua elemen navigasi
    const navOrder = document.getElementById('nav-order');
    const navProfile = document.getElementById('nav-profile');
    const navAdmin = document.getElementById('nav-admin');
    const navLogin = document.getElementById('nav-login');
    const navRegister = document.getElementById('nav-register');
    const navLogout = document.getElementById('nav-logout');

    if (token) {
        // --- KONDISI SUDAH LOGIN ---
        // Tampilkan menu untuk user yang sudah login
        if (navOrder) navOrder.style.display = 'list-item';
        if (navProfile) navProfile.style.display = 'list-item';
        if (navLogout) navLogout.style.display = 'list-item';

        // Sembunyikan menu untuk user yang belum login
        if (navLogin) navLogin.style.display = 'none';
        if (navRegister) navRegister.style.display = 'none';

        // Tampilkan menu admin HANYA jika rolenya adalah 'admin'
        if (userRole === 'admin' && navAdmin) {
            navAdmin.style.display = 'list-item';
        }

    } else {
        // --- KONDISI BELUM LOGIN ---
        // Sembunyikan menu untuk user yang sudah login
        if (navOrder) navOrder.style.display = 'none';
        if (navProfile) navProfile.style.display = 'none';
        if (navAdmin) navAdmin.style.display = 'none';
        if (navLogout) navLogout.style.display = 'none';

        // Tampilkan menu untuk user yang belum login
        if (navLogin) navLogin.style.display = 'list-item';
        if (navRegister) navRegister.style.display = 'list-item';
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    alert('Anda telah berhasil logout.');
    window.location.href = '/login.html';
}
