// File: createadmin.js
// Skrip ini untuk membuat akun admin awal secara manual.
// Jalankan dari terminal dengan: node createadmin.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config(); // Pastikan variabel .env termuat

// Import model User
const User = require('./models/User');

// --- Detail Akun Admin ---
const ADMIN_EMAIL = 'admin@autohidrolik.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_USERNAME = 'admin';

const createAdminAccount = async () => {
    try {
        // 1. Hubungkan ke MongoDB
        console.log('Menghubungkan ke MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {});
        console.log('Berhasil terhubung ke MongoDB.');

        // 2. Cek apakah admin sudah ada
        const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
        if (existingAdmin) {
            console.log('Akun admin sudah ada. Tidak ada tindakan yang diambil.');
            return; // Keluar dari fungsi jika admin sudah ada
        }

        // 3. Hash password
        console.log('Membuat hash password...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

        // 4. Buat objek admin baru
        const adminUser = new User({
            username: ADMIN_USERNAME,
            email: ADMIN_EMAIL,
            password: hashedPassword,
            role: 'admin', // Set role sebagai admin
            isVerified: true, // Langsung aktif
            fullName: 'Administrator'
        });

        // 5. Simpan ke database
        await adminUser.save();
        console.log('================================================');
        console.log('🎉 Akun admin berhasil dibuat!');
        console.log(`   Email: ${ADMIN_EMAIL}`);
        console.log(`   Password: ${ADMIN_PASSWORD}`);
        console.log('================================================');

    } catch (error) {
        console.error('Terjadi kesalahan:', error.message);
    } finally {
        // 6. Tutup koneksi database
        await mongoose.disconnect();
        console.log('Koneksi ke MongoDB ditutup.');
    }
};

// Panggil fungsi untuk menjalankan skrip
createAdminAccount();
