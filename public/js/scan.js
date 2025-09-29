// File: /public/js/scan.js (Direvisi Total)

document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    if (!token || localStorage.getItem('userRole') !== 'admin') {
        alert('Akses ditolak. Anda harus login sebagai admin.');
        window.location.href = '/login.html';
        return;
    }

    const barcodeInput = document.getElementById('barcode-input');
    const resultContainer = document.getElementById('result');
    
    // --- (Kode untuk kamera tidak diubah, bisa disalin dari file lama Anda) ---

    const showLoading = (message) => {
        resultContainer.innerHTML = `<div class="alert alert-info">${message}</div>`;
        barcodeInput.disabled = true;
    };

    const resetScanner = (delay = 4000) => {
        setTimeout(() => {
            barcodeInput.value = '';
            barcodeInput.disabled = false;
            barcodeInput.focus();
            resultContainer.innerHTML = '';
        }, delay);
    };

    const showResult = (message, type = 'success', remainingWashes = null) => {
        let remainingText = '';
        if (remainingWashes) {
            remainingText = `
                <hr>
                <p class="mb-0">Sisa Jatah:</p>
                <ul class="list-unstyled">
                    <li>Body Wash: <strong>${remainingWashes.bodywash}x</strong></li>
                    <li>Cuci Hidrolik: <strong>${remainingWashes.hidrolik}x</strong></li>
                </ul>
            `;
        }
        resultContainer.innerHTML = `<div class="alert alert-${type}"><h5 class="alert-heading">${type === 'success' ? 'Berhasil!' : 'Error!'}</h5><p>${message}</p>${remainingText}</div>`;
    };

    const useWash = async (userId, washType) => {
        showLoading(`Memproses ${washType} untuk ID: ${userId}...`);
        try {
            const response = await fetch(`/api/use-wash`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ userId, washType })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg);
            showResult(result.msg, 'success', result.remaining);
        } catch (error) {
            showResult(error.message, 'danger');
        } finally {
            resetScanner();
        }
    };

    const handleScan = async (userId) => {
        showLoading(`Mencari data member ID: ${userId}...`);
        try {
            const response = await fetch(`/api/user-by-memberid/${userId}`, { 
                headers: { 'x-auth-token': token } 
            });
            const user = await response.json();
            if (!response.ok) throw new Error(user.msg);
            if (!user.membership) throw new Error("Pengguna ini bukan member aktif.");

            if (user.membership.packageName === 'Paket Kombinasi') {
                resultContainer.innerHTML = `
                    <div class="alert alert-primary">
                        <h5>Pilih Jenis Cuci untuk ${user.username}</h5>
                        <p>Paket Kombinasi terdeteksi. Silakan pilih jatah yang akan digunakan.</p>
                        <div class="d-grid gap-2 mt-3">
                            <button class="btn btn-lg btn-info use-wash-btn" data-userid="${userId}" data-washtype="bodywash">
                                Gunakan Jatah Body Wash (Sisa: ${user.membership.washes.bodywash}x)
                            </button>
                            <button class="btn btn-lg btn-primary use-wash-btn" data-userid="${userId}" data-washtype="hidrolik">
                                Gunakan Jatah Cuci Hidrolik (Sisa: ${user.membership.washes.hidrolik}x)
                            </button>
                        </div>
                    </div>`;
                barcodeInput.disabled = false;
                barcodeInput.value = '';
                barcodeInput.focus();
            } else {
                const washType = user.membership.washes.bodywash > 0 ? 'bodywash' : 'hidrolik';
                useWash(userId, washType);
            }
        } catch (error) {
            showResult(error.message, 'danger');
            resetScanner();
        }
    };

    barcodeInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            const userId = barcodeInput.value.trim();
            if (userId) handleScan(userId);
        }
    });

    resultContainer.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('use-wash-btn')) {
            const userId = e.target.dataset.userid;
            const washType = e.target.dataset.washtype;
            useWash(userId, washType);
        }
    });

    barcodeInput.focus();
    document.body.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
            barcodeInput.focus();
        }
    });
});
