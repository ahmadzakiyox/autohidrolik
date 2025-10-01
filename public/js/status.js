document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

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
        // ================== PERUBAHAN DI SINI ==================
        // Tampilkan Spesifikasi
        document.getElementById('spec-hostname').textContent = data.specs.hostname;
        document.getElementById('spec-os-type').textContent = data.specs.osType;
        document.getElementById('spec-platform').textContent = data.specs.platform;
        document.getElementById('spec-arch').textContent = data.specs.arch;
        document.getElementById('spec-cpu-model').textContent = data.specs.cpuModel;
        document.getElementById('spec-cpu-cores').textContent = data.specs.cpuCores;
        document.getElementById('spec-free-mem').textContent = `${(data.specs.freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`;
        document.getElementById('spec-total-mem').textContent = `${(data.specs.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`;
        
        const uptimeSeconds = data.specs.uptime;
        const days = Math.floor(uptimeSeconds / (3600 * 24));
        const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        document.getElementById('spec-uptime').textContent = `${days} hari, ${hours} jam, ${minutes} menit`;
        // ================= AKHIR PERUBAHAN =================

        // Tampilkan Log
        const logContainer = document.getElementById('log-container');
        logContainer.innerHTML = '';
        if (data.logs.length === 0) {
            logContainer.innerHTML = 'Tidak ada log untuk ditampilkan.';
        } else {
            data.logs.forEach(log => {
                const logEntry = document.createElement('div');
                let logClass = 'log-default';
                const logLower = log.toLowerCase();
                if (logLower.includes('error') || logLower.includes('gagal')) {
                    logClass = 'log-error';
                } else if (logLower.includes('berhasil') || logLower.includes('sukses')) {
                    logClass = 'log-info';
                }
                logEntry.innerHTML = `<span class="log-timestamp">[${log.timestamp}]</span> <span class="${logClass}">${log.message}</span>`;
                logContainer.appendChild(logEntry);
            });
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    };

    document.getElementById('refresh-log-btn').addEventListener('click', fetchData);

    fetchData();
});
