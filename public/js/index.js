// File: /js/index.js

document.addEventListener('DOMContentLoaded', () => {
    // Pastikan URL API ini sesuai dengan alamat backend Anda
    const API_URL = 'https://autohidrolik.com';
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
     
   // --- LOGIKA UNTUK TOMBOL "BELI PAKET" ---
    const purchaseModalElement = document.getElementById('purchaseModal');
    if (purchaseModalElement) {
        const purchaseModal = new bootstrap.Modal(purchaseModalElement);
        const confirmButton = document.getElementById('confirm-purchase-btn');
        
        // --- Wadah Notifikasi Baru ---
        const purchaseMessage = document.getElementById('purchase-message');
        const purchaseConfirmationContent = document.getElementById('purchase-confirmation-content');

        document.querySelectorAll('.buy-btn').forEach(button => {
            button.addEventListener('click', () => {
                if (!token) {
                    alert('Silakan login terlebih dahulu untuk membeli paket.');
                    window.location.href = '/login';
                    return;
                }
                
                const cardBody = button.closest('.card-body');
                const packageName = cardBody.querySelector('.card-title').textContent.trim();
                const packagePrice = cardBody.querySelector('.price-member').textContent.trim();
                const packageText = cardBody.querySelector('.text-success').textContent;
                
                const washes = packageText.match(/\d+/g);
                const totalWashes = washes ? washes.reduce((sum, val) => sum + parseInt(val), 0) : 0;

                document.getElementById('package-name').textContent = packageName;
                document.getElementById('package-price').textContent = packagePrice;
                
                confirmButton.dataset.packageName = packageName;
                confirmButton.dataset.totalWashes = totalWashes;
                
                // Reset tampilan modal sebelum dibuka
                purchaseMessage.innerHTML = '';
                purchaseConfirmationContent.style.display = 'block';
                confirmButton.disabled = false;
                confirmButton.innerHTML = 'Yakin';

                purchaseModal.show();
            });
        });

        if(confirmButton) {
            confirmButton.addEventListener('click', async () => {
                const packageName = confirmButton.dataset.packageName;
                const totalWashes = parseInt(confirmButton.dataset.totalWashes);

                // Tampilkan status loading
                confirmButton.disabled = true;
                confirmButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Memproses...';
                purchaseConfirmationContent.style.display = 'none'; // Sembunyikan teks konfirmasi awal
                purchaseMessage.innerHTML = ''; // Kosongkan pesan sebelumnya

                try {
                    const response = await fetch(`${API_URL}/api/purchase-membership`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-auth-token': token
                        },
                        body: JSON.stringify({ packageName, totalWashes })
                    });

                    const result = await response.json();
                    if (!response.ok) {
                        throw new Error(result.msg || 'Gagal membeli paket.');
                    }
                    
                    // --- Tampilkan notifikasi SUKSES ---
                    purchaseMessage.innerHTML = `
                        <div class="alert alert-success">
                            <strong>Berhasil!</strong> ${result.msg}
                        </div>
                    `;

                    // Tunggu 3 detik lalu arahkan ke halaman profil
                    setTimeout(() => {
                        purchaseModal.hide();
                        window.location.href = '/profile';
                    }, 3000);

                } catch (error) {
                    // --- Tampilkan notifikasi GAGAL ---
                    purchaseMessage.innerHTML = `
                        <div class="alert alert-danger">
                            <strong>Error!</strong> ${error.message}
                        </div>
                    `;
                    
                    // Aktifkan kembali tombol setelah beberapa saat
                    setTimeout(() => {
                        confirmButton.disabled = false;
                        confirmButton.innerHTML = 'Yakin';
                        purchaseConfirmationContent.style.display = 'block';
                        purchaseMessage.innerHTML = '';
                    }, 3000);
                }
            });
        }
    }
    
    // --- 1. LOGIKA UNTUK MENGATUR NAVBAR ---
    const setupNavbar = () => {
        const navLogin = document.getElementById('nav-login');
        const navRegister = document.getElementById('nav-register');
        const navOrder = document.getElementById('nav-order');
        const navProfile = document.getElementById('nav-profile');
        const navAdmin = document.getElementById('nav-admin');
        const navLogout = document.getElementById('nav-logout');
        const addReviewSection = document.getElementById('add-review-section');

        if (token) {
            // Pengguna sudah login
            if (navLogin) navLogin.style.display = 'none';
            if (navRegister) navRegister.style.display = 'none';
            if (navOrder) navOrder.style.display = 'block';
            if (navProfile) navProfile.style.display = 'block';
            if (navLogout) navLogout.style.display = 'block';
            if (addReviewSection) addReviewSection.style.display = 'block'; // Tampilkan form review

            if (userRole === 'admin' && navAdmin) {
                navAdmin.style.display = 'block';
            }
        } else {
            // Pengguna belum login
            if (navLogin) navLogin.style.display = 'block';
            if (navRegister) navRegister.style.display = 'block';
            if (navOrder) navOrder.style.display = 'none';
            if (navProfile) navProfile.style.display = 'none';
            if (navAdmin) navAdmin.style.display = 'none';
            if (navLogout) navLogout.style.display = 'none';
            if (addReviewSection) addReviewSection.style.display = 'none'; // Sembunyikan form review
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('userRole');
                alert('Anda telah berhasil logout.');
                window.location.href = '/login.html';
            });
        }
    };
    
    // --- 2. LOGIKA UNTUK MENAMPILKAN ULASAN ---
    const fetchReviews = async () => {
        const reviewList = document.getElementById('review-list');
        if (!reviewList) return;

        try {
            const response = await fetch(`${API_URL}/api/reviews`); // Asumsi endpoint ini ada
            if (!response.ok) throw new Error('Gagal memuat ulasan.');
            
            const reviews = await response.json();
            reviewList.innerHTML = ''; // Kosongkan daftar

            if (reviews.length === 0) {
                reviewList.innerHTML = '<p class="text-center text-muted">Belum ada ulasan.</p>';
                return;
            }

            reviews.forEach((review, index) => {
                const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
                const carouselItem = document.createElement('div');
                carouselItem.className = `carousel-item ${index === 0 ? 'active' : ''}`;
                carouselItem.innerHTML = `
                    <div class="d-flex justify-content-center">
                        <div class="card p-4 text-center" style="max-width: 700px;">
                            <div class="card-body">
                                <div class="stars mb-3">${stars}</div>
                                <p class="card-text fst-italic">"${review.comment}"</p>
                                <h5 class="mt-4 fw-bold">- ${review.user ? review.user.username : 'Anonim'}</h5>
                            </div>
                        </div>
                    </div>
                `;
                reviewList.appendChild(carouselItem);
            });

        } catch (error) {
            console.error('Error fetching reviews:', error);
            reviewList.innerHTML = '<p class="text-center text-danger">Tidak dapat memuat ulasan saat ini.</p>';
        }
    };
    
    // --- 3. LOGIKA UNTUK MENGIRIM ULASAN BARU ---
    const addReviewForm = document.getElementById('add-review-form');
    if (addReviewForm) {
        addReviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!token) {
                alert('Anda harus login untuk memberikan ulasan.');
                window.location.href = '/login.html';
                return;
            }

            const rating = document.getElementById('rating').value;
            const comment = document.getElementById('comment').value;

            try {
                const response = await fetch(`${API_URL}/api/reviews`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token
                    },
                    body: JSON.stringify({ rating, comment })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.msg || 'Gagal mengirim ulasan.');
                }

                alert('Ulasan Anda berhasil dikirim!');
                addReviewForm.reset();
                fetchReviews(); // Muat ulang daftar ulasan

            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });
    }

    // --- 5. EFEK VISUAL (SCROLL & FADE-IN) ---
    const nav = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('navbar-scrolled');
        } else {
            nav.classList.remove('navbar-scrolled');
        }
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in-section').forEach(section => {
        observer.observe(section);
    });
     
    // --- PANGGIL SEMUA FUNGSI INISIALISASI ---
    setupNavbar();
    fetchReviews();
});
