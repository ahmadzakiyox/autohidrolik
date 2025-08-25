// File: /js/admin.js
document.addEventListener('DOMContentLoaded', () => {
    // Pastikan URL API ini sesuai dengan alamat backend Anda
    const API_URL = 'https://autohidrolik.com'; 
    const token = localStorage.getItem('token');
    const userTableBody = document.getElementById('user-table-body');

    if (!token) {
        alert('Akses ditolak. Silakan login sebagai admin.');
        window.location.href = '/login';
        return;
    }

    // Fungsi utama untuk mengambil data semua pengguna dari server
    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/users`, {
                headers: { 'x-auth-token': token }
            });
            if (!response.ok) {
                throw new Error('Gagal mengambil data pengguna. Sesi mungkin telah berakhir.');
            }
            
            const users = await response.json();
            displayUsers(users);
        } catch (error) {
            console.error(error);
            userTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${error.message}</td></tr>`;
        }
    };

    // Fungsi untuk menampilkan data pengguna ke dalam tabel HTML
    const displayUsers = (users) => {
        userTableBody.innerHTML = ''; // Kosongkan tabel sebelum diisi ulang
        
        users.forEach(user => {
            const row = document.createElement('tr');

            // Logika untuk menentukan status member dan pembayaran
            let membershipStatus = '<span class="text-muted">Non-Member</span>';
            let paymentStatus = '-';
            let actionButton = ''; // Tombol aksi, default-nya kosong

            if (user.membership) {
                // Jika pengguna adalah member
                membershipStatus = user.membership.packageName;
                
                if (user.membership.isPaid) {
                    paymentStatus = '<span class="badge bg-success">Sudah Bayar</span>';
                } else {
                    paymentStatus = '<span class="badge bg-warning text-dark">Belum Bayar</span>';
                    // Tambahkan tombol konfirmasi HANYA jika belum bayar
                    actionButton = `<button class="btn btn-sm btn-info confirm-payment-btn" data-userid="${user._id}">Konfirmasi</button>`;
                }
            }

            // Isi baris tabel dengan data
            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${membershipStatus}</td>
                <td>${paymentStatus}</td>
                <td>${actionButton}</td>
            `;

            userTableBody.appendChild(row);
        });

        // Tambahkan event listener ke semua tombol konfirmasi yang baru dibuat
        document.querySelectorAll('.confirm-payment-btn').forEach(button => {
            button.addEventListener('click', handleConfirmPayment);
        });
    };

    // Fungsi yang dijalankan saat tombol "Konfirmasi" diklik
    const handleConfirmPayment = async (event) => {
        const button = event.target;
        const userId = button.dataset.userid;

        if (!confirm(`Anda yakin ingin mengonfirmasi pembayaran untuk pengguna ini?`)) {
            return;
        }

        button.disabled = true; // Nonaktifkan tombol untuk mencegah klik ganda
        button.textContent = 'Memproses...';

        try {
            const response = await fetch(`${API_URL}/api/confirm-payment/${userId}`, {
                method: 'POST',
                headers: { 'x-auth-token': token }
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.msg || 'Gagal mengonfirmasi pembayaran.');
            }

            alert(result.msg);
            fetchUsers(); // Muat ulang data tabel untuk memperbarui status

        } catch (error) {
            alert(`Error: ${error.message}`);
            button.disabled = false; // Aktifkan kembali tombol jika gagal
            button.textContent = 'Konfirmasi';
        }
    };

    // Panggil fungsi utama untuk memuat data saat halaman dibuka
    fetchUsers();
});
