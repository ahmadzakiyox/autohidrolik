// File baru: models/Membership.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MembershipSchema = new Schema({
    // Referensi ke pemilik paket ini
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Ini terhubung ke collection 'User'
        required: true
    },
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

module.exports = mongoose.model('Membership', MembershipSchema);
