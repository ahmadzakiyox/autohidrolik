document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000'; // Ensure this URL is correct
    const form = document.getElementById('verify-otp-form');
    const messageDiv = document.getElementById('message');
    const submitButton = document.getElementById('submit-button');
    const resetPasswordSection = document.getElementById('reset-password-section');
    const newPasswordInput = document.getElementById('new-password');

    // Get parameters from the URL to determine the workflow
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action'); // 'reset' or null (for registration)
    
    // --- KEY FIX HERE ---
    // Use 'email' for registration, or 'contact' for password reset
    const contactInfo = action === 'reset' ? urlParams.get('contact') : urlParams.get('email');
    const method = urlParams.get('method');

    // If no contact info (email/phone) is found, stop the process
    if (!contactInfo) {
        messageDiv.innerHTML = `<div class="alert alert-danger">Contact information not found. Please repeat the process from the beginning.</div>`;
        submitButton.disabled = true;
        return;
    }

    // Adjust the form display based on its purpose
    if (action === 'reset') {
        resetPasswordSection.style.display = 'block';
        submitButton.textContent = 'Reset Password';
    } else {
        submitButton.textContent = 'Verify Account';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Verifying...';
        messageDiv.innerHTML = '';

        const otp = document.getElementById('otp').value;
        let apiUrl = '';
        let payload = {};

        // Prepare the data to be sent to the backend
        if (action === 'reset') {
            apiUrl = `${API_URL}/api/reset-password`;
            payload = {
                contact: contactInfo,
                method: method,
                otp: otp,
                newPassword: newPasswordInput.value
            };
        } else {
            apiUrl = `${API_URL}/api/verify-otp`;
            payload = {
                email: contactInfo, // On registration, contactInfo is the email
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

            if (!response.ok) {
                throw new Error(result.msg || 'Verification process failed.');
            }

            messageDiv.innerHTML = `<div class="alert alert-success">${result.msg} You will be redirected...</div>`;

            // Redirect to the login page after 3 seconds
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 3000);

        } catch (error) {
            messageDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
            submitButton.disabled = false;
            submitButton.innerHTML = (action === 'reset') ? 'Reset Password' : 'Verify Account';
        }
    });

    // Logic for resending OTP
    const resendLink = document.getElementById('resend-otp-link');
    resendLink.addEventListener('click', async (e) => {
        e.preventDefault();
        // Logic to resend OTP can be added here
        // For example, by fetching an /api/resend-otp endpoint
        alert('The resend OTP feature has not yet been implemented in the backend.');
    });
});