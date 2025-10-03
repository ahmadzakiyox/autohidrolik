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
    let currentQrData = null; // Menyimpan seluruh data QR yang di-scan

    // --- FUNGSI UTAMA ---

    if (!token || userRole !== 'admin') {
        alert('Akses ditolak. Anda harus login sebagai admin.');
        window.location.href = '/login';
        return;
    }

    const focusInput = () => {
        setTimeout(() => barcodeInput.focus(), 100);
    };
    focusInput();
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('.btn')) return;
        focusInput();
    });

    barcodeInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            const qrData = barcodeInput.value.trim();
            if (qrData) {
                processScannedQr(qrData);
            }
        }
    });
    
    // ================== PERUBAHAN LOGIKA UTAMA DI SINI ==================
    async function processScannedQr(qrData) {
        currentQrData = qrData;
        resultContainer.innerHTML = `<div class="alert alert-info">Memeriksa data dari QR Code...</div>`;
        barcodeInput.disabled = true;

        // 1. Pisahkan Member ID dan Package ID dari data QR
        if (!qrData.includes(';')) {
            showError('Format QR Code tidak valid. Pastikan QR Code berasal dari sistem yang benar.');
            return;
        }
        const [memberId, packageId] = qrData.split(';');

        try {
            // 2. Ambil data user HANYA menggunakan Member ID
            const response = await fetch(`/api/user-by-memberid/${memberId}`, {
                headers: { 'x-auth-token': token }
            });
            const user = await response.json();
            if (!response.ok) throw new Error(user.msg || 'Gagal mengambil data member.');
            
            // 3. Cari paket spesifik berdasarkan Package ID yang didapat dari QR
            const targetPackage = user.memberships.find(pkg => pkg.packageId === packageId);
            if (!targetPackage) {
                throw new Error('Paket spesifik tidak ditemukan untuk member ini. Mungkin paket sudah lama atau tidak valid.');
            }

            displayUserInfoWithOptions(user, targetPackage);

        } catch (error) {
            showError(error.message);
        }
    }
    
    function displayUserInfoWithOptions(user, pkg) {
        if (!pkg.isPaid) {
             showError('Paket member ini belum lunas.');
             return;
        }
        if (new Date(pkg.expiresAt) < new Date()) {
            showError('Paket member ini sudah kedaluwarsa.');
            return;
        }

        let optionsHtml = '';
        if (pkg.packageName.toLowerCase().includes('kombinasi')) {
            optionsHtml = `
                <p class="mt-4">Pilih jatah yang akan digunakan:</p>
                <div class="d-grid gap-2 d-md-flex justify-content-md-center">
                    <button class="btn btn-primary btn-lg use-wash-btn" data-type="bodywash">Gunakan Body Wash (${pkg.washes.bodywash}x)</button>
                    <button class="btn btn-success btn-lg use-wash-btn" data-type="hidrolik">Gunakan Hidrolik (${pkg.washes.hidrolik}x)</button>
                </div>`;
        } else {
            optionsHtml = `
                <div class="d-grid gap-2 col-6 mx-auto mt-4">
                    <button class="btn btn-primary btn-lg use-wash-btn" data-type="normal">Gunakan 1 Jatah Cuci (${pkg.remainingWashes}x)</button>
                </div>`;
        }
        
        resultContainer.innerHTML = `
            <div class="alert alert-secondary text-center">
                <h4 class="alert-heading">Member Ditemukan!</h4>
                <p>Nama: <strong>${user.username}</strong></p>
                <p>Paket: <strong>${pkg.packageName}</strong></p>
                <hr>
                ${optionsHtml}
            </div>`;
    }

    async function useWash(washType) {
        resultContainer.innerHTML = `<div class="alert alert-info">Memproses permintaan...</div>`;

        try {
            const response = await fetch(`/api/use-wash`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ qrData: currentQrData, washType: washType === 'normal' ? undefined : washType })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg || 'Gagal memproses permintaan.');

            const updatedUser = result.user;
            const updatedPackage = updatedUser.memberships.find(p => p.packageId === currentQrData.split(';')[1]);
            
            let remainingText = '';
            if (updatedPackage.packageName.toLowerCase().includes('kombinasi')) {
                remainingText = `Sisa jatah -> Body Wash: <strong>${updatedPackage.washes.bodywash}x</strong>, Hidrolik: <strong>${updatedPackage.washes.hidrolik}x</strong>`;
            } else {
                remainingText = `Sisa jatah cuci: <strong>${updatedPackage.remainingWashes}x</strong>`;
            }

            resultContainer.innerHTML = `
                <div class="alert alert-success">
                    <h5 class="alert-heading">Berhasil!</h5>
                    <p>${result.msg}</p>
                    <hr>
                    <p class="mb-0">${remainingText}</p>
                </div>`;

        } catch (error) {
            resultContainer.innerHTML = `<div class="alert alert-danger"><h5 class="alert-heading">Error!</h5><p>${error.message}</p></div>`;
        } finally {
            resetScannerState();
        }
    }
    // ================== AKHIR PERUBAHAN ==================

    resultContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('use-wash-btn')) {
            const washType = e.target.dataset.type;
            useWash(washType);
        }
    });

    function showError(message) {
        resultContainer.innerHTML = `<div class="alert alert-danger"><h5 class="alert-heading">Error!</h5><p>${message}</p></div>`;
        resetScannerState();
    }

    function resetScannerState() {
        setTimeout(() => {
            currentQrData = null;
            barcodeInput.value = '';
            barcodeInput.disabled = false;
            resultContainer.innerHTML = '';
            focusInput();
        }, 4000);
    }
    
    const onScanSuccess = (decodedText, decodedResult) => {
        stopCameraScan();
        processScannedQr(decodedText);
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
