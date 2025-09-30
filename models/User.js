const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NanoCoatingCardSchema = new Schema({
    cardNumber: { type: String, unique: true },
    ownerName: { type: String, default: '' },
    plateNumber: { type: String, default: '' },
    coatingDate: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: false } 
});

// Skema untuk Keanggotaan (dari kode Anda)
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
    washes: {
        bodywash: { type: Number, default: 0 },
        hidrolik: { type: Number, default: 0 }
    },
    purchaseDate: {
        type: Date,
        default: Date.now
    },
    isPaid: {
        type: Boolean,
        default: false 
    },
    expiresAt: {
        type: Date
    }
});

// Skema Utama Pengguna (dengan penyesuaian)
const UserSchema = new Schema({
    memberId: { 
        type: String, 
        unique: true, 
        sparse: true
    },
    username: { type: String, required: true, trim: true },
    email: { type: String, required: false, unique: true, sparse: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, required: true, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isVerified: { type: Boolean, default: true },
    membership: {
        type: MembershipSchema,
        default: null 
    },
    // ======================= PENYESUAIAN DI SINI =======================
    // Menambahkan referensi ke skema kartu nano coating
    nanoCoatingCard: {
        type: NanoCoatingCardSchema,
        default: null
    },
    // ===================== AKHIR DARI PENYESUAIAN =====================
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
