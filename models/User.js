const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Skema untuk Keanggotaan (Membership)
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
    washes: { // Untuk paket kombinasi
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
    },
    // ID unik untuk setiap paket, akan digunakan di QR code
    packageId: {
        type: String,
        unique: true,
        sparse: true
    }
});

const NanoCoatingCardSchema = new Schema({
    cardNumber: { type: String, unique: true },
    ownerName: { type: String, default: '' },
    plateNumber: { type: String, default: '' },
    coatingDate: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: false } 
});

// Skema Utama Pengguna
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
    
    // ================== PERUBAHAN UTAMA DI SINI ==================
    // 'membership' diubah menjadi 'memberships' dan menjadi array
    memberships: [MembershipSchema],
    // ================= AKHIR PERUBAHAN =================
    
    nanoCoatingCard: {
        type: NanoCoatingCardSchema,
        default: null
    },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
