const mongoose = require('mongoose');

// Skema untuk melacak jumlah pengunjung
const VisitorSchema = new mongoose.Schema({
    // Hanya ada satu dokumen yang akan kita update terus-menerus
    identifier: {
        type: String,
        default: 'global-visitor-count',
        unique: true
    },
    // Jumlah total pengunjung
    count: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('Visitor', VisitorSchema);
