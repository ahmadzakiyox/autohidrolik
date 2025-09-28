const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Skema untuk Keanggotaan (Tidak Berubah)
const MembershipSchema = new Schema({
    packageName: { type: String, required: true },
    totalWashes: { type: Number, required: true },
    remainingWashes: { type: Number, required: true },
    purchaseDate: { type: Date, default: Date.now },
    isPaid: { type: Boolean, default: false }
});

// Skema Utama Pengguna (Direvisi)
const UserSchema = new Schema({
    memberId: { type: String, unique: true, sparse: true },
    username: { type: String, required: true, trim: true },
    
    // Email dibuat menjadi opsional
    email: { 
        type: String, 
        unique: true, 
        lowercase: true, 
        trim: true,
        // sparse:true penting agar validasi unique hanya berlaku jika email diisi
        sparse: true 
    },
    
    // Nomor HP dibuat menjadi wajib dan unik
    phone: { 
        type: String, 
        required: true, 
        unique: true, // Nomor HP harus unik
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

module.exports = mongoose.model('User', UserSchema);
