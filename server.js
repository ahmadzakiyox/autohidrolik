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

app.post('/api/register', async (req, res) => {
    const { username, email, phone, password } = req.body;

    // 1. Validasi input dasar
    if (!username || !email || !phone || !password) {
        return res.status(400).json({ msg: 'Mohon isi semua field yang diperlukan.' });
    }

    try {
        // 2. Gunakan toLowerCase() untuk konsistensi pengecekan email
        const existingUser = await User.findOne({ email: email.toLowerCase() });

        if (existingUser) {
            // Jika user ditemukan, langsung hentikan proses dan kirim error
            return res.status(400).json({ msg: 'Email sudah terdaftar. Silakan gunakan email lain.' });
        }

        // 3. Jika email belum ada, lanjutkan proses
        const hashedPassword = await bcrypt.hash(password, 10);
        const memberId = await generateUniqueMemberId();

        const newUser = new User({
            username,
            email: email.toLowerCase(), // Simpan email dalam format lowercase juga
            phone,
            password: hashedPassword,
            isVerified: true,
            memberId: memberId
        });
        
        const savedUser = await newUser.save();
        
        console.log(`[Registrasi] User ${savedUser.email} berhasil disimpan dengan Member ID: ${savedUser.memberId}`);

        res.status(201).json({ msg: 'Registrasi berhasil! Anda akan dialihkan ke halaman login.' });

    } catch (error) {
        // Tangani kemungkinan error lain, termasuk jika ada race condition duplikasi
        if (error.code === 11000) {
            return res.status(400).json({ msg: 'Email ini baru saja didaftarkan. Coba lagi.' });
        }
        console.error("Error di /api/register:", error);
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

// Rute untuk admin mengonfirmasi pembayaran (PENTING)
app.post('/api/confirm-payment/:userId', auth, adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user || !user.membership) {
            return res.status(404).json({ msg: 'Data member tidak ditemukan.' });
        }
        user.membership.isPaid = true;
        
        // --- TAMBAHKAN BARIS INI ---
        user.markModified('membership'); 
        
        await user.save(); // Sekarang perubahan akan tersimpan
        res.json({ msg: `Pembayaran untuk ${user.username} telah dikonfirmasi.`, user });
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
