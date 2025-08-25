// Import dependensi
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

// --- Inisialisasi Aplikasi Express ---
const app = express();

// --- Import Model ---
const User = require('./models/User');
const Review = require('./models/Review'); // Pastikan model Review diimpor

// --- Middleware ---

// --- PERBAIKAN UTAMA DI SINI ---
// Konfigurasi CORS yang lebih fleksibel
const whitelist = ['https://autohidrolik.com', 'https://www.autohidrolik.com'];
const corsOptions = {
  origin: function (origin, callback) {
    // Izinkan jika domain ada di whitelist atau jika origin tidak ada (misal: dari Postman)
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200 
};
app.use(cors(corsOptions));
// --- AKHIR PERBAIKAN ---

app.use(express.json());
app.use(express.static('public'));

// --- Koneksi ke MongoDB ---
mongoose.connect(process.env.MONGO_URI, {})
  .then(() => console.log('Berhasil terhubung ke MongoDB Atlas'))
  .catch(err => console.log('Koneksi MongoDB gagal:', err));

// --- Konfigurasi Variabel Global ---
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

// --- Middleware untuk Otentikasi Token ---
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'Tidak ada token, otorisasi ditolak' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (e) {
        res.status(400).json({ msg: 'Token tidak valid' });
    }
};

// --- Middleware untuk Cek Role Admin ---
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


// ======================================================
// --- API ROUTES ---
// ======================================================

// (Rute /api/register dan /api/login Anda tetap di sini...)
app.post('/api/register', async (req, res) => {
    try {
        const { personalData, vehicles } = req.body;
        let user = await User.findOne({ email: personalData.email });
        if (user) return res.status(400).json({ msg: 'Email sudah terdaftar.' });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(personalData.password, salt);
        user = new User({
            username: personalData.username,
            email: personalData.email,
            password: hashedPassword,
            fullName: personalData.fullName,
            phone: personalData.phone,
            address: personalData.address,
            vehicles: vehicles,
            isVerified: true
        });
        await user.save();
        res.status(201).json({ msg: 'Pengguna berhasil didaftarkan!' });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Terjadi kesalahan pada server');
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Kredensial tidak valid' });
        if (!user.isVerified) return res.status(401).json({ msg: 'Akun belum diverifikasi.' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Kredensial tidak valid' });
        const payload = { user: { id: user.id } };
        jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { role: user.role } });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.get('/api/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

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

// --- RUTE ADMIN UNTUK MANAJEMEN PENGGUNA ---

// GET: Mendapatkan semua pengguna (Hanya Admin)
app.get('/api/users', auth, adminAuth, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ date: -1 });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// POST: Menambah pengguna baru (Hanya Admin)
app.post('/api/users', auth, adminAuth, async (req, res) => {
    const { username, email, password, role } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'Email sudah ada' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            username,
            email,
            password: hashedPassword,
            role,
            isVerified: true
        });
        await user.save();
        res.status(201).json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// PUT: Mengedit pengguna (Hanya Admin)
app.put('/api/users/:id', auth, adminAuth, async (req, res) => {
    const { username, email, role } = req.body;
    const updatedFields = { username, email, role };

    try {
        let user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updatedFields },
            { new: true }
        ).select('-password');

        if (!user) return res.status(404).json({ msg: 'User tidak ditemukan' });
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// DELETE: Menghapus pengguna (Hanya Admin)
app.delete('/api/users/:id', auth, adminAuth, async (req, res) => {
    try {
        let user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User tidak ditemukan' });

        await user.deleteOne(); // Menggunakan deleteOne() pada dokumen
        res.json({ msg: 'User berhasil dihapus' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// GET: Mendapatkan semua ulasan (Publik)
app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ date: -1 }).limit(6);
        res.json(reviews);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// POST: Menambah ulasan baru (Dilindungi - butuh login)
app.post('/api/reviews', auth, async (req, res) => {
    const { rating, comment } = req.body;
    try {
        const user = await User.findById(req.user.id);
        const newReview = new Review({
            rating,
            comment,
            user: req.user.id,
            username: user.username
        });
        const review = await newReview.save();
        res.status(201).json(review);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// GET: Mendapatkan SEMUA ulasan
app.get('/api/reviews/all', auth, adminAuth, async (req, res) => {
    try {
        const reviews = await Review.find().sort({ date: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// PUT: Mengedit ulasan
app.put('/api/reviews/:id', auth, adminAuth, async (req, res) => {
    const { rating, comment } = req.body;
    try {
        let review = await Review.findByIdAndUpdate(
            req.params.id,
            { $set: { rating, comment } },
            { new: true }
        );
        if (!review) return res.status(404).json({ msg: 'Ulasan tidak ditemukan' });
        res.json(review);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// DELETE: Menghapus ulasan
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



// --- Jalankan Server ---
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
