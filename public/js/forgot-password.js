document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgot-password-form');
    const messageDiv = document.getElementById('message');
    const submitButton = document.getElementById('submit-button');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Mengirim...';
        messageDiv.innerHTML = '';

        const email = document.getElementById('email').value;

        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }) // Hanya kirim email
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.msg || 'Gagal mengirim kode OTP.');

            messageDiv.innerHTML = `<div class="alert alert-success">${result.msg} Anda akan dialihkan...</div>`;

            setTimeout(() => {
                // Arahkan ke halaman verifikasi dengan membawa email
                window.location.href = `/verify?email=${encodeURIComponent(email)}&action=reset`;
            }, 3000);

        } catch (error) {
            messageDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
            submitButton.disabled = false;
            submitButton.innerHTML = 'Kirim Kode OTP';
        }
    });
});
