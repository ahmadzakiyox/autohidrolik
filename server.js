


// Import dependensi
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const exceljs = require('exceljs');
const nodemailer = require('nodemailer');
const os = require('os'); // Diperlukan untuk status server
const path = require('path'); // Modul 'path' diperlukan
require('dotenv').config();

// Inisialisasi Aplikasi Express
const app = express();

// ================== PENANGKAP LOG (DIPERBARUI) ==================
const serverLogs = [];
const originalConsoleLog = console.log;
console.log = (...args) => {
    originalConsoleLog.apply(console, args);
    const logMessage = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    // Tambahkan timestamp ke setiap log
    serverLogs.push({
        message: logMessage,
        timestamp: new Date().toLocaleString('id-ID', { hour12: false })
    });
    if (serverLogs.length > 100) {
        serverLogs.shift();
    }
};
// ================== AKHIR PENANGKAP LOG ==================

// Import Model
const User = require('./models/User');
const Review = require('./models/Review'); // Pastikan model Review diimpor
const Visitor = require('./models/Visitor');
const Transaction = require('./models/Transaction');

// --- Middleware ---
const whitelist = ['https://autohidrolik.com', 'www.autohidrolik.com'];
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200 
};
app.use(cors());
app.use(express.json());


// --- Inisialisasi Layanan ---
// Nodemailer (Email)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});
// Twilio (SMS)

// --- Koneksi ke MongoDB ---
mongoose.connect(process.env.MONGO_URI, {})
  .then(() => console.log('Berhasil terhubung ke MongoDB Atlas'))
  .catch(err => console.log('Koneksi MongoDB gagal:', err));

// --- Middleware Otentikasi ---
// Di dalam file server.js

// --- GANTI SELURUH BLOK INI ---
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'Tidak ada token, otorisasi ditolak' });
    try {
        // Membaca dari environment variable yang diatur di hosting
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        res.status(400).json({ msg: 'Token tidak valid' });
    }
};

const adminAuth = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Akses ditolak. Hanya untuk Admin.' });
        }
        next();
    } catch (error) {
        res.status(500).send('Server error');
    }
};

// Fungsi untuk membuat ID member unik acak
async function generateUniqueMemberId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const idLength = 6;
    let newId;
    let isUnique = false;

    while (!isUnique) {
        let randomPart = '';
        for (let i = 0; i < idLength; i++) {
            randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        newId = `AH-${randomPart}`;
        const existingUser = await User.findOne({ memberId: newId });
        if (!existingUser) {
            isUnique = true;
        }
    }
    return newId;
}

// --- Fungsi Helper Baru ---
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
}

// --- Fungsi Helper untuk Menghitung Tanggal Kedaluwarsa ---
function calculateExpiryDate(months = 6) { // Default 3 bulan
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + months);
    return expiryDate;
}


app.get('/api/server-status', auth, adminAuth, (req, res) => {
    try {
        const cpus = os.cpus();
        const cpuModel = cpus.length > 0 ? cpus[0].model : 'N/A';
        const cpuCores = cpus.length;

        const specs = {
            hostname: os.hostname(),
            osType: os.type(),
            platform: os.platform(),
            arch: os.arch(),
            cpuModel: cpuModel,
            cpuCores: cpuCores,
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            uptime: os.uptime(),
        };
        res.json({
            specs,
            logs: serverLogs.slice().reverse()
        });
    } catch (error) {
        console.log('Error saat mengambil status server:', error.message);
        res.status(500).json({ msg: 'Gagal mengambil status server.' });
    }
});
// ================== AKHIR RUTE BARU ==================


// ======================================================
// --- API ROUTES ---
// ======================================================

app.post('/api/register', async (req, res) => {
    try {
        const { username, email, phone, password } = req.body;

        // 1. Validasi Input Wajib
        if (!username || !phone || !password) {
            return res.status(400).json({ msg: 'Username, Nomor WhatsApp, dan Password wajib diisi.' });
        }

        // 2. Validasi Format
        if (password.length < 6) {
            return res.status(400).json({ msg: 'Password minimal harus 6 karakter.' });
        }
        if (email && !/\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ msg: 'Format email tidak valid.' });
        }

        // 3. Pengecekan Duplikasi
        const queryConditions = [{ username }, { phone }];
        if (email) {
            queryConditions.push({ email: email.toLowerCase() });
        }
        
        const existingUser = await User.findOne({ $or: queryConditions });

        if (existingUser) {
            if (existingUser.username === username) return res.status(400).json({ msg: 'Username sudah terdaftar.' });
            if (existingUser.phone === phone) return res.status(400).json({ msg: 'Nomor WhatsApp sudah terdaftar.' });
            if (email && existingUser.email === email.toLowerCase()) return res.status(400).json({ msg: 'Email sudah terdaftar.' });
        }

        // 4. Proses Pembuatan User
        const hashedPassword = await bcrypt.hash(password, 10);
        const memberId = await generateUniqueMemberId();
        
        // ===== TAMBAHKAN LOGIKA INI =====
// Cari user dengan nomor urut tertinggi
const lastUser = await User.findOne().sort({ displayOrder: -1 });
const newDisplayOrder = lastUser && lastUser.displayOrder ? lastUser.displayOrder + 1 : 1;

        // --- PERUBAHAN UTAMA DI SINI ---
        // Kita buat objek data user terlebih dahulu
        const userData = {
            username,
            phone,
            password: hashedPassword,
            isVerified: true,
            memberId: memberId
        };

        // Tambahkan email ke objek HANYA JIKA email diisi
        if (email) {
            userData.email = email.toLowerCase();
        }

        // Buat user baru dari objek data yang sudah disiapkan
        const newUser = new User(userData);
        // --- AKHIR PERUBAHAN ---
        
        await newUser.save();
        
        res.status(201).json({ msg: 'Registrasi berhasil! Anda akan dialihkan ke halaman login.' });

    } catch (error) {
        console.error("Error di /api/register:", error);
        if (error.code === 11000) {
            return res.status(400).json({ msg: 'Username, email, atau nomor HP ini baru saja didaftarkan.' });
        }
        res.status(500).send('Terjadi kesalahan pada server');
    }
});

// --- RUTE BARU: ADMIN MENGHAPUS PAKET MEMBER ---
app.delete('/api/users/:userId/packages/:packageId', auth, adminAuth, async (req, res) => {
    try {
        const { userId, packageId } = req.params;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ msg: 'User tidak ditemukan.' });
        }

        // Cari paket yang akan dihapus dari array memberships
        const packageIndex = user.memberships.findIndex(p => p._id.toString() === packageId);

        if (packageIndex === -1) {
            return res.status(404).json({ msg: 'Paket tidak ditemukan.' });
        }

        // Hapus paket dari array
        user.memberships.splice(packageIndex, 1);

        await user.save(); // Simpan perubahan pada dokumen user

        res.json({ msg: `Paket berhasil dihapus dari user ${user.username}.` });

    } catch (error) {
        console.error("Error di /api/users/:userId/packages/:packageId:", error.message);
        res.status(500).send('Server error');
    }
});

// Rute Verifikasi OTP dengan Logging
app.post('/api/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    try {
        console.log(`[Verifikasi] Menerima permintaan untuk email: ${email} dengan OTP: ${otp}`);

        const user = await User.findOne({ email: email });

        if (!user) {
            console.log(`[Verifikasi Gagal] User dengan email ${email} tidak ditemukan.`);
            return res.status(400).json({ msg: 'Pengguna tidak ditemukan.' });
        }

        console.log(`[Verifikasi] OTP di database untuk ${email} adalah: ${user.otp}`);

        if (user.otp !== otp) {
            console.log(`[Verifikasi Gagal] OTP tidak cocok. Diterima: ${otp}, Seharusnya: ${user.otp}`);
            return res.status(400).json({ msg: 'Kode OTP tidak cocok.' });
        }

        if (user.otpExpires < Date.now()) {
            console.log(`[Verifikasi Gagal] OTP sudah kedaluwarsa.`);
            return res.status(400).json({ msg: 'Kode OTP sudah kedaluwarsa.' });
        }

        user.isVerified = true;
        user.otp = null;
        user.otpExpires = null;
        await user.save();
        
        console.log(`[Verifikasi Sukses] Akun untuk ${email} berhasil diverifikasi.`);
        res.json({ msg: 'Akun Anda berhasil diverifikasi! Silakan login.' });
    } catch (error) {
        console.error("Error di /api/verify-otp:", error);
        res.status(500).send('Server error');
    }
});

// ### PENAMBAHAN BARU: Rute untuk memperpanjang masa aktif member ###
app.post('/api/users/:id/extend', auth, adminAuth, async (req, res) => {
    const { months } = req.body;
    const userId = req.params.id;

    // Validasi input
    const duration = parseInt(months);
    if (!duration || ![1, 3, 6].includes(duration)) {
        return res.status(400).json({ msg: 'Durasi perpanjangan tidak valid. Harap pilih 1, 3, atau 6 bulan.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user || !user.membership) {
            return res.status(404).json({ msg: 'Member tidak ditemukan atau tidak memiliki paket.' });
        }

        const today = new Date();
        // Tentukan tanggal dasar: tanggal kedaluwarsa saat ini jika masih aktif, atau hari ini jika sudah lewat.
        const baseDate = (user.membership.expiresAt && new Date(user.membership.expiresAt) > today)
            ? new Date(user.membership.expiresAt)
            : new Date();

        // Tambahkan bulan sesuai durasi
        baseDate.setMonth(baseDate.getMonth() + duration);
        user.membership.expiresAt = baseDate;

        await user.save();
        
        res.json({ msg: `Masa aktif untuk ${user.username} berhasil diperpanjang selama ${duration} bulan.` });

    } catch (error) {
        console.error("Error saat memperpanjang masa aktif:", error);
        res.status(500).send('Server error');
    }
});

app.post('/api/profile/change-password', auth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    try {
        // 1. Validasi input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ msg: 'Semua kolom wajib diisi.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ msg: 'Password baru minimal harus 6 karakter.' });
        }

        // 2. Ambil data user dari database
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User tidak ditemukan.' });
        }

        // 3. Verifikasi password saat ini
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Password saat ini salah.' });
        }

        // 4. Hash dan simpan password baru
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ msg: 'Password berhasil diperbarui.' });

    } catch (error) {
        console.error("Error di /api/profile/change-password:", error);
        res.status(500).send('Server error');
    }
});

// --- RUTE BARU: ADMIN MENGUPDATE TANGGAL KEDALUWARSA MEMBER ---
app.put('/api/users/:id/update-expiry', auth, adminAuth, async (req, res) => {
    const { newExpiryDate } = req.body;

    // Validasi input
    if (!newExpiryDate) {
        return res.status(400).json({ msg: 'Tanggal kedaluwarsa baru wajib diisi.' });
    }

    try {
        const user = await User.findById(req.params.id);
        if (!user || !user.membership) {
            return res.status(404).json({ msg: 'Data member tidak ditemukan.' });
        }

        // Update tanggal kedaluwarsa
        user.membership.expiresAt = new Date(newExpiryDate);
        user.markModified('membership'); // Penting saat mengubah sub-dokumen
        await user.save();

        res.json({ msg: `Tanggal kedaluwarsa untuk ${user.username} berhasil diperbarui.` });

    } catch (error) {
        console.error("Error di /api/users/:id/update-expiry:", error);
        res.status(500).send('Server error');
    }
});

// --- RUTE STATISTIK DASHBOARD (DIPERBARUI) ---
app.get('/api/dashboard-stats', auth, adminAuth, async (req, res) => {
    try {
        const activeMembers = await User.countDocuments({ 'membership.isPaid': true });

        const visitorData = await Visitor.findOne({ identifier: 'global-visitor-count' });
        const totalVisitors = visitorData ? visitorData.count : 0;

        // --- LOGIKA BARU: HITUNG TOTAL DARI KOLEKSI TRANSAKSI ---
        const transactionAggregation = await Transaction.aggregate([
            {
                $group: {
                    _id: null, // Mengelompokkan semua dokumen menjadi satu
                    totalAmount: { $sum: "$amount" } // Menjumlahkan semua nilai dari field 'amount'
                }
            }
        ]);
        
        const totalTransactions = transactionAggregation.length > 0 ? transactionAggregation[0].totalAmount : 0;
        // --- AKHIR LOGIKA BARU ---

        res.json({
            activeMembers,
            totalVisitors,
            totalTransactions
        });

    } catch (error) {
        console.error("Error mengambil statistik dashboard:", error);
        res.status(500).send('Server error');
    }
});

// Rute Login (Diperbaiki)
// --- RUTE LOGIN (DIPERBAIKI) ---
app.post('/api/login', async (req, res) => {
    try {
        // 1. Ambil 'identifier' (email/nomor hp) dan password dari body request
        const { identifier, password } = req.body;

        // 2. Validasi input dasar
        if (!identifier || !password) {
            return res.status(400).json({ msg: 'Silakan isi semua kolom.' });
        }

        // 3. Cari pengguna di database berdasarkan email ATAU nomor hp
        const user = await User.findOne({
            $or: [{ email: identifier }, { phone: identifier }]
        });

        // 4. Jika pengguna tidak ditemukan, kirim pesan error yang sama
        if (!user) {
            return res.status(400).json({ msg: 'Email/Nomor WhatsApp atau password salah.' });
        }

        // 5. Verifikasi password yang dienkripsi
        // Bandingkan password yang dikirim pengguna dengan hash yang ada di database
        const isMatch = await bcrypt.compare(password, user.password);

        // Jika password tidak cocok, kirim pesan error yang sama
        if (!isMatch) {
            return res.status(400).json({ msg: 'Email/Nomor WhatsApp atau password salah.' });
        }

        // 6. Jika semua verifikasi berhasil, buat payload untuk token
        const payload = {
            id: user._id,
            role: user.role,
            username: user.username
        };
        
        // 7. Buat token JWT
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET || 'your_super_secret_key', // Gunakan secret key dari .env
            { expiresIn: '1h' } // Token akan kedaluwarsa dalam 1 jam
        );
        
        // 8. Kirim respons sukses beserta token dan data pengguna
        res.json({
            msg: 'Login berhasil!',
            token, // Token ini akan disimpan oleh frontend
            user: { 
                id: user._id, 
                username: user.username,
                role: user.role // Kirim role agar frontend tahu harus mengarahkan ke mana
            }
        });

    } catch (error) {
        // Tangani jika ada error tak terduga di server
        console.error("Error di /api/login:", error);
        res.status(500).json({ msg: 'Terjadi kesalahan pada server.' });
    }
});

// server.js

// RUTE BARU: Admin mengupdate jatah cuci Paket Kombinasi
app.put('/api/users/:id/update-combo-washes', auth, adminAuth, async (req, res) => {
    const { bodywash, hidrolik } = req.body;

    try {
        const user = await User.findById(req.params.id);

        // Validasi
        if (!user) {
            return res.status(404).json({ msg: 'User tidak ditemukan' });
        }
        if (!user.membership || user.membership.packageName !== 'Paket Kombinasi') {
            return res.status(400).json({ msg: 'User ini tidak memiliki Paket Kombinasi aktif.' });
        }

        // Update jatah
        user.membership.washes.bodywash = parseInt(bodywash, 10);
        user.membership.washes.hidrolik = parseInt(hidrolik, 10);

        user.markModified('membership'); // Penting untuk menyimpan sub-dokumen
        await user.save();

        res.json({ msg: `Jatah cuci untuk ${user.username} berhasil diperbarui.`, user });

    } catch (error) {
        console.error("Error di update-combo-washes:", error.message);
        res.status(500).send('Server error');
    }
});

// RUTE BARU: Admin membuat transaksi koreksi manual
app.post('/api/transactions/correction', auth, adminAuth, async (req, res) => {
    const { amount, note } = req.body;

    // Validasi input
    if (!amount || !note || isNaN(parseInt(amount))) {
        return res.status(400).json({ msg: 'Jumlah dan catatan wajib diisi dengan benar.' });
    }

    try {
        const adminUser = await User.findById(req.user.id);

        const newTransaction = new Transaction({
            user: req.user.id,
            username: adminUser.username, // atau bisa juga 'ADMIN'
            packageName: note, // Gunakan field ini untuk menyimpan catatan koreksi
            amount: parseInt(amount)
        });

        await newTransaction.save();
        res.status(201).json({ msg: 'Transaksi koreksi berhasil ditambahkan.' });

    } catch (error) {
        console.error("Error saat membuat transaksi koreksi:", error);
        res.status(500).send('Server error');
    }
});

// Rute Profil (GET)
app.get('/api/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Rute Update Profil
app.put('/api/profile', auth, async (req, res) => {
    const { username, email, fullName, phone, address, vehicles } = req.body;
    const profileFields = {};
    if (username) profileFields.username = username;
    if (email) profileFields.email = email;
    if (fullName) profileFields.fullName = fullName;
    if (phone) profileFields.phone = phone;
    if (address) profileFields.address = address;
    if (vehicles) profileFields.vehicles = vehicles;
    try {
        let user = await User.findByIdAndUpdate(req.user.id, { $set: profileFields }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ msg: 'User tidak ditemukan' });
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// --- RUTE BARU: USER MENGUPDATE KARTU NANO MILIKNYA ---
app.put('/api/profile/update-nanocard', auth, async (req, res) => {
    const { ownerName, plateNumber } = req.body;

    // Validasi dasar
    if (!ownerName || !plateNumber) {
        return res.status(400).json({ msg: 'Nama Pemilik dan No. Polisi wajib diisi.' });
    }

    try {
        // Cari user berdasarkan token yang login
        const user = await User.findById(req.user.id);
        
        if (!user || !user.nanoCoatingCard) {
            return res.status(404).json({ msg: 'Kartu maintenance untuk user ini tidak ditemukan.' });
        }

        // Update data kartu nano
        user.nanoCoatingCard.ownerName = ownerName;
        user.nanoCoatingCard.plateNumber = plateNumber;
        user.markModified('nanoCoatingCard'); // Tandai bahwa sub-dokumen ini diubah
        
        await user.save(); // Simpan perubahan

        res.json({ msg: `Data kartu untuk ${user.username} berhasil diperbarui.` });

    } catch (error) {
        console.error("Error di /api/profile/update-nanocard:", error);
        res.status(500).send('Server error');
    }
});

// --- RUTE ADMIN: MANAJEMEN PENGGUNA ---
app.get('/api/users', auth, adminAuth, async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } })
            .select('-password')
            .sort({ displayOrder: 1, date: 1 }); // Urutkan
      
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// --- RUTE BARU: ADMIN MENGEDIT NOMOR URUT USER ---
app.put('/api/users/:id/update-order', auth, adminAuth, async (req, res) => {
    try {
        const { newOrder } = req.body;
        if (newOrder === undefined || isNaN(parseInt(newOrder))) {
            return res.status(400).json({ msg: 'Nomor urut harus berupa angka.' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User tidak ditemukan.' });
        }

        user.displayOrder = parseInt(newOrder);
        await user.save();
        res.json({ msg: `Nomor urut untuk ${user.username} berhasil diubah.` });

    } catch (error) {
        console.error("Error saat mengupdate nomor urut user:", error);
        res.status(500).send('Server error');
    }
});


// POST: Menambah pengguna baru (oleh Admin)
app.post('/api/users', auth, adminAuth, async (req, res) => {
    const { username, email, phone, password, role } = req.body;
    try {
        if (await User.findOne({ email })) {
            return res.status(400).json({ msg: 'Email sudah ada' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const memberId = await generateUniqueMemberId();
        
        const newUser = new User({ 
            username, 
            email, 
            phone, 
            password: hashedPassword, 
            role, 
            isVerified: true,
            memberId: memberId
        });
        
        await newUser.save();
        res.status(201).json(newUser);
    } catch (err) {
        console.error("Error di /api/users (POST):", err.message);
        res.status(500).send('Server error');
    }
});

app.put('/api/users/:id', auth, adminAuth, async (req, res) => {
    // --- PERBAIKAN DI SINI ---
    const { username, email, phone, role } = req.body; // Tambahkan 'phone'
    try {
        // Buat objek field yang akan diupdate
        const updateFields = { username, email, phone, role };

        let user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updateFields }, // Gunakan objek yang baru
            { new: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ msg: 'User tidak ditemukan' });
        }
        
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.delete('/api/users/:id', auth, adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User tidak ditemukan' });
        await user.deleteOne();
        res.json({ msg: 'User berhasil dihapus' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.post('/api/users/:id/reset-password', auth, adminAuth, async (req, res) => {
    const { newPassword } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'Pengguna tidak ditemukan.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ msg: `Kata sandi untuk ${user.username} berhasil direset.` });
    } catch (err) {
        console.error("Error di reset-password:", err.message);
        res.status(500).send('Server error');
    }
});

// --- RUTE LUPA & RESET SANDI ---

app.post('/api/forgot-password', async (req, res) => {
    // Sekarang kita hanya butuh email, bukan 'contact' atau 'method'
    const { email } = req.body; 
    try {
        // Cari pengguna hanya berdasarkan email
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(404).json({ msg: 'Pengguna dengan email tersebut tidak ditemukan.' });
        }

        const otp = generateOTP();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP berlaku 10 menit
        await user.save();

        // Kirim OTP hanya melalui email
        await transporter.sendMail({
            from: `"AUTOHIDROLIK" <${process.env.GMAIL_USER}>`,
            to: user.email,
            subject: 'Kode Reset Kata Sandi',
            text: `Gunakan kode ini untuk mereset kata sandi Anda: ${otp}`
        });
        
        res.json({ msg: `Kode OTP telah dikirim ke ${email}.` });
    } catch (error) {
        console.error("Error di /api/forgot-password:", error);
        res.status(500).send('Server error');
    }
});


// 5. Rute Baru: Reset Sandi (Verifikasi OTP & Set Sandi Baru)
app.post('/api/forgot-password', async (req, res) => {
    // 1. Log saat permintaan diterima
    console.log('\n--- Menerima Permintaan Lupa Sandi ---');
    console.log('Data yang diterima:', req.body);

    const { email } = req.body; 
    try {
        const user = await User.findOne({ email: email });

        // 2. Log hasil pencarian pengguna
        if (!user) {
            console.log(`Pencarian Pengguna: Tidak ditemukan pengguna dengan email ${email}.`);
            return res.status(404).json({ msg: 'Pengguna dengan email tersebut tidak ditemukan.' });
        }
        console.log(`Pencarian Pengguna: Ditemukan pengguna -> ${user.username}`);

        // 3. Log OTP yang dibuat
        const otp = generateOTP();
        console.log(`OTP Dibuat: Kode OTP baru adalah ${otp}`);
        
        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 menit
        await user.save();

        // 4. Log konfirmasi bahwa OTP sudah disimpan di database
        console.log(`Penyimpanan: OTP untuk ${user.username} berhasil disimpan ke database.`);

        // 5. Log simulasi pengiriman email (ini akan tetap menjadi cara Anda melihat OTP)
        console.log(`============================================`);
        console.log(`KODE OTP UNTUK RESET SANDI ${user.username} ADALAH: ${otp}`);
        console.log(`============================================`);

        // Kirim email sungguhan
        await transporter.sendMail({
            from: `"AUTOHIDROLIK" <${process.env.GMAIL_USER}>`,
            to: user.email,
            subject: 'Kode Reset Kata Sandi',
            text: `Gunakan kode ini untuk mereset kata sandi Anda: ${otp}`
        });
        
        console.log(`Pengiriman: Email OTP berhasil dikirim ke ${user.email}.`);
        console.log('--- Permintaan Lupa Sandi Selesai ---');
        res.json({ msg: `Kode OTP telah dikirim ke ${email}.` });

    } catch (error) {
        // 6. Log jika terjadi error di server
        console.error("!!! ERROR di /api/forgot-password:", error);
        res.status(500).send('Server error');
    }
});

// --- RUTE REVIEW ---
app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ date: -1 }).limit(6).populate('user', 'username');
        res.json(reviews);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.post('/api/reviews', auth, async (req, res) => {
    const { rating, comment } = req.body;
    try {
        // --- PERBAIKAN DI SINI ---
        // 1. Cari pengguna yang sedang login untuk mendapatkan username-nya
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'Pengguna tidak ditemukan.' });
        }

        // 2. Sertakan username saat membuat ulasan baru
        const newReview = new Review({
            rating,
            comment,
            user: req.user.id,
            username: user.username // <-- Tambahkan baris ini
        });

        const review = await newReview.save();
        res.status(201).json(review);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.get('/api/reviews/all', auth, adminAuth, async (req, res) => {
    try {
        const reviews = await Review.find().sort({ date: -1 }).populate('user', 'username');
        res.json(reviews);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.put('/api/reviews/:id', auth, adminAuth, async (req, res) => {
    const { rating, comment } = req.body;
    try {
        let review = await Review.findByIdAndUpdate(req.params.id, { $set: { rating, comment } }, { new: true });
        if (!review) return res.status(404).json({ msg: 'Ulasan tidak ditemukan' });
        res.json(review);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.delete('/api/reviews/:id', auth, adminAuth, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ msg: 'Ulasan tidak ditemukan' });
        await review.deleteOne();
        res.json({ msg: 'Ulasan berhasil dihapus' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Rute Pembelian Paket oleh User (Diperbarui)
app.post('/api/purchase-membership', auth, async (req, res) => {
    const { packageName, totalWashes } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'Pengguna tidak ditemukan.' });

        const packageId = `PKG-${Date.now()}`; // Pindahkan deklarasi ke sini

        const newMembership = {
            packageName: packageName,
            isPaid: false,
            expiresAt: calculateExpiryDate(),
            packageId: packageId // Sekarang variabel sudah ada
        };

        if (packageName.toLowerCase().includes('kombinasi')) {
            newMembership.washes = { bodywash: 5, hidrolik: 7 };
            newMembership.remainingWashes = 12;
            newMembership.totalWashes = 12;
        } else {
            newMembership.totalWashes = totalWashes;
            newMembership.remainingWashes = totalWashes;
        }

        user.memberships.push(newMembership);
        await user.save();
        res.json({ msg: 'Paket berhasil ditambahkan! Menunggu konfirmasi pembayaran.', user });
    } catch (error) {
        console.error("Error di purchase-membership:", error);
        // Selalu kirim balasan dalam format JSON
        res.status(500).json({ msg: 'Terjadi kesalahan pada server. Silakan coba lagi.' });
    }
});

// Di dalam file server.js Anda
// Rute Pengaturan Paket oleh Admin (DIREVISI TOTAL)
// server.js
app.post('/api/purchase-membership-admin/:userId', auth, adminAuth, async (req, res) => {
    const { packageName, totalWashes } = req.body;
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ msg: 'Pengguna tidak ditemukan.' });
        }

      // ===== MODIFIKASI BLOK INI =====
const newMembership = {
    packageName: packageName,
    isPaid: false, 
    expiresAt: calculateExpiryDate(),
    packageId: `PKG-${Date.now()}`
};

if (packageName.toLowerCase().includes('kombinasi')) {
    // Logika khusus untuk Paket Kombinasi
    newMembership.washes = {
        bodywash: 5,
        hidrolik: 5
    };
    newMembership.remainingWashes = 10;
    newMembership.totalWashes = 10;
} else {
    // Logika untuk paket biasa
    newMembership.totalWashes = totalWashes;
    newMembership.remainingWashes = totalWashes;
}


        // Jika user belum punya array memberships, buat dulu
        if (!user.memberships) {
            user.memberships = [];
        }
        
        // Tambahkan paket baru ke array
        user.memberships.push(newMembership);

        await user.save();
        
        res.json({ msg: `Paket "${packageName}" berhasil ditambahkan untuk ${user.username}. Menunggu pembayaran.`, user });

    } catch (error) {
        console.error("Error di purchase-membership-admin:", error);
        res.status(500).send('Server error');
    }
});


app.post('/api/use-wash', auth, adminAuth, async (req, res) => {
    // QR code akan berisi: "memberId;packageId"
    const { qrData, washType } = req.body;
    
    if (!qrData || !qrData.includes(';')) {
        return res.status(400).json({ msg: 'Format QR Code tidak valid.' });
    }

    const [memberId, packageId] = qrData.split(';');

    try {
        const user = await User.findOne({ memberId: memberId });
        if (!user) return res.status(404).json({ msg: 'Data member tidak ditemukan.' });
        
        const membership = user.memberships.find(p => p.packageId === packageId);
        if (!membership) return res.status(404).json({ msg: 'Paket member spesifik tidak ditemukan.' });

        if (new Date() > new Date(membership.expiresAt)) return res.status(400).json({ msg: 'Paket member sudah kedaluwarsa.' });
        if (!membership.isPaid) return res.status(400).json({ msg: 'Paket member belum lunas.' });

        let successMessage = '';

        if (membership.packageName === 'Paket Kombinasi') {
            if (!washType) return res.status(400).json({ msg: 'Untuk Paket Kombinasi, jenis cucian harus dipilih.' });
            if (membership.washes[washType] <= 0) return res.status(400).json({ msg: `Jatah cuci untuk tipe '${washType}' sudah habis.` });
            membership.washes[washType] -= 1;
            successMessage = `Berhasil menggunakan 1 jatah ${washType} untuk ${user.username}.`;
        } else {
            if (membership.remainingWashes <= 0) return res.status(400).json({ msg: 'Jatah cuci untuk paket ini sudah habis.' });
            membership.remainingWashes -= 1;
            successMessage = `Berhasil menggunakan 1 jatah cuci untuk ${user.username}.`;
        }

        await user.save();
        const updatedUser = await User.findById(user._id).select('-password');
        res.json({ msg: successMessage, user: updatedUser });

    } catch (error) {
        console.error("Error di use-wash:", error);
        res.status(500).send('Server error');
    }
});

// server.js
// Rute API baru untuk mengambil detail user via scanner
app.get('/api/user-by-memberid/:memberId', auth, adminAuth, async (req, res) => {
    try {
        const user = await User.findOne({ memberId: req.params.memberId }).select('-password');
        if (!user) return res.status(404).json({ msg: 'Member dengan ID tersebut tidak ditemukan.' });
        res.json(user);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// RUTE BARU: Admin membuat transaksi koreksi manual
app.post('/api/transactions/correction', auth, adminAuth, async (req, res) => {
    const { amount, note } = req.body;

    // Validasi input
    if (!amount || !note || isNaN(parseInt(amount))) {
        return res.status(400).json({ msg: 'Jumlah dan catatan wajib diisi dengan benar.' });
    }

    try {
        const adminUser = await User.findById(req.user.id);

        const newTransaction = new Transaction({
            user: req.user.id,
            username: adminUser.username, // atau bisa juga 'ADMIN'
            packageName: note, // Gunakan field ini untuk menyimpan catatan koreksi
            amount: parseInt(amount)
        });

        await newTransaction.save();
        res.status(201).json({ msg: 'Transaksi koreksi berhasil ditambahkan.' });

    } catch (error) {
        console.error("Error saat membuat transaksi koreksi:", error);
        res.status(500).send('Server error');
    }
});

// --- RUTE BARU: ADMIN MEMPERPANJANG MASA AKTIF MEMBER ---
app.post('/api/users/:id/extend-membership', auth, adminAuth, async (req, res) => {
    const { months } = req.body;
    const monthsToAdd = parseInt(months, 10);

    if (!monthsToAdd || ![1, 3, 6].includes(monthsToAdd)) {
        return res.status(400).json({ msg: 'Durasi perpanjangan tidak valid.' });
    }

    try {
        const user = await User.findById(req.params.id);
        if (!user || !user.membership) {
            return res.status(404).json({ msg: 'Data member tidak ditemukan.' });
        }

        // Ambil tanggal kedaluwarsa saat ini, atau tanggal hari ini jika sudah lewat
        const today = new Date();
        const currentExpiry = new Date(user.membership.expiresAt);
        const startDate = currentExpiry < today ? today : currentExpiry;

        // Tambahkan bulan sesuai permintaan
        const newExpiryDate = new Date(startDate.setMonth(startDate.getMonth() + monthsToAdd));

        user.membership.expiresAt = newExpiryDate;
        user.markModified('membership');
        await user.save();

        res.json({ msg: `Masa aktif ${user.username} berhasil diperpanjang ${monthsToAdd} bulan.` });

    } catch (error) {
        console.error("Error di /api/users/:id/extend-membership:", error);
        res.status(500).send('Server error');
    }
});

// Rute untuk menggunakan jatah cuci (scan barcode)
/*app.post('/api/use-wash', auth, adminAuth, async (req, res) => { // <-- PERBAIKAN DI SINI
    const { userId } = req.body;
    try {
        const user = await User.findOne({ memberId: userId });
        if (!user) return res.status(404).json({ msg: 'Pengguna tidak ditemukan.' });
        if (!user.membership) return res.status(400).json({ msg: 'Pengguna bukan member.' });
        if (!user.membership.isPaid) {
            return res.status(400).json({ msg: 'Paket member pengguna ini belum lunas.' });
        }
        if (user.membership.remainingWashes <= 0) {
            return res.status(400).json({ msg: 'Jatah cuci pengguna ini sudah habis.' });
        }
        user.membership.remainingWashes -= 1;
        await user.save();
        res.json({ 
            msg: `Berhasil menggunakan 1 jatah cuci untuk ${user.username}.`,
            remaining: user.membership.remainingWashes 
        }); 
    } catch (error) {
        res.status(500).send('Server error');
    }
});*/

// --- RUTE KONFIRMASI PEMBAYARAN (DIPERBARUI) ---
app.post('/api/confirm-payment/:userId/:packageId', auth, adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ msg: 'Data member tidak ditemukan.' });
        }
        
        // Cari paket spesifik di dalam array memberships
        const membership = user.memberships.id(req.params.packageId);
        if (!membership) {
            return res.status(404).json({ msg: 'Paket spesifik tidak ditemukan.' });
        }
        
        if (membership.isPaid) {
            return res.status(400).json({ msg: 'Pembayaran untuk paket ini sudah pernah dikonfirmasi.' });
        }

        membership.isPaid = true;

        // Logika untuk kartu nano jika paketnya adalah nano coating
        if (membership.packageName.includes('Nano Coating')) {
            const coatingDate = new Date();
            const expiryDate = new Date(coatingDate);
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);

            user.nanoCoatingCard = {
                cardNumber: `NC-${Date.now()}`,
                ownerName: user.username,
                coatingDate: coatingDate,
                expiresAt: expiryDate,
                isActive: true
            };
            user.markModified('nanoCoatingCard');
        }

        await user.save();
        
        // (Opsional: Catat transaksi jika perlu)

        res.json({ msg: `Pembayaran untuk paket "${membership.packageName}" telah dikonfirmasi.`, user });

    } catch (error) {
        console.error("Error di /api/confirm-payment:", error.message);
        res.status(500).send('Server error');
    }
});

// --- RUTE ADMIN MENGEDIT KARTU MAINTENANCE NANO (DIPERBARUI) ---
app.put('/api/users/:id/update-nanocard', auth, adminAuth, async (req, res) => {
    // Ambil kedua data dari body
    const { ownerName, plateNumber } = req.body;

    try {
        const user = await User.findById(req.params.id);
        if (!user || !user.nanoCoatingCard) {
            return res.status(404).json({ msg: 'Kartu maintenance untuk user ini tidak ditemukan.' });
        }

        // Simpan kedua data
        user.nanoCoatingCard.ownerName = ownerName;
        user.nanoCoatingCard.plateNumber = plateNumber;
        user.markModified('nanoCoatingCard');
        await user.save();

        res.json({ msg: `Data kartu untuk ${user.username} berhasil diperbarui.` });

    } catch (error) {
        console.error("Error di update-nanocard:", error);
        res.status(500).send('Server error');
    }
});

// --- RUTE BARU: KIRIM ULANG OTP ---
app.post('/api/resend-otp', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email: email });

        if (!user) {
            return res.status(404).json({ msg: 'Pengguna dengan email ini tidak ditemukan.' });
        }
        if (user.isVerified) {
            return res.status(400).json({ msg: 'Akun ini sudah terverifikasi.' });
        }

        // Buat OTP baru dan perbarui masa berlakunya
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // Berlaku 10 menit
        await user.save();

        console.log(`[Kirim Ulang] OTP baru untuk ${email} adalah: ${otp}`);

        // Kirim OTP baru ke email pengguna
        await transporter.sendMail({
            from: `"AUTOHIDROLIK" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: 'Kode Verifikasi Pendaftaran Baru',
            text: `Kode OTP baru Anda adalah: ${otp}. Kode ini berlaku selama 10 menit.`
        });

        res.json({ msg: 'Kode OTP baru telah berhasil dikirim ke email Anda.' });

    } catch (error) {
        console.error("Error di /api/resend-otp:", error);
        res.status(500).send('Server error');
    }
});

app.post('/api/reset-password', async (req, res) => {
    // Pastikan Anda mengambil semua data yang diperlukan
    const { email, otp, newPassword } = req.body;
    try {
        const user = await User.findOne({
            email: email,
            otp: otp,
            otpExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({ msg: 'Kode OTP tidak valid atau kedaluwarsa.' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        res.json({ msg: 'Kata sandi berhasil direset! Silakan login dengan sandi baru Anda.' });
    } catch (error) {
        console.error("Error di /api/reset-password:", error);
        res.status(500).send('Server error');
    }
});

// --- New Route for Excel Data Download ---
// --- New Route for Excel Data Download (Diperbarui dengan Tanggal Kedaluwarsa) ---
app.get('/api/download-data', auth, adminAuth, async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).sort({ date: 1 });

        const workbook = new exceljs.Workbook();
        workbook.creator = 'AUTOHIDROLIK Admin';
        workbook.created = new Date();

        const memberSheet = workbook.addWorksheet('Data Member');
        const nonMemberSheet = workbook.addWorksheet('Data Non-Member');

        // ======================= PERUBAHAN DI SINI =======================
        // Tambahkan kolom baru untuk Tanggal Kedaluwarsa
        memberSheet.columns = [
            { header: 'Tanggal Bergabung', key: 'date', width: 20, style: { numFmt: 'dd/mm/yyyy' } },
            { header: 'Nama', key: 'username', width: 30 },
            { header: 'Nama Paket Pembelian', key: 'packageName', width: 30 },
            { header: 'Tanggal Kedaluwarsa', key: 'expiresAt', width: 20, style: { numFmt: 'dd/mm/yyyy' } }
        ];
        // ===================== AKHIR DARI PERUBAHAN =====================

        nonMemberSheet.columns = [
            { header: 'Tanggal Gabung', key: 'date', width: 20, style: { numFmt: 'dd/mm/yyyy' } },
            { header: 'Nama', key: 'username', width: 30 }
        ];

        memberSheet.getRow(1).font = { bold: true };
        nonMemberSheet.getRow(1).font = { bold: true };

        users.forEach(user => {
            if (user.membership && user.membership.isPaid) {
                // ======================= PERUBAHAN DI SINI =======================
                // Tambahkan data 'expiresAt' saat membuat baris baru
                memberSheet.addRow({
                    date: user.date,
                    username: user.username,
                    packageName: user.membership.packageName,
                    expiresAt: user.membership.expiresAt ? new Date(user.membership.expiresAt) : '-'
                });
                // ===================== AKHIR DARI PERUBAHAN =====================
            } else {
                nonMemberSheet.addRow({
                    date: user.date,
                    username: user.username
                });
            }
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=data_autohidrolik_${new Date().toISOString().slice(0,10)}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Error creating Excel file:", error);
        res.status(500).send("Failed to create Excel file.");
    }
});

// --- PENAMBAHAN BARU: Rute untuk data grafik tren pendapatan ---
app.get('/api/revenue-trend', auth, adminAuth, async (req, res) => {
    try {
        // Mengambil data transaksi 7 hari terakhir
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const revenueData = await Transaction.aggregate([
            {
                $match: {
                    transactionDate: { $gte: sevenDaysAgo } // Filter data 7 hari terakhir
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$transactionDate" } }, // Kelompokkan berdasarkan hari
                    totalAmount: { $sum: "$amount" } // Jumlahkan pendapatan per hari
                }
            },
            {
                $sort: { _id: 1 } // Urutkan berdasarkan tanggal dari yang terlama
            }
        ]);
        
        // Format data agar mudah dibaca oleh Chart.js
        const labels = revenueData.map(data => data._id);
        const data = revenueData.map(data => data.totalAmount);

        res.json({ labels, data });

    } catch (error) {
        console.error("Error mengambil data tren pendapatan:", error);
        res.status(500).send('Server error');
    }
});

// API BARU: Mengambil data member yang sudah lunas (aktif)
app.get('/api/members/active', auth, adminAuth, async (req, res) => {
    try {
        const activeMembers = await User.find({ 
            'membership.isPaid': true 
        }).sort({ date: 1 });
        res.json(activeMembers);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// API BARU: Mengambil data member yang menunggu pembayaran
app.get('/api/members/pending', auth, adminAuth, async (req, res) => {
    try {
        const pendingMembers = await User.find({
            'membership.isPaid': false
        }).sort({ 'membership.purchaseDate': 1 }); // Urutkan berdasarkan tanggal pembelian
        res.json(pendingMembers);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// ======================================================
// --- Rute untuk Menyajikan Halaman HTML ---
// ======================================================

// PERBAIKAN: Pindahkan rute '/' ke sebelum express.static
app.get('/', async (req, res) => {
    try {
        await Visitor.findOneAndUpdate(
            { identifier: 'global-visitor-count' }, 
            { $inc: { count: 1 } }, 
            { upsert: true }
        );
    } catch (error) {
        console.error("Gagal menghitung visitor:", error);
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/Login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/Register-User', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});
app.get('/Profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});
app.get('/Admin-Dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
// Rute baru untuk halaman status
app.get('/Server-Status', auth, adminAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'status.html'));
});


// --- PENAMBAHAN BARU: Rute untuk halaman scanner ---
app.get('/Scanner-QRCODE', (req, res) => {
    // Pastikan halaman ini hanya bisa diakses setelah login sebagai admin
    // Middleware 'auth' dan 'adminAuth' bisa ditambahkan di sini jika perlu
    res.sendFile(path.join(__dirname, 'public', 'scan.html'));
});

// --- Jalankan Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
