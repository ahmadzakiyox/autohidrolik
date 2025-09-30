document.addEventListener('DOMContentLoaded', () => {
    // ======================================================
    // --- KONFIGURASI & VARIABEL GLOBAL ---
    // ======================================================
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    // ======================================================
    // --- FUNGSI UTAMA ---
    // ======================================================

    /**
     * Mengatur tampilan navbar berdasarkan status login pengguna.
     */
    const setupNavbar = () => {
        const navLogin = document.getElementById('nav-login');
        const navRegister = document.getElementById('nav-register');
        const navProfile = document.getElementById('nav-profile');
        const navAdmin = document.getElementById('nav-admin');
        const navLogout = document.getElementById('nav-logout');
        const addReviewSection = document.getElementById('add-review-section');

        if (token) {
            // Pengguna sudah login
            if (navLogin) navLogin.style.display = 'none';
            if (navRegister) navRegister.style.display = 'none';
            if (navProfile) navProfile.style.display = 'block';
            if (navLogout) navLogout.style.display = 'block';
            if (addReviewSection) addReviewSection.style.display = 'block';

            if (userRole === 'admin' && navAdmin) {
                navAdmin.style.display = 'block';
            }
        } else {
            // Pengguna belum login
            if (navLogin) navLogin.style.display = 'block';
            if (navRegister) navRegister.style.display = 'block';
            if (navProfile) navProfile.style.display = 'none';
            if (navAdmin) navAdmin.style.display = 'none';
            if (navLogout) navLogout.style.display = 'none';
            if (addReviewSection) addReviewSection.style.display = 'none';
        }

        document.getElementById('logout-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            alert('Anda telah berhasil logout.');
            window.location.href = '/login.html';
        });
    };
    
    /**
     * Menambahkan tagline promo dan masa berlaku ke kartu paket.
     */
    const setupPackagePromos = () => {
        document.querySelectorAll('.card.h-100').forEach(card => {
            const titleElement = card.querySelector('.card-title');
            if (!titleElement) return;
            
            // Tambahkan Tagline Promo
            if (titleElement.textContent.includes('Paket Kombinasi')) {
                const promoTag = document.createElement('span');
                promoTag.className = 'badge bg-danger mb-2';
                promoTag.textContent = 'Promo Terlaris!';
                titleElement.insertAdjacentElement('afterend', promoTag);
            }

            // --- PERBAIKAN DI BARIS INI ---
            // Tambahkan Masa Berlaku
            const validityInfo = document.createElement('p');
            validityInfo.className = 'small mt-2'; // Class 'text-muted' telah dihapus
            validityInfo.innerHTML = '<i class="bi bi-clock"></i> Berlaku selama 3 bulan';
            card.querySelector('.buy-btn')?.insertAdjacentElement('beforebegin', validityInfo);
        });
    };

    /**
     * Mengambil dan menampilkan ulasan dari API.
     */
    const fetchReviews = async () => {
        const reviewList = document.getElementById('review-list');
        if (!reviewList) return;

        try {
            const response = await fetch(`/api/reviews`);
            if (!response.ok) throw new Error('Gagal memuat ulasan.');
            
            const reviews = await response.json();
            reviewList.innerHTML = ''; 

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
                                <div class="stars mb-3" style="color: #ffc107;">${stars}</div>
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
    
    /**
     * Mengatur logika untuk form tambah ulasan.
     */
    const setupReviewForm = () => {
        const addReviewForm = document.getElementById('add-review-form');
        if (!addReviewForm) return;

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
                const response = await fetch(`/api/reviews`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                    body: JSON.stringify({ rating, comment })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.msg || 'Gagal mengirim ulasan.');
                }

                alert('Ulasan Anda berhasil dikirim!');
                addReviewForm.reset();
                fetchReviews();

            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });
    };

    /**
     * Mengatur logika untuk modal pembelian paket.
     */
const setupPurchaseModal = () => {
    const purchaseModalElement = document.getElementById('purchaseModal');
    if (!purchaseModalElement) return;

    const purchaseModal = new bootstrap.Modal(purchaseModalElement);
    const confirmButton = document.getElementById('confirm-purchase-btn');
    const purchaseMessage = document.getElementById('purchase-message');
    const purchaseConfirmationContent = document.getElementById('purchase-confirmation-content');

    // Menggunakan event delegation untuk menangani semua tombol .buy-btn
    document.body.addEventListener('click', (e) => {
        // Hanya lanjutkan jika yang diklik adalah elemen dengan class 'buy-btn'
        if (!e.target.classList.contains('buy-btn')) {
            return;
        }
        
        const button = e.target;

        if (!token) {
            alert('Silakan login terlebih dahulu untuk membeli paket.');
            window.location.href = '/login';
            return;
        }
        
        let packageName, packagePrice, totalWashes;

        // Cek apakah tombol memiliki data-package-name (untuk tombol di modal baru)
        if (button.dataset.packageName) {
            packageName = button.dataset.packageName;
            const priceNumber = parseInt(button.dataset.packagePrice, 10);
            packagePrice = `Rp ${priceNumber.toLocaleString('id-ID')}`;
            totalWashes = parseInt(button.dataset.totalWashes, 10);
        } 
        // Logika fallback untuk tombol di kartu lama
        else {
            const cardBody = button.closest('.card-body');
            packageName = cardBody.querySelector('.card-title').textContent.trim();
            packagePrice = cardBody.querySelector('.price-member').textContent.trim();
            const packageText = cardBody.querySelector('.text-success')?.textContent || '';
            const washes = packageText.match(/\d+/g);
            totalWashes = washes ? washes.reduce((sum, val) => sum + parseInt(val), 0) : 0;
        }

        // Mengisi modal konfirmasi dengan data yang benar
        document.getElementById('package-name').textContent = packageName;
        document.getElementById('package-price').textContent = packagePrice;
        
        confirmButton.dataset.packageName = packageName;
        confirmButton.dataset.totalWashes = totalWashes;
        
        // Mereset tampilan modal konfirmasi
        purchaseMessage.innerHTML = '';
        purchaseConfirmationContent.style.display = 'block';
        confirmButton.disabled = false;
        confirmButton.innerHTML = 'Yakin';

        purchaseModal.show();
    });

    if(confirmButton) {
        confirmButton.addEventListener('click', async () => {
            const packageName = confirmButton.dataset.packageName;
            const totalWashes = parseInt(confirmButton.dataset.totalWashes);

            confirmButton.disabled = true;
            confirmButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Memproses...';
            purchaseConfirmationContent.style.display = 'none';
            purchaseMessage.innerHTML = '';

            try {
                const response = await fetch(`/api/purchase-membership`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                    body: JSON.stringify({ packageName, totalWashes })
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.msg || 'Gagal membeli paket.');
                }
                
                purchaseMessage.innerHTML = `<div class="alert alert-success"><strong>Berhasil!</strong> ${result.msg}</div>`;

                setTimeout(() => {
                    purchaseModal.hide();
                    window.location.href = '/profile';
                }, 3000);

            } catch (error) {
                purchaseMessage.innerHTML = `<div class="alert alert-danger"><strong>Error!</strong> ${error.message}</div>`;
                
                setTimeout(() => {
                    confirmButton.disabled = false;
                    confirmButton.innerHTML = 'Yakin';
                    purchaseConfirmationContent.style.display = 'block';
                    purchaseMessage.innerHTML = '';
                }, 3000);
            }
        });
    }
};
    /**
     * Mengatur efek visual (navbar scroll dan fade-in).
     */
    const setupVisualEffects = () => {
        const nav = document.querySelector('.navbar');
        if (nav) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 50) {
                    nav.classList.add('navbar-scrolled');
                } else {
                    nav.classList.remove('navbar-scrolled');
                }
            });
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.fade-in-section').forEach(section => observer.observe(section));
    };

    // ======================================================
    // --- INISIALISASI ---
    // ======================================================
    setupNavbar();
    setupPackagePromos();
    fetchReviews();
    setupReviewForm();
    setupPurchaseModal();
    setupVisualEffects();
});
