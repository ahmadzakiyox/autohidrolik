// Import dependensi
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path'); // Modul 'path' diperlukan
require('dotenv').config();

// Inisialisasi Aplikasi Express
const app = express();

// Import Model
const User = require('./models/User');
const Review = require('./models/Review'); // Pastikan model Review diimpor

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
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

// --- RUTE REGISTRASI (DIPERBAIKI) ---
app.post('/api/register', async (req, res) => {
    const { username, email, phone, password } = req.body;
    try {
        if (await User.findOne({ email })) {
            return res.status(400).json({ msg: 'Email sudah terdaftar.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = generateOTP();
        
        // --- PERBAIKAN UTAMA DI SINI ---
        // Buat memberId SEBELUM menyimpan user
        const memberId = await generateUniqueMemberId();

        const newUser = new User({
            username,
            email,
            phone,
            password: hashedPassword,
            isVerified: false,
            otp: otp,
            otpExpires: new Date(Date.now() + 10 * 60 * 1000),
            memberId: memberId // Masukkan memberId ke dalam data user baru
        });
        
        const savedUser = await newUser.save();
        console.log(`[Registrasi] User ${savedUser.email} berhasil disimpan dengan Member ID: ${savedUser.memberId}`);

        await transporter.sendMail({
            from: `"AUTOHIDROLIK" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: 'Kode Verifikasi Pendaftaran',
            text: `Kode OTP Anda adalah: ${otp}. Kode ini berlaku selama 10 menit.`
        });

        res.status(201).json({ msg: 'Registrasi berhasil! Silakan cek email Anda untuk kode OTP.' });
    } catch (error) {
        console.error("Error di /api/register:", error);
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

    
// Rute Login (Diperbaiki)
// --- RUTE LOGIN (DIPERBAIKI) ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Kredensial tidak valid' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Kredensial tidak valid' });

        // --- PENAMBAHAN VALIDASI ---
        // Cek apakah akun sudah diverifikasi atau belum
        if (!user.isVerified) {
            return res.status(401).json({ 
                msg: 'Akun Anda belum diverifikasi. Silakan cek email Anda untuk kode OTP.',
                notVerified: true, // Flag untuk frontend
                email: user.email // Kirim email untuk redirect
            });
        }
        
        const payload = { 
            user: { 
                id: user.id,
                role: user.role
            } 
        };

        jwt.sign(payload, process.env.JWT_SECRET || 'your_super_secret_key', { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { role: user.role } });
        });
    } catch (err) {
        console.error(err.message);
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

// --- RUTE ADMIN: MANAJEMEN PENGGUNA ---
app.get('/api/users', auth, adminAuth, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ date: -1 });
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
    const { username, email, role } = req.body;
    try {
        let user = await User.findByIdAndUpdate(req.params.id, { $set: { username, email, role } }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ msg: 'User tidak ditemukan' });
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

// --- RUTE LUPA & RESET SANDI ---

// 4. Rute Baru: Lupa Sandi (Kirim OTP)
app.post('/api/forgot-password', async (req, res) => {
    const { contact, method } = req.body; // contact bisa email atau phone, method 'email' atau 'sms'
    try {
        const user = await User.findOne(method === 'email' ? { email: contact } : { phone: contact });
        if (!user) return res.status(404).json({ msg: 'Pengguna tidak ditemukan.' });

        const otp = generateOTP();
        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        if (method === 'email') {
            await transporter.sendMail({
                from: `"AUTOHIDROLIK" <${process.env.GMAIL_USER}>`,
                to: user.email,
                subject: 'Kode Reset Kata Sandi',
                text: `Gunakan kode ini untuk mereset kata sandi Anda: ${otp}`
            });
        } else { // method === 'sms'
            await twilioClient.messages.create({
                body: `AUTOHIDROLIK: Kode reset sandi Anda adalah ${otp}`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: user.phone // Pastikan format nomor telepon benar (misal: +6281...)
            });
        }
        
        res.json({ msg: `Kode OTP telah dikirim ke ${contact}.` });
    } catch (error) {
        console.error("Error di /api/forgot-password:", error);
        res.status(500).send('Server error');
    }
});

// 5. Rute Baru: Reset Sandi (Verifikasi OTP & Set Sandi Baru)
app.post('/api/reset-password', async (req, res) => {
    const { contact, otp, newPassword, method } = req.body;
    try {
        const user = await User.findOne({
            [method === 'email' ? 'email' : 'phone']: contact,
            otp,
            otpExpires: { $gt: Date.now() }
        });
        
        if (!user) return res.status(400).json({ msg: 'Kode OTP tidak valid atau kedaluwarsa.' });

        user.password = await bcrypt.hash(newPassword, 10);
        user.isVerified = true; // Pastikan user terverifikasi juga
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        res.json({ msg: 'Kata sandi berhasil direset! Silakan login dengan sandi baru Anda.' });
    } catch (error) {
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

// Rute untuk admin mengonfirmasi pembayaran
app.post('/api/confirm-payment/:userId', auth, adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user || !user.membership) {
            return res.status(404).json({ msg: 'Data member tidak ditemukan.' });
        }
        user.membership.isPaid = true;
        await user.save();
        res.json({ msg: `Pembayaran untuk ${user.username} telah dikonfirmasi.`, user });
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// Rute untuk admin mengatur/mengubah paket member
/*app.post('/api/purchase-membership-admin/:userId', auth, adminAuth, async (req, res) => {
    const { packageName, totalWashes } = req.body;
    if (!packageName || !totalWashes) {
        return res.status(400).json({ msg: 'Detail paket tidak lengkap.' });
    }
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ msg: 'Pengguna tidak ditemukan.' });
        
        user.membership = {
            packageName: packageName,
            totalWashes: totalWashes,
            remainingWashes: totalWashes,
            isPaid: false // Admin harus konfirmasi pembayaran secara manual setelah ini
        };
        await user.save();
        res.json({ msg: `Paket untuk ${user.username} berhasil diatur.`, user });
    } catch (error) {
        res.status(500).send('Server error');
    }
});*/

// ======================================================
// --- Rute untuk Menyajikan Halaman HTML ---
// ======================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});
app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// --- PENAMBAHAN BARU: Rute untuk halaman scanner ---
app.get('/scan', (req, res) => {
    // Pastikan halaman ini hanya bisa diakses setelah login sebagai admin
    // Middleware 'auth' dan 'adminAuth' bisa ditambahkan di sini jika perlu
    res.sendFile(path.join(__dirname, 'public', 'scan.html'));
});

// --- Jalankan Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
