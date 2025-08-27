// Import dependensi
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path'); // Modul 'path' diperlukan
require('dotenv').config();

// Inisialisasi Aplikasi Express
const app = express();

// Import Model
const User = require('./models/User');
const Review = require('./models/Review'); // Pastikan model Review diimpor

// --- Middleware ---
const whitelist = ['https://autohidrolik.com', 'https://www.autohidrolik.com'];
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



// ======================================================
// --- API ROUTES ---
// ======================================================

// Rute Registrasi
app.post('/api/register', async (req, res) => {
    const { username, email, phone, password } = req.body;
    try {
        if (await User.findOne({ email })) {
            return res.status(400).json({ msg: 'Email sudah terdaftar.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const memberId = await generateUniqueMemberId();
        
        const newUser = new User({ 
            username, 
            email, 
            phone, 
            password: hashedPassword, 
            isVerified: true,
            memberId: memberId 
        });
        
        await newUser.save();
        res.status(201).json({ msg: 'Pengguna berhasil didaftarkan!' });
    } catch (error) {
        console.error("Error di /api/register:", error.message);
        res.status(500).send('Terjadi kesalahan pada server');
    }
});

// Rute Login (Diperbaiki)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Kredensial tidak valid' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Kredensial tidak valid' });
        
        // --- PERBAIKAN DI SINI ---
        // Sertakan 'role' di dalam payload token
        const payload = { 
            user: { 
                id: user.id,
                role: user.role // Tambahkan baris ini
            } 
        };

        jwt.sign(payload, process.env.JWT_SECRET || 'your_super_secret_key', { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            // Kirim juga 'role' di dalam respons JSON
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

// Rute untuk membeli paket membership
app.post('/api/purchase-membership', auth, async (req, res) => {
    const { packageName, totalWashes } = req.body;
    if (!packageName || !totalWashes) {
        return res.status(400).json({ msg: 'Detail paket tidak lengkap.' });
    }
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'Pengguna tidak ditemukan.' });
        
        user.membership = {
            packageName: packageName,
            totalWashes: totalWashes,
            remainingWashes: totalWashes,
            isPaid: false // Diatur ke false, menunggu konfirmasi admin
        };
        await user.save();
        res.json({ msg: 'Pembelian paket berhasil! Menunggu konfirmasi pembayaran dari admin.', user });
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// Rute untuk menggunakan jatah cuci (scan barcode)
app.post('/api/use-wash', auth, adminAuth, async (req, res) => { // <-- PERBAIKAN DI SINI
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
});

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
app.post('/api/purchase-membership-admin/:userId', auth, adminAuth, async (req, res) => {
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
});

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
