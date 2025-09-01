/**
 * Fungsi ini membuat header HTTP yang diperlukan untuk otentikasi.
 * Panggil fungsi ini setiap kali Anda menggunakan fetch() ke API yang aman.
 * @returns {Object} - Objek header untuk fetch().
 */
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['x-auth-token'] = token;
    }
    return headers;
}

/**
 * Fungsi ini memeriksa status login pengguna (berdasarkan token)
 * dan menyesuaikan elemen UI di navbar dan halaman.
 */
function checkLoginStatus() {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    // Ambil semua elemen menu yang mungkin ada
    const navLogin = document.getElementById('nav-login');
    const navRegister = document.getElementById('nav-register');
    const navProfile = document.getElementById('nav-profile');
    const navAdmin = document.getElementById('nav-admin');
    const navLogout = document.getElementById('nav-logout');
    const addReviewSection = document.getElementById('add-review-section');

    if (token) {
        // --- KONDISI JIKA PENGGUNA SUDAH LOGIN ---
        if (navLogin) navLogin.style.display = 'none';
        if (navRegister) navRegister.style.display = 'none';

        if (navProfile) navProfile.style.display = 'block';
        if (navLogout) navLogout.style.display = 'block';
        if (addReviewSection) addReviewSection.style.display = 'block';

        // Tampilkan menu Admin HANYA jika rolenya adalah 'admin'
        if (userRole === 'admin' && navAdmin) {
            navAdmin.style.display = 'block';
        } else if (navAdmin) {
            navAdmin.style.display = 'none';
        }

    } else {
        // --- KONDISI JIKA PENGGUNA BELUM LOGIN ---
        if (navLogin) navLogin.style.display = 'block';
        if (navRegister) navRegister.style.display = 'block';

        if (navProfile) navProfile.style.display = 'none';
        if (navAdmin) navAdmin.style.display = 'none';
        if (navLogout) navLogout.style.display = 'none';
        if (addReviewSection) addReviewSection.style.display = 'none';
    }
}

// --- Event Listener Utama ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cek status login dan sesuaikan UI saat halaman dimuat
    checkLoginStatus();

    // 2. Tambahkan fungsi untuk tombol logout
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Hapus token dan role dari localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            
            // Arahkan ke halaman login
            window.location.href = '/login.html';
        });
    }
});

