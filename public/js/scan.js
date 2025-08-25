// File: /js/scan.js

document.addEventListener('DOMContentLoaded', function () {
    const API_URL = 'https://autohidrolik.com'; // Sesuaikan dengan URL API Anda
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    const barcodeInput = document.getElementById('barcode-input');
    const resultContainer = document.getElementById('result');

    // Keamanan: Hanya admin yang boleh mengakses halaman ini
    if (!token || userRole !== 'admin') {
        alert('Akses ditolak. Anda harus login sebagai admin.');
        window.location.href = '/login';
        return;
    }

    // Pastikan input selalu fokus
    barcodeInput.focus();
    document.body.addEventListener('click', () => barcodeInput.focus());

    // Event listener untuk mendeteksi input dari scanner (saat tombol "Enter" ditekan)
    barcodeInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            const userId = barcodeInput.value.trim();
            if (userId) {
                useWash(userId);
            }
        }
    });

    // Fungsi untuk mengirim permintaan ke API /api/use-wash
    async function useWash(userId) {
        resultContainer.innerHTML = `<div class="alert alert-info">Memproses ID: ${userId}...</div>`;
        barcodeInput.disabled = true; // Nonaktifkan input selama proses

        try {
            const response = await fetch(`${API_URL}/api/use-wash`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ userId: userId })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.msg || 'Gagal memproses permintaan.');
            }

            // Tampilkan pesan sukses
            resultContainer.innerHTML = `
                <div class="alert alert-success">
                    <h5 class="alert-heading">Berhasil!</h5>
                    <p>${result.msg}</p>
                    <hr>
                    <p class="mb-0">Sisa jatah cuci: <strong>${result.remaining}x</strong></p>
                </div>
            `;

        } catch (error) {
            // Tampilkan pesan error
            resultContainer.innerHTML = `
                <div class="alert alert-danger">
                    <h5 class="alert-heading">Error!</h5>
                    <p>${error.message}</p>
                </div>
            `;
        } finally {
            // Kosongkan dan aktifkan kembali input setelah 3 detik
            setTimeout(() => {
                barcodeInput.value = '';
                barcodeInput.disabled = false;
                barcodeInput.focus();
                resultContainer.innerHTML = ''; // Hapus pesan hasil
            }, 3000);
        }
    }
});
