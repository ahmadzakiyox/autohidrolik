    document.addEventListener('DOMContentLoaded', () => {
      // --- KONFIGURASI & INISIALISASI ---
      const token = localStorage.getItem('token');
      if (!token || localStorage.getItem('userRole') !== 'admin') {
          alert('Akses ditolak. Silakan login sebagai admin.');
          window.location.href = '/login.html';
          return;
      }
  
      // --- Elemen UI ---
      // Pastikan semua elemen didefinisikan di sini, di bagian atas
      const alertPlaceholder = document.getElementById('alert-placeholder');
      const userTableBody = document.getElementById('user-table-body');
      const reviewTableBody = document.getElementById('review-table-body');
      const memberCountElement = document.getElementById('member-count');
      const visitorCountElement = document.getElementById('visitor-count');
      const transactionTotalElement = document.getElementById('transaction-total');
      const downloadButton = document.getElementById('download-data-btn');
      const memberTableBody = document.getElementById('member-table-body');
      const nonMemberTableBody = document.getElementById('non-member-table-body');
      const expiredMemberTableBody = document.getElementById('expired-member-table-body');
      const extendMembershipModal = new bootstrap.Modal(document.getElementById('extendMembershipModal'));

      
      // Inisialisasi semua modal (pop-up)
      const addUserModal = new bootstrap.Modal(document.getElementById('addUserModal'));
      const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
      const editComboWashesModal = new bootstrap.Modal(document.getElementById('editComboWashesModal')); // <-- TAMBAHKAN INI
      const editTransactionModal = new bootstrap.Modal(document.getElementById('editTransactionModal'));
      const editExpiryModal = new bootstrap.Modal(document.getElementById('editExpiryModal'));
      const viewBarcodeModal = new bootstrap.Modal(document.getElementById('viewBarcodeModal'));
      const setPackageModal = new bootstrap.Modal(document.getElementById('setPackageModal'));
      const editReviewModal = new bootstrap.Modal(document.getElementById('editReviewModal'));
      const resetPasswordModal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
      const resetTransactionsButton = document.getElementById('reset-transactions-btn'); // Tambahkan ini
  
      let cachedUsers = []; // Variabel untuk menyimpan data pengguna sementara
  
      // --- FUNGSI HELPER (PEMBANTU) ---
  
      // --- PENAMBAHAN BARU: Fungsi untuk mengambil data dan membuat grafik ---
      const fetchRevenueTrend = async () => {
          try {
              const response = await fetch('/api/revenue-trend', { headers: getHeaders(false) });
              if (!response.ok) throw new Error('Gagal mengambil data grafik.');
  
              const trendData = await response.json();
  
              const ctx = document.getElementById('revenueChart').getContext('2d');
              new Chart(ctx, {
                  type: 'bar', // Tipe grafik: 'bar' (batang) atau 'line' (garis)
                  data: {
                      labels: trendData.labels, // Label tanggal dari API
                      datasets: [{
                          label: 'Pendapatan (Rp)',
                          data: trendData.data, // Data pendapatan dari API
                          backgroundColor: 'rgba(111, 66, 193, 0.6)', // Warna batang grafik
                          borderColor: 'rgba(111, 66, 193, 1)',
                          borderWidth: 1
                      }]
                  },
                  options: {
                      scales: {
                          y: {
                              beginAtZero: true
                          }
                      }
                  }
              });
  
          } catch (error) {
              showAlert(error.message);
          }
      };
      // Didefinisikan sebagai 'function' agar bisa diakses dari mana saja (hoisting)
      function showAlert(message, type = 'danger') {
          if (alertPlaceholder) {
              alertPlaceholder.innerHTML = `
                  <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                      ${message}
                      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                  </div>`;
          } else {
              console.error('Elemen #alert-placeholder tidak ditemukan di HTML.');
          }
      }
  
      // Fungsi untuk membuat header otentikasi
      const getHeaders = (includeContentType = true) => {
          const headers = { 'x-auth-token': token };
          if (includeContentType) headers['Content-Type'] = 'application/json';
          return headers;
      };
  
      // --- FUNGSI PENGAMBILAN DATA (FETCH) ---
      const fetchDashboardStats = async () => {
          try {
              const response = await fetch('/api/dashboard-stats', { headers: getHeaders(false) });
              if (!response.ok) throw new Error('Gagal mengambil data statistik.');
  
              const stats = await response.json();
  
              memberCountElement.textContent = stats.activeMembers;
              visitorCountElement.textContent = stats.totalVisitors;
              transactionTotalElement.textContent = `Rp ${stats.totalTransactions.toLocaleString('id-ID')}`;
          } catch (error) {
              showAlert(error.message);
          }
      };
  
  const fetchUsers = async () => {
      try {
          const response = await fetch('/api/users', { headers: getHeaders(false) });
          if (!response.ok) throw new Error('Gagal mengambil data pengguna.');
          cachedUsers = await response.json();
  
          const today = new Date();
  
          // Filter 1: Member Aktif (punya membership & belum kedaluwarsa)
          const activeMembers = cachedUsers.filter(user => 
              user.membership && user.membership.expiresAt && new Date(user.membership.expiresAt) >= today
          );
  
          // Filter 2: Member Kedaluwarsa (punya membership & sudah kedaluwarsa)
          const expiredMembers = cachedUsers.filter(user => 
              user.membership && user.membership.expiresAt && new Date(user.membership.expiresAt) < today
          );
  
          // Filter 3: Non-Member (tidak punya membership sama sekali)
          const nonMembers = cachedUsers.filter(user => !user.membership);
  
          displayMembers(activeMembers);
          displayExpiredMembers(expiredMembers); // Panggil fungsi baru
          displayNonMembers(nonMembers);
  
      } catch (error) {
          // Tampilkan error di semua tabel jika fetch gagal
          const errorMsg = `<tr><td colspan="8" class="text-center text-danger">${error.message}</td></tr>`;
          memberTableBody.innerHTML = errorMsg;
          expiredMemberTableBody.innerHTML = errorMsg;
          nonMemberTableBody.innerHTML = errorMsg;
      }
  };
      
      const fetchReviews = async () => {
          try {
              const response = await fetch('/api/reviews/all', { headers: getHeaders(false) });
              if (!response.ok) throw new Error('Gagal mengambil data ulasan.');
              const reviews = await response.json();
              displayReviews(reviews);
          } catch (error) {
              reviewTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">${error.message}</td></tr>`;
          }
      };
  
      // --- FUNGSI TAMPILAN (DISPLAY) ---
      // Ganti fungsi displayUsers yang lama dengan dua fungsi baru ini
      // --- FUNGSI TAMPILAN (DISPLAY) ---
      // public/js/admin.js
const displayMembers = (members) => {
    // Perbarui colspan jika tidak ada member
    memberTableBody.innerHTML = '';
    if (members.length === 0) {
        memberTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Belum ada member.</td></tr>`; // Ubah 7 -> 8
        return;
    }
    let counter = 1;
    members.forEach(user => {
        const row = document.createElement('tr');
        row.dataset.userId = user._id;

        let membershipStatus = '';
        if (user.membership.packageName === 'Paket Kombinasi') {
            membershipStatus = `
                <div>Paket Kombinasi</div>
                <small class="text-muted">
                    Bodywash: <strong>${user.membership.washes.bodywash}x</strong>, 
                    Hidrolik: <strong>${user.membership.washes.hidrolik}x</strong>
                </small>
            `;
        } else {
            membershipStatus = `${user.membership.packageName} (${user.membership.remainingWashes}x)`;
        }

        let paymentStatus = user.membership.isPaid
            ? '<span class="badge bg-success">Lunas</span>'
            : '<span class="badge bg-warning text-dark">Belum Bayar</span>';

        let expiryDateHtml = '-';
        if (user.membership.expiresAt) {
            const expiryDate = new Date(user.membership.expiresAt);
            const today = new Date();
            const isExpired = expiryDate < today;

        const formattedDate = expiryDate.toLocaleDateString('id-ID', {
         day: 'numeric', month: 'long', year: 'numeric'
            });

            // ======================= PERUBAHAN DI SINI =======================
            // Tambahkan tombol edit kecil di sebelah tanggal
            const editButton = `<button class="btn btn-sm btn-link p-0 ms-2 edit-expiry-btn" title="Edit Tanggal"><i class="bi bi-pencil"></i></button>`;
            expiryDateHtml = (isExpired ? `<span class="text-danger fw-bold">${formattedDate}</span>` : formattedDate) + editButton;
            // ===================== AKHIR DARI PERUBAHAN =====================
        }

        // Logika tombol aksi Anda
        let actionButtons = `
            <button class="btn btn-sm btn-info extend-membership-btn" title="Perpanjang"><i class="bi bi-calendar-plus"></i></button>
            <button class="btn btn-sm btn-outline-secondary reset-password-btn" title="Reset Sandi"><i class="bi bi-key-fill"></i></button>
            <button class="btn btn-sm btn-outline-success edit-user-btn" title="Edit"><i class="bi bi-pencil-square"></i></button>
            <button class="btn btn-sm btn-outline-danger delete-user-btn" title="Hapus"><i class="bi bi-trash3"></i></button>
            <button class="btn btn-sm btn-outline-info set-package-btn" title="Atur/Ganti Paket"><i class="bi bi-gem"></i></button>
        `;
        if (user.membership.packageName === 'Paket Kombinasi') {
            actionButtons = `<button class="btn btn-sm btn-outline-primary edit-combo-btn" title="Edit Jatah Kombinasi"><i class="bi bi-sliders"></i></button>` + actionButtons;
        }
        if (user.membership.isPaid) {
            actionButtons = `<button class="btn btn-sm btn-outline-info view-barcode-btn" title="QR Code"><i class="bi bi-qr-code"></i></button>` + actionButtons;
        } else {
            actionButtons = `<button class="btn btn-sm btn-info confirm-payment-btn" title="Konfirmasi Bayar"><i class="bi bi-check-circle"></i></button>` + actionButtons;
        }

        // Susun ulang baris tabel dengan kolom baru
        row.innerHTML = `
            <td>${String(counter++).padStart(3, '0')}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.phone || '-'}</td>
            <td>${membershipStatus}</td>
            <td>${paymentStatus}</td>
            <td>${expiryDateHtml}</td>
            <td><div class="btn-group">${actionButtons}</div></td>
        `;
        memberTableBody.appendChild(row);
    });
};
  
  // --- FUNGSI BARU UNTUK MENAMPILKAN MEMBER KEDALUWARSA ---
  const displayExpiredMembers = (members) => {
      expiredMemberTableBody.innerHTML = '';
      if (members.length === 0) {
          expiredMemberTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Tidak ada member yang kedaluwarsa.</td></tr>`;
          return;
      }
      let counter = 1;
      members.forEach(user => {
          const row = document.createElement('tr');
          row.dataset.userId = user._id;
  
          const lastPackage = `${user.membership.packageName}`;
  
          // Format tanggal kedaluwarsa
          const expiryDate = new Date(user.membership.expiresAt);
          const formattedDate = expiryDate.toLocaleString('id-ID', {
              day: 'numeric', month: 'long', year: 'numeric'
          });
        
          const editButton = `<button class="btn btn-sm btn-link p-0 ms-2 edit-expiry-btn" title="Edit Tanggal"><i class="bi bi-pencil"></i></button>`;
          expiryDateHtml = (isExpired ? `<span class="text-danger fw-bold">${formattedDate}</span>` : formattedDate) + editButton;
  
                      
          // Tombol aksi hanya untuk memperbarui paket
          const actionButtons = `
              <button class="btn btn-sm btn-success set-package-btn" title="Perbarui Paket Member">
                  <i class="bi bi-arrow-clockwise"></i> Perbarui Paket
              </button>
          `;
  
          row.innerHTML = `
              <td>${String(counter++)}</td>
              <td>${user.username}</td>
              <td>${user.email || '-'}</td>
              <td>${lastPackage}</td>
              <td><span class="text-danger fw-bold">${formattedDate}</span></td>
              <td><div class="btn-group">${actionButtons}</div></td>
          `;
          expiredMemberTableBody.appendChild(row);
      });
  };
      
      const displayNonMembers = (nonMembers) => {
          nonMemberTableBody.innerHTML = '';
          if (nonMembers.length === 0) {
              nonMemberTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Tidak ada pengguna non-member.</td></tr>`;
              return;
          }
          let counter = 1;
          nonMembers.forEach(user => {
              const row = document.createElement('tr');
              row.dataset.userId = user._id;
              let actionButtons = `<button class="btn btn-sm btn-outline-success set-package-btn" title="Jadikan Member"><i class="bi bi-gem"></i></button><button class="btn btn-sm btn-outline-warning e[...]`;
              row.innerHTML = `<td>${String(counter++)}</td><td>${user.username}</td><td>${user.email}</td><td>${user.phone || '-'}</td><td><div class="btn-group">${actionButtons}</div></td>`;
              nonMemberTableBody.appendChild(row);
          });
      };
      const displayReviews = (reviews) => {
          reviewTableBody.innerHTML = '';
          reviews.forEach(review => {
              const row = document.createElement('tr');
              row.dataset.reviewId = review._id;
              const ratingStars = '<span class="rating-stars">' + '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating) + '</span>';
              const username = review.user ? review.user.username : '<em class="text-muted">Pengguna Dihapus</em>';
              row.innerHTML = `<td>${username}</td><td>${ratingStars}</td><td>${review.comment}</td>
                  <td><div class="btn-group">
                      <button class="btn btn-sm btn-outline-warning edit-review-btn"><i class="bi bi-pencil-square"></i></button>
                      <button class="btn btn-sm btn-outline-danger delete-review-btn"><i class="bi bi-trash3"></i></button>
                  </div></td>`;
              reviewTableBody.appendChild(row);
          });
      };
  
      // --- FUNGSI-FUNGSI AKSI (OPERASI CRUD) ---
      const handleConfirmPayment = async (userId) => {
          if (!confirm('Anda yakin ingin mengonfirmasi pembayaran untuk pengguna ini?')) return;
          try {
              const response = await fetch(`/api/confirm-payment/${userId}`, { method: 'POST', headers: getHeaders(false) });
              const result = await response.json();
              if (!response.ok) throw new Error(result.msg || 'Gagal konfirmasi.');
              showAlert(`Pembayaran untuk ${result.user.username} berhasil dikonfirmasi.`, 'success');
              fetchUsers();
              fetchDashboardStats();
          } catch (error) { showAlert(error.message); }
      };
  
      const deleteUser = async (userId) => {
          if (!confirm('Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan.')) return;
          try {
              const response = await fetch(`/api/users/${userId}`, { method: 'DELETE', headers: getHeaders(false) });
              if (!response.ok) throw new Error('Gagal menghapus pengguna.');
              showAlert('Pengguna berhasil dihapus.', 'success');
              fetchUsers();
              fetchDashboardStats();
          } catch (error) { showAlert(error.message); }
      };
  
      const deleteReview = async (reviewId) => {
          if (!confirm('Anda yakin ingin menghapus ulasan ini?')) return;
          try {
              const response = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE', headers: getHeaders(false) });
              if (!response.ok) throw new Error('Gagal menghapus ulasan.');
              showAlert('Ulasan berhasil dihapus.', 'success');
              fetchReviews();
          } catch (error) { showAlert(error.message); }
      };
  
      // --- FUNGSI-FUNGSI MODAL (POP-UP) ---
      const openEditModal = (user) => {
          document.getElementById('edit-user-id').value = user._id;
          document.getElementById('edit-username').value = user.username;
          document.getElementById('edit-email').value = user.email;
          document.getElementById('edit-phone').value = user.phone;
          document.getElementById('edit-role').value = user.role;
          editUserModal.show();
      };
  
      const openBarcodeModal = (user) => {
          document.getElementById('barcode-username').textContent = user.username;
          const qrCodeContainer = document.getElementById('barcode-container');
          qrCodeContainer.innerHTML = '';
          if (user.memberId) {
              new QRCode(qrCodeContainer, { text: user.memberId, width: 200, height: 200 });
          } else {
              qrCodeContainer.innerHTML = '<p class="text-danger">Member ID tidak ditemukan.</p>';
          }
          viewBarcodeModal.show();
      };
  
      const openSetPackageModal = (user) => {
          document.getElementById('package-username').textContent = user.username;
          document.getElementById('set-package-userid').value = user._id;
          document.getElementById('set-package-form').reset();
          setPackageModal.show();
      };
  
      const openResetPasswordModal = (user) => {
          document.getElementById('reset-password-username').textContent = user.username;
          document.getElementById('reset-password-userid').value = user._id;
          document.getElementById('reset-password-form').reset();
          resetPasswordModal.show();
      };
  
      const openEditReviewModal = (review) => {
          document.getElementById('edit-review-id').value = review._id;
          document.getElementById('edit-rating').value = review.rating;
          document.getElementById('edit-comment').value = review.comment;
          editReviewModal.show();
      };
  
      const openEditComboWashesModal = (user) => {
          document.getElementById('edit-combo-userid').value = user._id;
          document.getElementById('edit-combo-username').textContent = user.username;
          document.getElementById('edit-bodywash-count').value = user.membership.washes.bodywash;
          document.getElementById('edit-hidrolik-count').value = user.membership.washes.hidrolik;
          editComboWashesModal.show();
      };
  
  // --- FUNGSI BARU UNTUK MEMBUKA MODAL EDIT TANGGAL ---
  const openEditExpiryModal = (user) => {
      document.getElementById('edit-expiry-userid').value = user._id;
      document.getElementById('edit-expiry-username').textContent = user.username;
  
      // Format tanggal 'YYYY-MM-DD' yang dibutuhkan oleh input type="date"
      if (user.membership.expiresAt) {
          const currentDate = new Date(user.membership.expiresAt);
          const year = currentDate.getFullYear();
          const month = String(currentDate.getMonth() + 1).padStart(2, '0');
          const day = String(currentDate.getDate()).padStart(2, '0');
          document.getElementById('edit-expiry-date').value = `${year}-${month}-${day}`;
      }
  
      editExpiryModal.show();
  };

  // --- FUNGSI BARU UNTUK MEMBUKA MODAL PERPANJANGAN ---
const openExtendMembershipModal = (user) => {
    document.getElementById('extend-userid').value = user._id;
    document.getElementById('extend-username').textContent = user.username;

    const currentExpiry = new Date(user.membership.expiresAt).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
    document.getElementById('extend-current-expiry').textContent = currentExpiry;

    extendMembershipModal.show();
};
  
      // --- EVENT LISTENER UTAMA (EVENT DELEGATION) ---
      // Listener untuk tombol Reset Transaksi (FITUR BARU)
      resetTransactionsButton.addEventListener('click', async () => {
          // Tampilkan konfirmasi yang sangat jelas karena ini tindakan berbahaya
          const confirmation = prompt('PERINGATAN: Tindakan ini akan menghapus SEMUA catatan transaksi secara permanen dan mengatur ulang total transaksi menjadi Rp 0. Ini tidak dapat diurungkan. Ketik "RES[...]');
  
          if (confirmation === 'RESET') {
              try {
                  const response = await fetch('/api/transactions/reset', {
                      method: 'DELETE',
                      headers: getHeaders(false)
                  });
                  const result = await response.json();
                  if (!response.ok) throw new Error(result.msg || 'Gagal mereset transaksi.');
  
                  // Jika berhasil, tampilkan notifikasi sukses dan refresh data dashboard
                  showAlert('Semua transaksi berhasil direset.', 'success');
                  fetchDashboardStats(); // Panggil fungsi ini untuk update tampilan menjadi Rp 0
  
              } catch (error) {
                  showAlert(error.message);
              }
          } else {
              showAlert('Reset dibatalkan.', 'info');
          }
      });
  
      document.body.addEventListener('click', async (e) => {
          const button = e.target.closest('button');
          if (!button) return;

    // Handler untuk tombol perpanjangan di dalam modal
    if (button.classList.contains('extend-btn')) {
        const userId = document.getElementById('extend-userid').value;
        const months = button.dataset.months;

        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

        try {
            const response = await fetch(`/api/users/${userId}/extend-membership`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ months })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg);

            showAlert(result.msg, 'success');
            extendMembershipModal.hide();
            fetchUsers();

        } catch (error) {
            showAlert(error.message);
        } finally {
            // Kembalikan semua tombol ke keadaan semula
            document.querySelectorAll('.extend-btn').forEach((btn, index) => {
                btn.disabled = false;
                const durations = [1, 3, 6];
                btn.innerHTML = `+ ${durations[index]} Bulan`;
            });
        }
        return; // Hentikan eksekusi setelah menangani klik di modal
    }
  
          const userRow = button.closest('tr[data-user-id]');
          if (userRow) {
              const userId = userRow.dataset.userId;
              const user = cachedUsers.find(u => u._id === userId);
              if (button.classList.contains('confirm-payment-btn')) return handleConfirmPayment(userId);
              if (button.classList.contains('delete-user-btn')) return deleteUser(userId);
              if (user) {
                  if (button.classList.contains('edit-user-btn')) return openEditModal(user);
                  if (button.classList.contains('view-barcode-btn')) return openBarcodeModal(user);
                  if (button.classList.contains('set-package-btn')) return openSetPackageModal(user);
                  if (button.classList.contains('reset-password-btn')) return openResetPasswordModal(user);
                  if (button.classList.contains('edit-combo-btn')) return openEditComboWashesModal(user); // <-- TAMBAHKAN INI
                  if (button.classList.contains('edit-expiry-btn')) return openEditExpiryModal(user);
                  if (button.classList.contains('extend-membership-btn')) return openExtendMembershipModal(user);
              }
          }
  
          // Aksi untuk tabel ulasan
          const reviewRow = button.closest('tr[data-review-id]');
          if (reviewRow) {
              const reviewId = reviewRow.dataset.reviewId;
  
              // Logika untuk tombol hapus ulasan
              if (button.classList.contains('delete-review-btn')) {
                  return deleteReview(reviewId);
              }
  
              // --- LANJUTAN KODE ANDA DI SINI ---
              // Logika untuk tombol edit ulasan
              if (button.classList.contains('edit-review-btn')) {
                  // Cari data ulasan lengkap dari cache berdasarkan ID
                  const review = cachedReviews.find(r => r._id === reviewId);
                  if (review) {
                      // Jika ditemukan, panggil fungsi untuk membuka modal edit
                      return openEditReviewModal(review);
                  }
              }
          }
      });
  
      // --- EVENT LISTENER UNTUK FORM SUBMISSIONS ---
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
              const response = await fetch('/api/users', { method: 'POST', headers: getHeaders(), body: JSON.stringify(userData) });
              const result = await response.json();
              if (!response.ok) throw new Error(result.msg || 'Gagal menambah user.');
              showAlert('Pengguna baru berhasil ditambahkan.', 'success');
              addUserModal.hide();
              fetchUsers();
              fetchDashboardStats();
          } catch (error) { showAlert(error.message); }
      });
  
      document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const userId = document.getElementById('edit-user-id').value;
          const userData = {
              username: document.getElementById('edit-username').value,
              email: document.getElementById('edit-email').value,
              phone: document.getElementById('edit-phone').value, // Pastikan 'phone' ada di sini
              role: document.getElementById('edit-role').value,
          };
          try {
              const response = await fetch(`/api/users/${userId}`, {
                  method: 'PUT',
                  headers: getHeaders(),
                  body: JSON.stringify(userData)
              });
              if (!response.ok) throw new Error('Gagal mengupdate user.');
  
              showAlert('Data pengguna berhasil diperbarui.', 'success');
              editUserModal.hide();
  
              // Baris ini akan memuat ulang data tabel secara otomatis
              fetchUsers();
  
          } catch (error) {
              showAlert(error.message);
          }
      });
  
      // Event listener untuk form koreksi transaksi
  document.getElementById('edit-transaction-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = document.getElementById('transaction-amount').value;
      const note = document.getElementById('transaction-note').value;
  
      try {
          const response = await fetch('/api/transactions/correction', {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify({ amount, note })
          });
  
          const result = await response.json();
          if (!response.ok) throw new Error(result.msg || 'Gagal menyimpan koreksi.');
  
          showAlert('Transaksi koreksi berhasil disimpan.', 'success');
          editTransactionModal.hide();
          document.getElementById('edit-transaction-form').reset();
  
          // Muat ulang statistik untuk menampilkan total yang baru
          fetchDashboardStats();
          // Muat ulang grafik pendapatan juga
          fetchRevenueTrend();
  
      } catch (error) {
          showAlert(error.message);
      }
  });
  
      document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const userId = document.getElementById('reset-password-userid').value;
          const newPassword = document.getElementById('new-password-admin').value;
          try {
              const response = await fetch(`/api/users/${userId}/reset-password`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ newPassword }) });
              const result = await response.json();
              if (!response.ok) throw new Error(result.msg || 'Gagal reset sandi.');
              showAlert(result.msg, 'success');
              resetPasswordModal.hide();
          } catch (error) { showAlert(error.message); }
      });
  
      // --- EVENT LISTENER BARU UNTUK FORM EDIT TANGGAL ---
  document.getElementById('edit-expiry-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const userId = document.getElementById('edit-expiry-userid').value;
      const newExpiryDate = document.getElementById('edit-expiry-date').value;
  
      try {
          const response = await fetch(`/api/users/${userId}/update-expiry`, {
              method: 'PUT',
              headers: getHeaders(),
              body: JSON.stringify({ newExpiryDate })
          });
  
          const result = await response.json();
          if (!response.ok) throw new Error(result.msg || 'Gagal mengupdate tanggal.');
  
          showAlert(result.msg, 'success');
          editExpiryModal.hide();
          fetchUsers(); // Muat ulang data untuk menampilkan tanggal terbaru
  
      } catch (error) {
          showAlert(error.message);
      }
  });
  
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
              const response = await fetch(`/api/purchase-membership-admin/${userId}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(packageData) });
              const result = await response.json();
              if (!response.ok) throw new Error(result.msg || 'Gagal mengatur paket.');
              showAlert(result.msg, 'success');
              setPackageModal.hide();
              fetchUsers();
          } catch (error) { showAlert(error.message); }
      });
  
      document.getElementById('edit-review-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const reviewId = document.getElementById('edit-review-id').value;
          const reviewData = {
              rating: document.getElementById('edit-rating').value,
              comment: document.getElementById('edit-comment').value,
          };
          try {
              const response = await fetch(`/api/reviews/${reviewId}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(reviewData) });
              if (!response.ok) throw new Error('Gagal mengupdate ulasan.');
              showAlert('Ulasan berhasil diperbarui.', 'success');
              editReviewModal.hide();
              fetchReviews();
          } catch (error) { showAlert(error.message); }
      });
  
      // public/js/admin.js (bisa diletakkan setelah event listener 'edit-review-form')
  
      document.getElementById('edit-combo-washes-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const userId = document.getElementById('edit-combo-userid').value;
          const comboData = {
              bodywash: document.getElementById('edit-bodywash-count').value,
              hidrolik: document.getElementById('edit-hidrolik-count').value,
          };
          try {
              const response = await fetch(`/api/users/${userId}/update-combo-washes`, {
                  method: 'PUT',
                  headers: getHeaders(),
                  body: JSON.stringify(comboData)
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.msg || 'Gagal mengupdate jatah cuci.');
  
              showAlert(result.msg, 'success');
              editComboWashesModal.hide();
              fetchUsers(); // Muat ulang data tabel untuk menampilkan hasil terbaru
  
          } catch (error) {
              showAlert(error.message);
          }
      });
  
      downloadButton.addEventListener('click', async () => {
          downloadButton.disabled = true;
          downloadButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Mengunduh...';
          try {
              const response = await fetch('/api/download-data', { headers: getHeaders(false) });
              if (!response.ok) throw new Error('Gagal mengunduh data.');
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.style.display = 'none';
              a.href = url;
              a.download = `data_autohidrolik_${new Date().toISOString().slice(0,10)}.xlsx`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              a.remove();
          } catch (error) {
              showAlert(error.message);
          } finally {
              downloadButton.disabled = false;
              downloadButton.innerHTML = '<i class="bi bi-download"></i> Download Data';
          }
      });
  
      document.getElementById('logout-button').addEventListener('click', () => {
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          window.location.href = '/login.html';
      });
  
      // --- INISIALISASI SAAT HALAMAN DIMUAT ---
      fetchDashboardStats();
      fetchUsers();
      fetchReviews();
      fetchRevenueTrend();
  });
