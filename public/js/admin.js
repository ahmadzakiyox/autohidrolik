document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://autohidrolik.com';
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // Inisialisasi semua modal
    const addUserModal = new bootstrap.Modal(document.getElementById('addUserModal'));
    const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
    const viewBarcodeModal = new bootstrap.Modal(document.getElementById('viewBarcodeModal'));
    const setPackageModal = new bootstrap.Modal(document.getElementById('setPackageModal'));
    const editReviewModal = new bootstrap.Modal(document.getElementById('editReviewModal'));

    // --- FUNGSI UNTUK PENGGUNA (USERS) ---
    const userTableBody = document.getElementById('user-table-body');
    const memberCountElement = document.getElementById('member-count');

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/users`, { headers: { 'x-auth-token': token } });
            if (!response.ok) throw new Error('Gagal mengambil data pengguna.');
            const users = await response.json();
            displayUsers(users);
        } catch (error) {
            console.error(error);
            userTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Gagal memuat data pengguna.</td></tr>`;
        }
    };

    const displayUsers = (users) => {
        userTableBody.innerHTML = '';
        let memberCount = 0;
        let userCounter = 1;

        users.forEach(user => {
            if (user.role === 'admin') return;

            const row = document.createElement('tr');
            let membershipStatus = '<span class="text-muted">Non-Member</span>';
            let paymentStatus = '-';
            let actionButtons = `<button class="btn btn-sm btn-outline-success set-package-btn" title="Atur Paket"><i class="bi bi-gem"></i></button> <button class="btn btn-sm btn-outline-warning edit-user-btn" title="Edit"><i class="bi bi-pencil-square"></i></button> <button class="btn btn-sm btn-outline-danger delete-user-btn" title="Hapus"><i class="bi bi-trash3"></i></button>`;
            
            if (user.membership) {
                memberCount++;
                membershipStatus = `${user.membership.packageName} (${user.membership.remainingWashes}x)`;
                paymentStatus = user.membership.isPaid
                    ? '<span class="badge bg-success">Lunas</span>'
                    : '<span class="badge bg-warning text-dark">Belum Bayar</span>';
                if (user.membership.isPaid) {
                    actionButtons = `<button class="btn btn-sm btn-outline-info view-barcode-btn" title="Barcode"><i class="bi bi-qr-code"></i></button> ` + actionButtons;
                } else {
                    actionButtons = `<button class="btn btn-sm btn-info confirm-payment-btn" title="Konfirmasi Bayar"><i class="bi bi-check-circle"></i></button> ` + actionButtons;
                }
            }
            
            // --- PERUBAHAN DI SINI ---
            const formattedCounter = String(userCounter).padStart(3, '0'); // Mengubah 1 menjadi "001"

            row.innerHTML = `
                <td>${formattedCounter}</td> 
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${membershipStatus}</td>
                <td>${paymentStatus}</td>
                <td><div class="btn-group">${actionButtons}</div></td>
            `;

            row.querySelector('.edit-user-btn')?.addEventListener('click', () => openEditModal(user));
            row.querySelector('.delete-user-btn')?.addEventListener('click', () => deleteUser(user._id));
            row.querySelector('.view-barcode-btn')?.addEventListener('click', () => openBarcodeModal(user));
            row.querySelector('.set-package-btn')?.addEventListener('click', () => openSetPackageModal(user));
            row.querySelector('.confirm-payment-btn')?.addEventListener('click', () => handleConfirmPayment(user._id));
            userTableBody.appendChild(row);
            
            userCounter++;
        });
        memberCountElement.textContent = memberCount;
    };
    
    const openEditModal = (user) => {
        document.getElementById('edit-user-id').value = user._id;
        document.getElementById('edit-username').value = user.username;
        document.getElementById('edit-email').value = user.email;
        document.getElementById('edit-phone').value = user.phone;
        document.getElementById('edit-role').value = user.role;
        editUserModal.show();
    };

// --- FUNGSI INI YANG DIPERBAIKI ---
    const openBarcodeModal = (user) => {
        document.getElementById('barcode-username').textContent = user.username;
        
        // PASTIKAN MENGGUNAKAN user.memberId
        JsBarcode("#barcode-container", user.memberId, {
            format: "CODE128", 
            width: 2, 
            height: 80, 
            displayValue: true // Tampilkan teks ID di bawah barcode
        });
        viewBarcodeModal.show();
    };
    
    const openSetPackageModal = (user) => {
        document.getElementById('package-username').textContent = user.username;
        document.getElementById('set-package-userid').value = user._id;
        document.getElementById('set-package-form').reset();
        setPackageModal.show();
    };

    document.getElementById('add-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userData = {
            username: document.getElementById('add-username').value,
            email: document.getElementById('add-email').value,
            phone: document.getElementById('add-phone').value,
            password: document.getElementById('add-password').value,
            role: document.getElementById('add-role').value,
        };
        try {
            const response = await fetch(`${API_URL}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(userData)
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.msg || 'Gagal menambah user.');
            }
            addUserModal.hide();
            fetchUsers();
        } catch (error) { alert(error.message); }
    });

    document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('edit-user-id').value;
        const userData = {
            username: document.getElementById('edit-username').value,
            email: document.getElementById('edit-email').value,
            phone: document.getElementById('edit-phone').value,
            role: document.getElementById('edit-role').value,
        };
        try {
            const response = await fetch(`${API_URL}/api/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(userData)
            });
            if (!response.ok) throw new Error('Gagal mengupdate user.');
            editUserModal.hide();
            fetchUsers();
        } catch (error) { alert(error.message); }
    });

    const deleteUser = async (userId) => {
        if (confirm('Anda yakin ingin menghapus pengguna ini?')) {
            try {
                const response = await fetch(`${API_URL}/api/users/${userId}`, {
                    method: 'DELETE',
                    headers: { 'x-auth-token': token }
                });
                if (!response.ok) throw new Error('Gagal menghapus user.');
                fetchUsers();
            } catch (error) { alert(error.message); }
        }
    };

    const handleConfirmPayment = async (userId) => {
        if (confirm('Anda yakin ingin mengonfirmasi pembayaran untuk pengguna ini?')) {
            try {
                const response = await fetch(`${API_URL}/api/confirm-payment/${userId}`, {
                    method: 'POST',
                    headers: { 'x-auth-token': token }
                });
                if (!response.ok) throw new Error('Gagal konfirmasi.');
                fetchUsers();
            } catch (error) { alert(error.message); }
        }
    };
    
    document.getElementById('set-package-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('set-package-userid').value;
        const select = document.getElementById('package-name');
        const selectedOption = select.options[select.selectedIndex];
        const packageData = {
            packageName: selectedOption.value,
            totalWashes: parseInt(selectedOption.dataset.washes)
        };
        try {
            const response = await fetch(`${API_URL}/api/purchase-membership-admin/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(packageData)
            });
            if (!response.ok) throw new Error('Gagal mengatur paket.');
            setPackageModal.hide();
            fetchUsers();
        } catch (error) { alert(error.message); }
    });

    // --- FUNGSI UNTUK ULASAN (REVIEWS) ---
    const reviewTableBody = document.getElementById('review-table-body');

    const fetchReviews = async () => {
        try {
            const response = await fetch(`${API_URL}/api/reviews/all`, { headers: { 'x-auth-token': token } });
            if (!response.ok) throw new Error('Gagal mengambil data ulasan.');
            const reviews = await response.json();
            displayReviews(reviews);
        } catch (error) {
            console.error(error);
            reviewTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Gagal memuat data ulasan.</td></tr>`;
        }
    };

    const displayReviews = (reviews) => {
        reviewTableBody.innerHTML = '';
        reviews.forEach(review => {
            const row = document.createElement('tr');
            const ratingStars = '<span class="rating-stars">' + '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating) + '</span>';
            const username = review.user ? review.user.username : '<em class="text-muted">User Dihapus</em>';
            row.innerHTML = `
                <td>${username}</td>
                <td>${ratingStars}</td>
                <td>${review.comment}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-warning edit-review-btn"><i class="bi bi-pencil-square"></i></button>
                        <button class="btn btn-sm btn-outline-danger delete-review-btn"><i class="bi bi-trash3"></i></button>
                    </div>
                </td>
            `;
            row.querySelector('.edit-review-btn').addEventListener('click', () => openEditReviewModal(review));
            row.querySelector('.delete-review-btn').addEventListener('click', () => deleteReview(review._id));
            reviewTableBody.appendChild(row);
        });
    };

    const openEditReviewModal = (review) => {
        document.getElementById('edit-review-id').value = review._id;
        document.getElementById('edit-rating').value = review.rating;
        document.getElementById('edit-comment').value = review.comment;
        editReviewModal.show();
    };

    document.getElementById('edit-review-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const reviewId = document.getElementById('edit-review-id').value;
        const reviewData = {
            rating: document.getElementById('edit-rating').value,
            comment: document.getElementById('edit-comment').value,
        };
        try {
            const response = await fetch(`${API_URL}/api/reviews/${reviewId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(reviewData)
            });
            if (!response.ok) throw new Error('Gagal mengupdate ulasan.');
            editReviewModal.hide();
            fetchReviews();
        } catch (error) { alert(error.message); }
    });

    const deleteReview = async (reviewId) => {
        if (confirm('Anda yakin ingin menghapus ulasan ini?')) {
            try {
                const response = await fetch(`${API_URL}/api/reviews/${reviewId}`, {
                    method: 'DELETE',
                    headers: { 'x-auth-token': token }
                });
                if (!response.ok) throw new Error('Gagal menghapus ulasan.');
                fetchReviews();
            } catch (error) { alert(error.message); }
        }
    };

    // Logout
    document.getElementById('logout-button').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        window.location.href = '/login';
    });
    
    // Panggil semua fungsi fetch data saat halaman dimuat
    fetchUsers();
    fetchReviews();
});
