document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000';
    const form = document.getElementById('verify-otp-form');
    const messageDiv = document.getElementById('message');
    const submitButton = document.getElementById('submit-button');
    const resendLink = document.getElementById('resend-otp-link');

    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const contactInfo = action === 'reset' ? urlParams.get('contact') : urlParams.get('email');

    if (!contactInfo) {
        messageDiv.innerHTML = `<div class="alert alert-danger">Informasi kontak tidak ditemukan.</div>`;
        submitButton.disabled = true;
        resendLink.style.display = 'none';
        return;
    }

    // Event listener untuk form verifikasi utama
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        // ... (Logika form submit Anda yang sudah ada)
    });

    // Event listener untuk link "Kirim Ulang OTP"
    resendLink.addEventListener('click', async (e) => {
        e.preventDefault();

        try {
            messageDiv.innerHTML = `<div class="alert alert-info">Mengirim ulang kode OTP...</div>`;
            
            const response = await fetch(`${API_URL}/api/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: contactInfo })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.msg || 'Gagal mengirim ulang OTP.');
            }

            messageDiv.innerHTML = `<div class="alert alert-success">${result.msg}</div>`;
            
            // Mulai cooldown timer setelah berhasil
            startCooldown();

        } catch (error) {
            messageDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
        }
    });

    /**
     * Memulai timer 60 detik untuk menonaktifkan link kirim ulang.
     */
    function startCooldown() {
        let seconds = 60;
        resendLink.style.pointerEvents = 'none'; // Nonaktifkan link
        resendLink.style.color = '#6c757d'; // Jadikan warna abu-abu

        const timer = setInterval(() => {
            seconds--;
            resendLink.textContent = `Kirim Ulang OTP (${seconds}s)`;

            if (seconds <= 0) {
                clearInterval(timer);
                resendLink.style.pointerEvents = 'auto'; // Aktifkan kembali
                resendLink.style.color = 'var(--purple-accent)'; // Kembalikan warna asli
                resendLink.textContent = 'Kirim Ulang OTP';
            }
        }, 1000);
    }
});
