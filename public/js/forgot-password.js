document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000';
    const form = document.getElementById('forgot-password-form');
    const messageDiv = document.getElementById('message');
    const submitButton = document.getElementById('submit-button');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Mengirim...';
        messageDiv.innerHTML = '';

        const email = document.getElementById('email').value;

        try {
            const response = await fetch(`${API_URL}/api/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.msg || 'Gagal mengirim kode OTP.');
            }

            messageDiv.innerHTML = `<div class="alert alert-success">${result.msg} Anda akan dialihkan...</div>`;

            setTimeout(() => {
                // Arahkan ke halaman verifikasi reset yang baru
                window.location.href = `/reset-verify.html?email=${encodeURIComponent(email)}`;
            }, 3000);

        } catch (error) {
            messageDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
            submitButton.disabled = false;
            submitButton.innerHTML = 'Kirim Kode OTP';
        }
    });
});
