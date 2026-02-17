const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
 address: { type: String, required: true, unique: true },
 balance: {
  USDT: { type: Number, default: 0 },
  BTC: { type: Number, default: 0 },
  ETH: { type: Number, default: 0 },
  TRX: { type: Number, default: 0 },
  SOL: { type: Number, default: 0 },
 },
 fakeBalance: { type: Number, default: 0 },
});

module.exports = mongoose.model('Wallet', WalletSchema);
