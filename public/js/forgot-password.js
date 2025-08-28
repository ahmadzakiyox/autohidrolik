document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000'; // Sesuaikan jika perlu
    const form = document.getElementById('forgot-password-form');
    const messageDiv = document.getElementById('message');
    const submitButton = document.getElementById('submit-button');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Nonaktifkan tombol dan tampilkan loading
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Mengirim...';
        messageDiv.innerHTML = '';

        const contact = document.getElementById('contact').value;
        const method = document.getElementById('method').value;

        try {
            const response = await fetch(`${API_URL}/api/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contact, method })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.msg || 'Gagal mengirim kode OTP.');
            }

            // Tampilkan pesan sukses
            messageDiv.innerHTML = `<div class="alert alert-success">${result.msg} Anda akan dialihkan...</div>`;

            // Arahkan ke halaman verifikasi setelah 3 detik
            setTimeout(() => {
                // Kirim data ke halaman verifikasi melalui URL parameter
                window.location.href = `/verify.html?contact=${encodeURIComponent(contact)}&method=${method}&action=reset`;
            }, 3000);

        } catch (error) {
            messageDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
            // Aktifkan kembali tombol jika gagal
            submitButton.disabled = false;
            submitButton.innerHTML = 'Kirim Kode OTP';
        }
    });
});