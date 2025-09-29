const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Skema untuk Keanggotaan
const MembershipSchema = new Schema({
    packageName: {
        type: String,
        required: true
    },
    totalWashes: {
        type: Number,
        required: true
    },
    remainingWashes: {
        type: Number,
        required: true
    },
    // KHUSUS untuk Paket Kombinasi
    washes: {
        bodywash: { type: Number, default: 0 },
        hidrolik: { type: Number, default: 0 }
    },
    purchaseDate: {
        type: Date,
        default: Date.now
    },
    // Field baru untuk melacak status pembayaran
    isPaid: {
        type: Boolean,
        default: false 
    }
});

// Skema Utama Pengguna
const UserSchema = new Schema({
    memberId: { 
        type: String, 
        unique: true, 
        sparse: true // Hanya terapkan unique jika field ini ada
    },
        username: { type: String, required: true, trim: true },
    email: { type: String, required: false, unique: true, sparse: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, required: true, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isVerified: { type: Boolean, default: true },
    membership: {
        type: MembershipSchema,
        default: null // Menjadi member jika field ini diisi
    },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
