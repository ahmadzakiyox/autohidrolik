// File: /js/index.js

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://autohidrolik.com/api'; // Sesuaikan dengan URL Render Anda
    const token = localStorage.getItem('token');
    
    const purchaseModal = new bootstrap.Modal(document.getElementById('purchaseModal'));
    const packageNameElement = document.getElementById('package-name');
    const buyButtons = document.querySelectorAll('.buy-btn');

    const reviewList = document.getElementById('review-list');
    const addReviewSection = document.getElementById('add-review-section');
    const addReviewForm = document.getElementById('add-review-form');

    // --- Logika Tombol Beli Paket ---
    buyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const packageName = button.getAttribute('data-package');
            packageNameElement.textContent = packageName;
            purchaseModal.show();
        });
    });

    // --- Logika Ulasan ---
    // Fungsi untuk menampilkan bintang rating
    const renderStars = (rating) => {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<i class="bi ${i <= rating ? 'bi-star-fill' : 'bi-star'}"></i>`;
        }
        return stars;
    };

    // Ambil dan tampilkan ulasan saat halaman dimuat
    const fetchReviews = async () => {
        try {
            const response = await fetch(`${API_URL}/reviews`);
            const reviews = await response.json();
            reviewList.innerHTML = ''; // Kosongkan daftar
            if (reviews.length === 0) {
                reviewList.innerHTML = '<p class="text-center text-muted">Belum ada ulasan.</p>';
                return;
            }
            reviews.forEach(review => {
                const reviewCard = `
                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100">
                            <div class="card-body">
                                <div class="stars mb-2">${renderStars(review.rating)}</div>
                                <p class="card-text fst-italic">"${review.comment}"</p>
                                <footer class="blockquote-footer mt-3">${review.username}</footer>
                            </div>
                        </div>
                    </div>
                `;
                reviewList.insertAdjacentHTML('beforeend', reviewCard);
            });
        } catch (error) {
            console.error('Gagal mengambil ulasan:', error);
        }
    };

    // Tampilkan form ulasan jika user sudah login
    if (token) {
        addReviewSection.style.display = 'block';
    }

    // Handle pengiriman form ulasan
    if(addReviewForm) {
        addReviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const reviewData = {
                rating: document.getElementById('rating').value,
                comment: document.getElementById('comment').value
            };

            try {
                const response = await fetch(`${API_URL}/reviews`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token
                    },
                    body: JSON.stringify(reviewData)
                });

                if (!response.ok) {
                    throw new Error('Gagal mengirim ulasan. Silakan coba lagi.');
                }

                alert('Terima kasih! Ulasan Anda berhasil dikirim.');
                addReviewForm.reset();
                fetchReviews(); // Muat ulang daftar ulasan
            } catch (error) {
                alert(error.message);
            }
        });
    }

    // Panggil fungsi untuk memuat ulasan
    fetchReviews();
});
