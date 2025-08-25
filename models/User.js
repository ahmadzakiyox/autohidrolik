const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Skema untuk setiap kendaraan yang dimiliki pengguna
// Meskipun tidak digunakan di form registrasi, ini bisa diisi nanti di halaman profil
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
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: { // Nomor WhatsApp/HP
        type: String,
        required: true, // Dijadikan wajib sesuai form baru
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    fullName: {
        type: String,
        default: '' // Opsional, bisa diisi nanti
    },
    address: {
        type: String,
        default: '' // Opsional, bisa diisi nanti
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    vehicles: [VehicleSchema], // Opsional, bisa diisi nanti
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', UserSchema);
