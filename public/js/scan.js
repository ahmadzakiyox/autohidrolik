// File: /js/scan.js (Dengan Opsi Kamera)

document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    const barcodeInput = document.getElementById('barcode-input');
    const resultContainer = document.getElementById('result');
    
    // --- ELEMEN BARU UNTUK KAMERA ---
    const cameraReader = document.getElementById('camera-reader');
    const toggleCameraButton = document.getElementById('toggle-camera-btn');
    let isCameraScanning = false;
    
    // Inisialisasi library scanner kamera
    const html5QrCode = new Html5Qrcode("camera-reader");

    // Keamanan: Hanya admin yang boleh mengakses halaman ini
    if (!token || userRole !== 'admin') {
        alert('Akses ditolak. Anda harus login sebagai admin.');
        window.location.href = '/login';
        return;
    }

    // Pastikan input selalu dalam keadaan aktif (fokus)
    barcodeInput.focus();
    document.body.addEventListener('click', (e) => {
        // Jangan re-focus jika user sedang berinteraksi dengan tombol kamera
        if (e.target.id !== 'toggle-camera-btn') {
            barcodeInput.focus();
        }
    });

    // Event listener untuk input dari scanner fisik
    barcodeInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            const userId = barcodeInput.value.trim();
            if (userId) {
                useWash(userId);
            }
        }
    });

    // --- LOGIKA BARU UNTUK KAMERA ---

    // Fungsi yang akan dijalankan jika kamera berhasil memindai barcode
    const onScanSuccess = (decodedText, decodedResult) => {
        // `decodedText` adalah hasil scan (misal: "AH-00001")
        console.log(`Code matched = ${decodedText}`, decodedResult);
        
        // Panggil fungsi yang sudah ada untuk memproses ID
        useWash(decodedText);
        
        // Matikan kamera setelah berhasil
        stopCameraScan();
    };

    // Fungsi untuk memulai pemindaian kamera
    const startCameraScan = () => {
        cameraReader.style.display = 'block';
        toggleCameraButton.innerHTML = '<i class="bi bi-stop-circle"></i> Hentikan Kamera';
        barcodeInput.style.display = 'none'; // Sembunyikan input manual
        isCameraScanning = true;

        // Konfigurasi untuk scanner
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        // Mulai kamera, minta izin jika perlu
        html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
            .catch(err => {
                console.error("Gagal memulai kamera", err);
                alert("Gagal mengakses kamera. Pastikan Anda memberikan izin.");
                stopCameraScan();
            });
    };

    // Fungsi untuk menghentikan pemindaian kamera
    const stopCameraScan = () => {
        html5QrCode.stop().then(() => {
            cameraReader.style.display = 'none';
            toggleCameraButton.innerHTML = '<i class="bi bi-camera-video"></i> Gunakan Kamera';
            barcodeInput.style.display = 'block'; // Tampilkan kembali input manual
            barcodeInput.focus();
            isCameraScanning = false;
        }).catch(err => console.error("Gagal menghentikan kamera", err));
    };

    // Event listener untuk tombol kamera
    toggleCameraButton.addEventListener('click', () => {
        if (isCameraScanning) {
            stopCameraScan();
        } else {
            startCameraScan();
        }
    });
    
    // --- AKHIR LOGIKA BARU ---


    // Fungsi untuk mengirim permintaan ke API /api/use-wash (TIDAK BERUBAH)
    async function useWash(userId) {
        resultContainer.innerHTML = `<div class="alert alert-info">Memproses ID: ${userId}...</div>`;
        barcodeInput.disabled = true;

        try {
            const response = await fetch(`/api/use-wash`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ userId: userId })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg || 'Gagal memproses permintaan.');

            resultContainer.innerHTML = `<div class="alert alert-success"><h5 class="alert-heading">Berhasil!</h5><p>${result.msg}</p><hr><p class="mb-0">Sisa jatah cuci: <strong>${result.remaining}x</strong></p></div>`;
        } catch (error) {
            resultContainer.innerHTML = `<div class="alert alert-danger"><h5 class="alert-heading">Error!</h5><p>${error.message}</p></div>`;
        } finally {
            setTimeout(() => {
                barcodeInput.value = '';
                barcodeInput.disabled = false;
                barcodeInput.focus();
                resultContainer.innerHTML = '';
            }, 3000);
        }
    }
});
