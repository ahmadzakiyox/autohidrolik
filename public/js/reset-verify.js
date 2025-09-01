// File: /public/js/reset-verify.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reset-verify-form');
    const messageDiv = document.getElementById('message');
    const submitButton = document.getElementById('submit-button');

    // Ambil parameter dari URL
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');

    if (!email) {
        messageDiv.innerHTML = `<div class="alert alert-danger">Informasi email tidak ditemukan.</div>`;
        submitButton.disabled = true;
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Mereset...`;
        messageDiv.innerHTML = '';

        const otp = document.getElementById('otp').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (newPassword !== confirmPassword) {
            messageDiv.innerHTML = `<div class="alert alert-danger">Konfirmasi sandi baru tidak cocok.</div>`;
            submitButton.disabled = false;
            submitButton.innerHTML = 'Reset Sandi';
            return;
        }

        try {
            const response = await fetch(`/api/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    otp: otp,
                    newPassword: newPassword
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.msg || 'Gagal mereset sandi.');

            messageDiv.innerHTML = `<div class="alert alert-success">${result.msg} Anda akan dialihkan...</div>`;

            setTimeout(() => {
                window.location.href = '/login.html';
            }, 3000);

        } catch (error) {
            messageDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
            submitButton.disabled = false;
            submitButton.innerHTML = 'Reset Sandi';
        }
    });
});
