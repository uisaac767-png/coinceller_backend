const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
 fromAddress: { type: String, required: true },
 toAddress: { type: String, required: true },
 amount: { type: Number, required: true },
 currency: { type: String, required: true },
 timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Transaction', TransactionSchema);
