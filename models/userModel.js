const mongoose = require('mongoose');

const EncryptedFieldSchema = new mongoose.Schema(
  {
    alg: { type: String, default: "plain" },
    iv: { type: String },
    tag: { type: String },
    cipher: { type: String, required: true },
  },
  { _id: false }
);

const WalletEntrySchema = new mongoose.Schema(
  {
    address: { type: String },
    privateKey: { type: EncryptedFieldSchema },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  displayName: { type: String, default: "" },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  wallets: {
    evm: { type: WalletEntrySchema },
    bsc: { type: WalletEntrySchema },
    tron: { type: WalletEntrySchema },
    sol: { type: WalletEntrySchema },
    btc: { type: WalletEntrySchema },
    network: { type: String, default: "testnet" },
  },
});

module.exports = mongoose.model('User', UserSchema);
