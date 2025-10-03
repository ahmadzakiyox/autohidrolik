// File: models/User.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Skema Utama Pengguna
const UserSchema = new Schema({
    memberId: { type: String, unique: true, sparse: true },
    username: { type: String, required: true, trim: true },
    email: { type: String, required: false, unique: true, sparse: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, required: true, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isVerified: { type: Boolean, default: true },
    
    // INI BAGIAN YANG DIPERBAIKI
    // Kita definisikan 'memberships' sebagai array yang merujuk ke model 'Membership'
    memberships: [{
        type: Schema.Types.ObjectId,
        ref: 'Membership' // 'ref' ini memberitahu Mongoose untuk mencari di koleksi 'Membership'
    }],
    
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
