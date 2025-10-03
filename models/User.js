// File: models/User.js (Versi Sederhana)

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Skema untuk data membership yang akan ditempel langsung di User
const MembershipSchema = new Schema({
    packageName: { type: String, required: true },
    isPaid: { type: Boolean, default: false },
    purchaseDate: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    packageId: { type: String, unique: true, sparse: true }, // ID unik untuk QR Code
    totalWashes: { type: Number, default: 0 },
    remainingWashes: { type: Number, default: 0 },
    washes: { // Khusus untuk paket kombinasi
        bodywash: { type: Number, default: 0 },
        hidrolik: { type: Number, default: 0 }
    }
});

// Skema Utama Pengguna
const UserSchema = new Schema({
    memberId: { type: String, unique: true, sparse: true },
    username: { type: String, required: true, trim: true },
    email: { type: String, required: false, unique: true, sparse: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, required: true, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isVerified: { type: Boolean, default: true },
    
    // PERUBAHAN UTAMA: 'membership' sekarang menjadi satu objek, bukan array
    membership: MembershipSchema,
    
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
