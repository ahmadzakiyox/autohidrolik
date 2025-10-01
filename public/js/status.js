document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    // Cek keamanan
    if (!token || localStorage.getItem('userRole') !== 'admin') {
        document.body.innerHTML = `<div class="text-center p-5"><h1>Akses Ditolak</h1><p>Hanya admin yang dapat mengakses halaman ini.</p><a href="/login">Kembali ke Login</a></div>`;
        return;
    }

    const loadingState = document.getElementById('loading-state');
    const contentState = document.getElementById('content-state');

    const fetchData = async () => {
        try {
            loadingState.classList.remove('d-none');
            contentState.classList.add('d-none');

            const response = await fetch('/api/server-status', {
                headers: { 'x-auth-token': token }
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.msg || 'Gagal mengambil data server.');
            }

            const data = await response.json();
            displayData(data);

        } catch (error) {
            document.getElementById('loading-state').innerHTML = `<p class="text-danger text-center">${error.message}</p>`;
        } finally {
            loadingState.classList.add('d-none');
            contentState.classList.remove('d-none');
        }
    };

    const displayData = (data) => {
        // Tampilkan Spesifikasi
        document.getElementById('spec-platform').textContent = data.specs.platform;
        document.getElementById('spec-arch').textContent = data.specs.arch;
        document.getElementById('spec-free-mem').textContent = `${(data.specs.freeMemory / 1024 / 1024).toFixed(2)} MB`;
        document.getElementById('spec-total-mem').textContent = `${(data.specs.totalMemory / 1024 / 1024).toFixed(2)} MB`;
        document.getElementById('spec-uptime').textContent = `${(data.specs.uptime / 3600).toFixed(2)} jam`;

        // Tampilkan Log
        const logContainer = document.getElementById('log-container');
        logContainer.innerHTML = '';
        if (data.logs.length === 0) {
            logContainer.innerHTML = 'Tidak ada log untuk ditampilkan.';
        } else {
            data.logs.forEach(log => {
                const logEntry = document.createElement('div');
                let logClass = 'log-info';
                if (log.toLowerCase().includes('error') || log.toLowerCase().includes('gagal')) {
                    logClass = 'log-error';
                }
                logEntry.innerHTML = `<span class="log-timestamp">[${new Date().toLocaleString('id-ID')}]</span> <span class="${logClass}">${log}</span>`;
                logContainer.appendChild(logEntry);
            });
            // Auto scroll ke bawah
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    };

    document.getElementById('refresh-log-btn').addEventListener('click', fetchData);

    // Muat data saat halaman pertama kali dibuka
    fetchData();
});
