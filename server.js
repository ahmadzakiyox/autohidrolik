// Import dependensi
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const exceljs = require('exceljs');
const nodemailer = require('nodemailer');
const path = require('path'); // Modul 'path' diperlukan
require('dotenv').config();

// Inisialisasi Aplikasi Express
const app = express();

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
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'Tidak ada token, otorisasi ditolak' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key');
        req.user = decoded.user;
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
function calculateExpiryDate() {
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 3); // Tambah 3 bulan dari sekarang
    return expiryDate;
}

// ======================================================
// --- API ROUTES ---
// ======================================================
// --- PENAMBAHAN BARU: Rute untuk mereset semua transaksi ---
app.delete('/api/transactions/reset', auth, adminAuth, async (req, res) => {
    try {
        // Menghapus semua dokumen dari koleksi Transaction
        await Transaction.deleteMany({});
        res.json({ msg: 'Semua data transaksi berhasil direset.' });
    } catch (error) {
        console.error("Error saat mereset transaksi:", error);
        res.status(500).send('Server error');
    }
});

app.post('/api/register', async (req, res) => {
    // 1. Ambil data dari body request
    const { username, email, phone, password } = req.body;

    try {
        // 2. Validasi Input Wajib (Email tidak termasuk)
        if (!username || !phone || !password) {
            return res.status(400).json({ msg: 'Username, Nomor WhatsApp, dan Password wajib diisi.' });
        }

        // 3. (REVISI) Validasi Format Input
        // Memeriksa panjang password
        if (password.length < 6) {
            return res.status(400).json({ msg: 'Password minimal harus 6 karakter.' });
        }
        // Memeriksa format email jika diisi
        if (email && !/\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ msg: 'Format email tidak valid.' });
        }

        // 4. (REVISI) Pengecekan Duplikasi yang Lebih Efisien
        // Buat kondisi pencarian awal untuk field yang unik dan wajib
        const queryConditions = [
            { username: username },
            { phone: phone }
        ];

        // Jika email diisi, tambahkan ke kondisi pencarian
        if (email) {
            queryConditions.push({ email: email.toLowerCase() });
        }
        
        // Lakukan satu kali pencarian ke database
        const existingUser = await User.findOne({ $or: queryConditions });

        // Jika ada user yang ditemukan, berikan pesan error yang spesifik
        if (existingUser) {
            if (existingUser.username === username) {
                return res.status(400).json({ msg: 'Username sudah terdaftar.' });
            }
            if (existingUser.phone === phone) {
                return res.status(400).json({ msg: 'Nomor WhatsApp sudah terdaftar.' });
            }
            if (email && existingUser.email === email.toLowerCase()) {
                return res.status(400).json({ msg: 'Email sudah terdaftar.' });
            }
        }

        // 5. Jika semua pengecekan lolos, lanjutkan proses
        const hashedPassword = await bcrypt.hash(password, 10);
        const memberId = await generateUniqueMemberId(); // Pastikan fungsi ini ada

        const newUser = new User({
            username,
            email: email ? email.toLowerCase() : null, // Simpan null jika email kosong
            phone,
            password: hashedPassword,
            isVerified: true, // Sesuai skema
            memberId: memberId
        });
        
        await newUser.save();
        
        res.status(201).json({ msg: 'Registrasi berhasil! Anda akan dialihkan ke halaman login.' });

    } catch (error) {
        console.error("Error di /api/register:", error);
        // Penanganan error duplikasi jika terjadi race condition
        if (error.code === 11000) {
            return res.status(400).json({ msg: 'Username, email, atau nomor HP ini baru saja didaftarkan.' });
        }
        res.status(500).send('Terjadi kesalahan pada server');
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
        // Kita sebut inputnya 'identifier' (bisa email atau nomor hp)
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ msg: 'Silakan isi semua kolom.' });
        }

        // Cari user berdasarkan email ATAU nomor hp menggunakan $or
        const user = await User.findOne({
            $or: [{ email: identifier }, { phone: identifier }]
        });

        // Jika user tidak ditemukan sama sekali
        if (!user) {
            return res.status(400).json({ msg: 'Email/Nomor WhatsApp atau password salah.' });
        }

        // Bandingkan password (di aplikasi production, gunakan bcrypt.compare)
        if (user.password !== password) {
            return res.status(400).json({ msg: 'Email/Nomor WhatsApp atau password salah.' });
        }

        // Buat token atau session
        const token = jwt.sign({ id: user._id, role: user.role }, 'secretKey');
        
        res.json({
            msg: 'Login berhasil!',
            // token,
            user: { 
                id: user._id, 
                username: user.username,
                role: user.role // Kirim role user ke frontend
            }
        });

    } catch (error) {
        console.error("Error di /api/login:", error);
        res.status(500).json({ msg: 'Server error.' });
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

// --- RUTE ADMIN: MANAJEMEN PENGGUNA ---
app.get('/api/users', auth, adminAuth, async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } })
            .select('-password')
            .sort({ date: 1 }); // Mengurutkan dari terlama ke terbaru
      
        res.json(users);
    } catch (err) {
        console.error(err.message);
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

        user.membership = {
            packageName: packageName,
            totalWashes: totalWashes,
            remainingWashes: totalWashes,
            isPaid: false,
            expiresAt: calculateExpiryDate() // <-- Atur tanggal kedaluwarsa
        };
        await user.save();
        res.json({ msg: 'Pembelian paket berhasil! Menunggu konfirmasi pembayaran.', user });
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// Rute Pengaturan Paket oleh Admin (Diperbarui)
app.post('/api/purchase-membership-admin/:userId', auth, adminAuth, async (req, res) => {
    const { packageName, totalWashes } = req.body;
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ msg: 'Pengguna tidak ditemukan.' });
        
        user.membership = {
            packageName: packageName,
            totalWashes: totalWashes,
            remainingWashes: totalWashes,
            isPaid: false,
            expiresAt: calculateExpiryDate() // <-- Atur tanggal kedaluwarsa
        };
        await user.save();
        res.json({ msg: `Paket untuk ${user.username} berhasil diatur.`, user });
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// Rute Penggunaan Jatah Cuci / Scanner (Diperbarui)
app.post('/api/use-wash', auth, adminAuth, async (req, res) => {
    const { userId } = req.body;
    try {
        const user = await User.findOne({ memberId: userId });
        if (!user || !user.membership) return res.status(404).json({ msg: 'Data member tidak ditemukan.' });
        
        // --- PENGECEKAN MASA AKTIF BARU ---
        if (new Date() > new Date(user.membership.expiresAt)) {
            return res.status(400).json({ msg: 'Paket member Anda sudah kedaluwarsa dan jatah cuci hangus.' });
        }

        if (!user.membership.isPaid) {
            return res.status(400).json({ msg: 'Paket member pengguna ini belum lunas.' });
        }
        if (user.membership.remainingWashes <= 0) {
            return res.status(400).json({ msg: 'Jatah cuci pengguna ini sudah habis.' });
        }

        user.membership.remainingWashes -= 1;

        // --- TAMBAHKAN BARIS INI UNTUK MEMASTIKAN PERUBAHAN TERSIMPAN ---
        user.markModified('membership');
        
        await user.save();
        res.json({ 
            msg: `Berhasil menggunakan 1 jatah cuci untuk ${user.username}.`,
            remaining: user.membership.remainingWashes 
        }); 
    } catch (error) {
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
app.post('/api/confirm-payment/:userId', auth, adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user || !user.membership) {
            return res.status(404).json({ msg: 'Data member tidak ditemukan.' });
        }
        
        // Cek agar transaksi tidak dicatat dua kali
        if (user.membership.isPaid) {
            return res.status(400).json({ msg: 'Pembayaran ini sudah pernah dikonfirmasi.' });
        }

        user.membership.isPaid = true;
        user.markModified('membership');
        await user.save();

        // --- LOGIKA BARU: CATAT TRANSAKSI ---
        // Daftar harga untuk menentukan jumlah transaksi
        const packagePrices = {
            'Body Wash': 500000,
            'Cuci Mobil Hidrolik': 560000,
            'Cuci Motor Besar': 200000,
            'Cuci Motor Kecil': 200000,
            'Paket Kombinasi': 600000,
            'Add-On Vacuum Cleaner': 20000
        };
        const transactionAmount = packagePrices[user.membership.packageName] || 0;

        // Buat catatan transaksi baru
        const newTransaction = new Transaction({
            user: user._id,
            username: user.username,
            packageName: user.membership.packageName,
            amount: transactionAmount
        });
        await newTransaction.save();
        // --- AKHIR LOGIKA BARU ---

        res.json({ msg: `Pembayaran untuk ${user.username} telah dikonfirmasi dan dicatat.`, user });

    } catch (error) {
        console.error("Error di /api/confirm-payment:", error.message);
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
app.get('/api/download-data', auth, adminAuth, async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).sort({ date: 1 });

        const workbook = new exceljs.Workbook();
        workbook.creator = 'AUTOHIDROLIK Admin';
        workbook.created = new Date();

        const memberSheet = workbook.addWorksheet('Data Member');
        const nonMemberSheet = workbook.addWorksheet('Data Non-Member');

        memberSheet.columns = [
            { header: 'Tanggal Bergabung', key: 'date', width: 20 },
            { header: 'Nama', key: 'username', width: 30 },
            { header: 'Nama Paket Pembelian', key: 'packageName', width: 30 }
        ];
        nonMemberSheet.columns = [
            { header: 'Tanggal Gabung', key: 'date', width: 20 },
            { header: 'Nama', key: 'username', width: 30 }
        ];

        memberSheet.getRow(1).font = { bold: true };
        nonMemberSheet.getRow(1).font = { bold: true };

        users.forEach(user => {
            if (user.membership && user.membership.isPaid) {
                memberSheet.addRow({
                    date: user.date,
                    username: user.username,
                    packageName: user.membership.packageName
                });
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

// --- PENAMBAHAN BARU: Rute untuk halaman scanner ---
app.get('/Scanner-QRCODE', (req, res) => {
    // Pastikan halaman ini hanya bisa diakses setelah login sebagai admin
    // Middleware 'auth' dan 'adminAuth' bisa ditambahkan di sini jika perlu
    res.sendFile(path.join(__dirname, 'public', 'scan.html'));
});

// --- Jalankan Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
