// File: /js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    // API_URL diambil dari config.js
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    
    const userTableBody = document.getElementById('user-table-body');
    const reviewTableBody = document.getElementById('review-table-body');

    // Modals
    const addUserModal = new bootstrap.Modal(document.getElementById('addUserModal'));
    const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
    const editReviewModal = new bootstrap.Modal(document.getElementById('editReviewModal'));

    // Forms
    const addUserForm = document.getElementById('add-user-form');
    const editUserForm = document.getElementById('edit-user-form');
    const editReviewForm = document.getElementById('edit-review-form');

    // --- Keamanan: Cek apakah pengguna adalah admin ---
    if (!token || userRole !== 'admin') {
        alert('Akses ditolak. Anda bukan admin.');
        window.location.href = '/login.html';
        return;
    }

    // --- Fungsi Fetch Data ---
    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/users`, { headers: { 'x-auth-token': token } });
            if (!response.ok) throw new Error('Gagal mengambil data pengguna');
            const users = await response.json();
            userTableBody.innerHTML = '';
            users.forEach(user => {
                const row = `
                    <tr>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td><span class="badge bg-${user.role === 'admin' ? 'success' : 'secondary'}">${user.role}</span></td>
                        <td>
                            <button class="btn btn-sm btn-warning edit-user-btn" data-id="${user._id}" data-username="${user.username}" data-email="${user.email}" data-role="${user.role}"><i class="bi bi-pencil-square"></i></button>
                            <button class="btn btn-sm btn-danger delete-user-btn" data-id="${user._id}"><i class="bi bi-trash3"></i></button>
                        </td>
                    </tr>
                `;
                userTableBody.insertAdjacentHTML('beforeend', row);
            });
        } catch (error) {
            alert(error.message);
        }
    };

    const renderStars = (rating) => Array(5).fill(0).map((_, i) => `<i class="bi ${i < rating ? 'bi-star-fill text-warning' : 'bi-star'}"></i>`).join('');

    const fetchReviews = async () => {
        try {
            const response = await fetch(`${API_URL}/reviews/all`, { headers: { 'x-auth-token': token } });
            if (!response.ok) throw new Error('Gagal mengambil data ulasan');
            const reviews = await response.json();
            reviewTableBody.innerHTML = '';
            reviews.forEach(review => {
                const row = `
                    <tr>
                        <td>${review.username}</td>
                        <td>${renderStars(review.rating)}</td>
                        <td>${review.comment}</td>
                        <td>
                            <button class="btn btn-sm btn-warning edit-review-btn" data-id="${review._id}" data-rating="${review.rating}" data-comment="${review.comment}"><i class="bi bi-pencil-square"></i></button>
                            <button class="btn btn-sm btn-danger delete-review-btn" data-id="${review._id}"><i class="bi bi-trash3"></i></button>
                        </td>
                    </tr>
                `;
                reviewTableBody.insertAdjacentHTML('beforeend', row);
            });
        } catch (error) {
            alert(error.message);
        }
    };

    // --- Event Listeners untuk Form Submissions ---
    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newUser = {
            username: document.getElementById('add-username').value,
            email: document.getElementById('add-email').value,
            password: document.getElementById('add-password').value,
            role: document.getElementById('add-role').value,
        };
        try {
            const response = await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(newUser)
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.msg || 'Gagal menambah user');
            }
            addUserModal.hide();
            fetchUsers();
        } catch (error) {
            alert(error.message);
        }
    });

    editUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-user-id').value;
        const updatedUser = {
            username: document.getElementById('edit-username').value,
            email: document.getElementById('edit-email').value,
            role: document.getElementById('edit-role').value,
        };
        try {
            const response = await fetch(`${API_URL}/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(updatedUser)
            });
            if (!response.ok) throw new Error('Gagal mengupdate user');
            editUserModal.hide();
            fetchUsers();
        } catch (error) {
            alert(error.message);
        }
    });

    editReviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-review-id').value;
        const updatedReview = {
            rating: document.getElementById('edit-rating').value,
            comment: document.getElementById('edit-comment').value,
        };
        try {
            const response = await fetch(`${API_URL}/reviews/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(updatedReview)
            });
            if (!response.ok) throw new Error('Gagal mengupdate ulasan');
            editReviewModal.hide();
            fetchReviews();
        } catch (error) {
            alert(error.message);
        }
    });

    // --- Event Delegation untuk Tombol di Tabel ---
    document.querySelector('main').addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;

        if (target.classList.contains('edit-user-btn')) {
            document.getElementById('edit-user-id').value = id;
            document.getElementById('edit-username').value = target.dataset.username;
            document.getElementById('edit-email').value = target.dataset.email;
            document.getElementById('edit-role').value = target.dataset.role;
            editUserModal.show();
        }
        if (target.classList.contains('delete-user-btn')) {
            if (confirm('Yakin ingin menghapus pengguna ini?')) {
                fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: { 'x-auth-token': token } }).then(fetchUsers);
            }
        }
        if (target.classList.contains('edit-review-btn')) {
            document.getElementById('edit-review-id').value = id;
            document.getElementById('edit-rating').value = target.dataset.rating;
            document.getElementById('edit-comment').value = target.dataset.comment;
            editReviewModal.show();
        }
        if (target.classList.contains('delete-review-btn')) {
            if (confirm('Yakin ingin menghapus ulasan ini?')) {
                fetch(`${API_URL}/reviews/${id}`, { method: 'DELETE', headers: { 'x-auth-token': token } }).then(fetchReviews);
            }
        }
    });

    document.getElementById('download-excel-btn').addEventListener('click', () => {
    // Pastikan Anda sudah memiliki data 'allUsers' dari fetch
    if (window.allUsers && window.allUsers.length > 0) {
        exportUsersToExcel(window.allUsers);
    } else {
        alert('Data pengguna belum dimuat atau tidak ada.');
    }
});

// Fungsi untuk menampilkan QR code pengguna di dalam modal
function showUserQrCode(user) {
    const modalElement = document.getElementById('viewUserQrModal');
    const userQrModal = new bootstrap.Modal(modalElement);

    const usernameSpan = document.getElementById('qr-username');
    const qrContainer = document.getElementById('qr-code-container');

    // 1. Bersihkan QR code sebelumnya
    qrContainer.innerHTML = '';

    // 2. Set username di judul modal
    usernameSpan.textContent = user.username;

    // 3. Buat QR Code baru dengan data lengkap user
    new QRCode(qrContainer, {
        text: JSON.stringify(user, null, 2),
        width: 220,
        height: 220,
    });

    // 4. Tampilkan modal
    userQrModal.show();
}
