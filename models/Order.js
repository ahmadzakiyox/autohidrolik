const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    user: { // Reference to the user who created the order
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    customerName: {
        type: String,
        required: true
    },
    plateNumber: {
        type: String,
        required: true
    },
    vehicleBrand: {
        type: String,
        required: true
    },
    vehicleCategory: {
        type: String,
        required: true
    },
    service: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('order', OrderSchema);