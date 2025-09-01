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
    purchaseDate: {
        type: Date,
        default: Date.now
    },
    isPaid: {
        type: Boolean,
        default: false 
    },

       // --- PENAMBAHAN BARU UNTUK MASA AKTIF ---
    expiresAt: {
        type: Date,
        required: true
    }   
});

// Skema Utama Pengguna
const UserSchema = new Schema({
    memberId: { 
        type: String, 
        unique: true, 
        sparse: true
    },
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, required: true, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    
    // --- PENAMBAHAN WAJIB DI SINI ---
    isVerified: { type: Boolean, default: true },
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },
    // ------------------------------------

    membership: {
        type: MembershipSchema,
        default: null
    },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
