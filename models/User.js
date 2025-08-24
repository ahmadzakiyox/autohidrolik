const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Skema untuk setiap kendaraan yang dimiliki pengguna
const VehicleSchema = new Schema({
    type: {
        type: String,
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    licensePlate: {
        type: String,
        required: true,
        uppercase: true
    }
});

// Skema utama untuk pengguna (User)
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
    fullName: {
        type: String,
        default: ''
    },
    phone: {
        type: String,
        default: ''
    },
    address: {
        type: String,
        default: ''
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
    emailToken: { // Digunakan untuk verifikasi email jika diperlukan
        type: String 
    },
    vehicles: [VehicleSchema], // Array yang berisi dokumen kendaraan
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', UserSchema);
