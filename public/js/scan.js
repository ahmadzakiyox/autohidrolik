// public/js/scan.js

document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    // --- ELEMEN UI ---
    const barcodeInput = document.getElementById('barcode-input');
    const resultContainer = document.getElementById('result');
    const cameraReader = document.getElementById('camera-reader');
    const toggleCameraButton = document.getElementById('toggle-camera-btn');
    
    let isCameraScanning = false;
    const html5QrCode = new Html5Qrcode("camera-reader");
    let currentScannedId = null; // Menyimpan ID yang sedang diproses

    // --- FUNGSI UTAMA ---

    // Keamanan: Hanya admin yang boleh mengakses halaman ini
    if (!token || userRole !== 'admin') {
        alert('Akses ditolak. Anda harus login sebagai admin.');
        window.location.href = '/login';
        return;
    }

    // Pastikan input selalu dalam keadaan aktif (fokus)
    const focusInput = () => {
        setTimeout(() => barcodeInput.focus(), 100);
    };
    focusInput();
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('.btn')) return; // Jangan re-focus jika klik tombol
        focusInput();
    });

    // Event listener untuk input dari scanner fisik
    barcodeInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            const userId = barcodeInput.value.trim();
            if (userId) {
                processScannedUser(userId);
            }
        }
    });
    
    /**
     * Langkah 1: Memproses ID yang berhasil di-scan.
     * Mengambil data user dari API.
     */
    async function processScannedUser(userId) {
        currentScannedId = userId; // Simpan ID saat ini
        resultContainer.innerHTML = `<div class="alert alert-info">Memeriksa data member: ${userId}...</div>`;
        barcodeInput.disabled = true;

        try {
            const response = await fetch(`/api/user-by-memberid/${userId}`, {
                headers: { 'x-auth-token': token }
            });
            const user = await response.json();
            if (!response.ok) throw new Error(user.msg || 'Gagal mengambil data member.');
            
            displayUserInfoWithOptions(user);

        } catch (error) {
            showError(error.message);
        }
    }
    
    /**
     * Langkah 2: Menampilkan informasi user dan opsi penggunaan jatah.
     */
    function displayUserInfoWithOptions(user) {
        if (!user.membership || !user.membership.isPaid) {
             showError('Member ini tidak memiliki paket aktif atau belum lunas.');
             return;
        }

        let optionsHtml = '';
        // Jika Paket Kombinasi, tampilkan dua tombol pilihan
        if (user.membership.packageName === 'Paket Kombinasi') {
            optionsHtml = `
                <p class="mt-4">Pilih jatah yang akan digunakan:</p>
                <div class="d-grid gap-2 d-md-flex justify-content-md-center">
                    <button class="btn btn-primary btn-lg use-wash-btn" data-type="bodywash">
                        Gunakan Body Wash (${user.membership.washes.bodywash}x)
                    </button>
                    <button class="btn btn-success btn-lg use-wash-btn" data-type="hidrolik">
                        Gunakan Hidrolik (${user.membership.washes.hidrolik}x)
                    </button>
                </div>
            `;
        } else {
            // Jika paket biasa, tampilkan satu tombol
            optionsHtml = `
                <div class="d-grid gap-2 col-6 mx-auto mt-4">
                    <button class="btn btn-primary btn-lg use-wash-btn" data-type="normal">
                        Gunakan 1 Jatah Cuci
                    </button>
                </div>
            `;
        }
        
        resultContainer.innerHTML = `
            <div class="alert alert-secondary text-center">
                <h4 class="alert-heading">Member Ditemukan!</h4>
                <p>Nama: <strong>${user.username}</strong></p>
                <p>Paket: <strong>${user.membership.packageName}</strong></p>
                <hr>
                ${optionsHtml}
            </div>
        `;
    }

    /**
     * Langkah 3: Mengirim permintaan penggunaan jatah ke API.
     * Dipanggil saat tombol pilihan di klik.
     */
    async function useWash(washType) {
        resultContainer.innerHTML = `<div class="alert alert-info">Memproses permintaan...</div>`;

        const bodyData = { userId: currentScannedId };
        if (washType !== 'normal') {
            bodyData.washType = washType;
        }

        try {
            const response = await fetch(`/api/use-wash`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(bodyData)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg || 'Gagal memproses permintaan.');

            // Tampilkan sisa jatah yang baru
            const user = result.user;
            let remainingText = '';
            if (user.membership.packageName === 'Paket Kombinasi') {
                remainingText = `Body Wash: <strong>${user.membership.washes.bodywash}x</strong>, Hidrolik: <strong>${user.membership.washes.hidrolik}x</strong>`;
            } else {
                remainingText = `Sisa jatah cuci: <strong>${user.membership.remainingWashes}x</strong>`;
            }

            resultContainer.innerHTML = `
                <div class="alert alert-success">
                    <h5 class="alert-heading">Berhasil!</h5>
                    <p>${result.msg}</p>
                    <hr>
                    <p class="mb-0">${remainingText}</p>
                </div>`;

        } catch (error) {
            resultContainer.innerHTML = `
                <div class="alert alert-danger">
                    <h5 class="alert-heading">Error!</h5>
                    <p>${error.message}</p>
                </div>`;
        } finally {
            resetScannerState();
        }
    }

    // Event delegation untuk tombol "Gunakan Jatah"
    resultContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('use-wash-btn')) {
            const washType = e.target.dataset.type;
            useWash(washType);
        }
    });

    // --- FUNGSI BANTU & KAMERA (TIDAK BANYAK BERUBAH) ---
    function showError(message) {
        resultContainer.innerHTML = `<div class="alert alert-danger"><h5 class="alert-heading">Error!</h5><p>${message}</p></div>`;
        resetScannerState();
    }

    function resetScannerState() {
        setTimeout(() => {
            currentScannedId = null;
            barcodeInput.value = '';
            barcodeInput.disabled = false;
            resultContainer.innerHTML = '';
            focusInput();
        }, 4000);
    }
    
    const onScanSuccess = (decodedText, decodedResult) => {
        stopCameraScan();
        processScannedUser(decodedText);
    };

    const startCameraScan = () => {
        cameraReader.style.display = 'block';
        toggleCameraButton.innerHTML = '<i class="bi bi-stop-circle"></i> Hentikan Kamera';
        barcodeInput.style.display = 'none';
        isCameraScanning = true;
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
            .catch(err => {
                alert("Gagal mengakses kamera. Pastikan Anda memberikan izin.");
                stopCameraScan();
            });
    };

    const stopCameraScan = () => {
        if (isCameraScanning) {
            html5QrCode.stop().then(() => {
                cameraReader.style.display = 'none';
                toggleCameraButton.innerHTML = '<i class="bi bi-camera-video"></i> Gunakan Kamera';
                barcodeInput.style.display = 'block';
                focusInput();
                isCameraScanning = false;
            }).catch(err => console.error("Gagal menghentikan kamera", err));
        }
    };
    
    toggleCameraButton.addEventListener('click', () => {
        if (isCameraScanning) stopCameraScan();
        else startCameraScan();
    });
});
