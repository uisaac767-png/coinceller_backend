const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
 address: { type: String, required: true, unique: true },
 balance: { type: Number, default: 0 },
 fakeBalance: { type: Number, default: 0 },
});

module.exports = mongoose.model('Wallet', WalletSchema);
