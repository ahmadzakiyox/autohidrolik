const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Skema untuk SETIAP paket yang dibeli
const MembershipSchema = new Schema({
    packageName: { type: String, required: true },
    isPaid: { type: Boolean, default: false },
    purchaseDate: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    packageId: { type: String, unique: true, sparse: true },

    // Untuk paket cuci biasa
    totalWashes: { type: Number, default: 0 },
    remainingWashes: { type: Number, default: 0 },

    // Untuk paket kombinasi
    washes: {
        bodywash: { type: Number, default: 0 },
        hidrolik: { type: Number, default: 0 }
    },

    // KHUSUS untuk paket Nano Coating
    ownerName: { type: String, default: '' },
    plateNumber: { type: String, default: '' },
    coatingDate: { type: Date }
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
    
    // Semua paket akan disimpan di sini dalam bentuk array
    memberships: [MembershipSchema],
    
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
