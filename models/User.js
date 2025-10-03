// File: models/User.js (Versi Final setelah penyesuaian)

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Skema MembershipSchema yang sebelumnya ada di sini telah dihapus
// dan dipindahkan ke file models/Membership.js

// Skema Utama Pengguna
const UserSchema = new Schema({
    memberId: { type: String, unique: true, sparse: true },
    username: { type: String, required: true, trim: true },
    email: { type: String, required: false, unique: true, sparse: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, required: true, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isVerified: { type: Boolean, default: true },
    
    // Array 'memberships' [MembershipSchema] sudah dihapus dari sini.
    
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
