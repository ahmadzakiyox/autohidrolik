document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('verify-otp-form');
    const messageDiv = document.getElementById('message');
    const submitButton = document.getElementById('submit-button');
    const resetPasswordSection = document.getElementById('reset-password-section');
    const newPasswordInput = document.getElementById('new-password');

    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const contactInfo = action === 'reset' ? urlParams.get('contact') : urlParams.get('email');
    const method = urlParams.get('method');

    if (!contactInfo) {
        messageDiv.innerHTML = `<div class="alert alert-danger">Informasi kontak tidak ditemukan. Silakan ulangi proses dari awal.</div>`;
        submitButton.disabled = true;
        return;
    }

    if (action === 'reset') {
        resetPasswordSection.style.display = 'block';
        submitButton.textContent = 'Reset Sandi';
    } else {
        submitButton.textContent = 'Verifikasi Akun';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Memverifikasi...';
        messageDiv.innerHTML = '';

        const otp = document.getElementById('otp').value;
        let apiUrl = '';
        let payload = {};

        if (action === 'reset') {
            apiUrl = '/api/reset-password'; // URL API diperbaiki
            payload = {
                contact: contactInfo,
                method: method,
                otp: otp,
                newPassword: newPasswordInput.value
            };
        } else {
            apiUrl = '/api/verify-otp'; // URL API diperbaiki
            payload = {
                email: contactInfo,
                otp: otp
            };
        }

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.msg || 'Proses verifikasi gagal.');

            messageDiv.innerHTML = `<div class="alert alert-success">${result.msg} Anda akan dialihkan...</div>`;

            setTimeout(() => {
                window.location.href = '/login'; // Redirect ke halaman login
            }, 3000);

        } catch (error) {
            messageDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
            submitButton.disabled = false;
            submitButton.innerHTML = (action === 'reset') ? 'Reset Sandi' : 'Verifikasi Akun';
        }
    });

    const resendLink = document.getElementById('resend-otp-link');
    resendLink.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Fitur kirim ulang OTP belum diimplementasikan.');
    });
});
