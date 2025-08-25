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
        default: false // Status pembayaran, default-nya false
    }
});

// Skema Utama Pengguna
const UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isVerified: {
        type: Boolean,
        default: true
    },
    membership: {
        type: MembershipSchema,
        default: null // Menjadi member jika field ini diisi
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', UserSchema);
