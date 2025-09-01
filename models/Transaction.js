const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Skema untuk mencatat setiap transaksi yang sudah dikonfirmasi
const TransactionSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    packageName: {
        type: String,
        required: true
    },
    amount: { // Jumlah uang yang dibayarkan
        type: Number,
        required: true
    },
    transactionDate: { // Tanggal saat pembayaran dikonfirmasi
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
