document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    
    // UI Elements
    const navOrder = document.getElementById('nav-order');
    const navProfile = document.getElementById('nav-profile');
    const navAdmin = document.getElementById('nav-admin');
    const navLogin = document.getElementById('nav-login');
    const navRegister = document.getElementById('nav-register');
    const navLogout = document.getElementById('nav-logout');
    const logoutBtn = document.getElementById('logout-btn');

    // Profile Form
    const profileForm = document.getElementById('profile-form');
    
    // Order Form
    const orderForm = document.getElementById('order-form');
    const serviceSelect = document.getElementById('service');
    const priceInput = document.getElementById('price');
    const qrCodeContainer = document.getElementById('qr-code-container');
    const qrcodeDiv = document.getElementById('qrcode');
    const downloadQRBtn = document.getElementById('download-qr');


    const updateNav = async () => {
        if (token) {
            navLogin.style.display = 'none';
            navRegister.style.display = 'none';
            navOrder.style.display = 'block';
            navProfile.style.display = 'block';
            navLogout.style.display = 'block';
            
            // Check if user is admin
            try {
                const res = await fetch('/api/profile', {
                    headers: { 'x-auth-token': token }
                });
                const user = await res.json();
                if (user.email === 'admin@carwash.com') { // Hardcoded admin
                    navAdmin.style.display = 'block';
                }
            } catch (error) {
                console.error('Error fetching profile for admin check', error);
            }

        } else {
            navLogin.style.display = 'block';
            navRegister.style.display = 'block';
            navOrder.style.display = 'none';
            navProfile.style.display = 'none';
            navAdmin.style.display = 'none';
            navLogout.style.display = 'none';
        }
    };
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
        });
    }
    
    // Load Profile Data
    const loadProfile = async () => {
        if (!token) {
            window.location.href = '/login.html';
            return;
        }
        try {
            const res = await fetch('/api/profile', {
                method: 'GET',
                headers: { 'x-auth-token': token },
            });
            const data = await res.json();
            if(res.ok) {
                document.getElementById('profile-username').value = data.username;
                document.getElementById('profile-email').value = data.email;
            } else {
                 throw new Error(data.msg);
            }
        } catch (err) {
            console.error(err);
            localStorage.removeItem('token');
            window.location.href = '/login.html';
        }
    };

    if (profileForm) {
        loadProfile();
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('profile-username').value;
            const email = document.getElementById('profile-email').value;

            try {
                const res = await fetch('/api/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token,
                    },
                    body: JSON.stringify({ username, email }),
                });
                 const data = await res.json();
                 if (res.ok) {
                     alert('Profile updated successfully!');
                 } else {
                     alert(data.msg || 'Update failed');
                 }
            } catch (err) {
                alert('An error occurred.');
            }
        });
    }

    // Handle Order Form
    if (orderForm) {
        if (!token) {
            alert('Silakan login untuk membuat pesanan.');
            window.location.href = '/login.html';
        }

        serviceSelect.addEventListener('change', () => {
            const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
            const price = selectedOption.getAttribute('data-price');
            priceInput.value = price ? `Rp ${parseInt(price).toLocaleString('id-ID')}` : '';
        });

        orderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];

            const orderData = {
                customerName: document.getElementById('customerName').value,
                plateNumber: document.getElementById('plateNumber').value,
                vehicleBrand: document.getElementById('vehicleBrand').value,
                vehicleCategory: document.getElementById('vehicleCategory').value,
                service: selectedOption.value,
                price: parseInt(selectedOption.getAttribute('data-price'))
            };

            try {
                const res = await fetch('/api/orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token
                    },
                    body: JSON.stringify(orderData)
                });

                const savedOrder = await res.json();

                if (res.ok) {
                    alert('Pesanan berhasil dibuat!');
                    qrCodeContainer.style.display = 'block';
                    qrcodeDiv.innerHTML = ''; // Clear previous QR
                    
                    const qrData = JSON.stringify({
                        orderId: savedOrder._id,
                        customer: savedOrder.customerName,
                        plate: savedOrder.plateNumber,
                        service: savedOrder.service
                    });

                    new QRCode(qrcodeDiv, {
                        text: qrData,
                        width: 200,
                        height: 200,
                    });
                    
                    orderForm.reset();
                    priceInput.value = '';
                } else {
                    alert(savedOrder.msg || 'Gagal membuat pesanan.');
                }

            } catch (err) {
                console.error(err);
                alert('Terjadi kesalahan pada server.');
            }
        });
        
        // Download QR Code
        downloadQRBtn.addEventListener('click', () => {
            const canvas = qrcodeDiv.querySelector('canvas');
            const link = document.createElement('a');
            link.download = `order-qrcode-${document.getElementById('plateNumber').value}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    }

    // Initialize
    updateNav();
});