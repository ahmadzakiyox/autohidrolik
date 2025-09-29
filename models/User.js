const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Skema untuk Keanggotaan (Tidak Berubah)
const MembershipSchema = new Schema({
    packageName: {
        type: String,
        required: true
    },
    // PERUBAHAN UTAMA: 'remainingWashes' & 'totalWashes' diganti menjadi objek 'washes'
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
    expiresAt: { // Pastikan field ini ada dari revisi sebelumnya
        type: Date,
        required: true
    }
});

// Skema Utama Pengguna (Direvisi)
const UserSchema = new Schema({
    memberId: { type: String, unique: true, sparse: true },
    username: { type: String, required: true, trim: true, unique: true },
    
    // Email dibuat menjadi opsional namun tetap unik jika diisi
    email: { 
        type: String, 
        unique: true, 
        lowercase: true, 
        trim: true,
        // sparse:true penting agar validasi unik hanya berlaku jika email diisi
        sparse: true 
    },
    
    // Nomor HP dibuat menjadi wajib dan unik
    phone: { 
        type: String, 
        required: [true, 'Nomor WhatsApp wajib diisi.'], 
        unique: true, 
        trim: true 
    },

    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isVerified: { type: Boolean, default: true },
    membership: {
        type: MembershipSchema,
        default: null
    }
}, {
    // Menggantikan field 'date' manual dengan timestamp otomatis
    timestamps: true 
});

// Anda bisa menambahkan enkripsi password di sini jika diperlukan
// UserSchema.pre('save', ...);
// UserSchema.methods.comparePassword = ...;

module.exports = mongoose.model('User', UserSchema);
