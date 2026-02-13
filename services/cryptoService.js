const { web3, tronWeb } = require("./blockchainService");
const Wallet = require("../models/walletModel");

const SUPPORTED = ["USDT", "BTC", "ETH", "TRX"];

const normalizeCurrency = (currency) => {
  const c = String(currency || "").toUpperCase();
  if (c === "TRON") return "TRX";
  return c;
};

const toAmount = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Invalid amount");
  }
  return n;
};

const emptyBalance = () => ({
  USDT: 0,
  BTC: 0,
  ETH: 0,
  TRX: 0,
});

const normalizeWalletBalance = async (wallet) => {
  if (!wallet) return null;

  // Backward compatibility: old schema used numeric balance.
  if (typeof wallet.balance === "number") {
    wallet.balance = {
      ...emptyBalance(),
      USDT: wallet.balance,
    };
    await wallet.save();
    return wallet;
  }

  if (!wallet.balance || typeof wallet.balance !== "object") {
    wallet.balance = emptyBalance();
    await wallet.save();
    return wallet;
  }

  let dirty = false;
  for (const coin of SUPPORTED) {
    if (typeof wallet.balance[coin] !== "number") {
      wallet.balance[coin] = 0;
      dirty = true;
    }
  }
  if (dirty) await wallet.save();
  return wallet;
};

const getOrCreateWallet = async (address) => {
  if (!address) throw new Error("Wallet address is required");
  let wallet = await Wallet.findOne({ address });
  if (!wallet) {
    wallet = await Wallet.create({
      address,
      balance: emptyBalance(),
    });
  }
  return normalizeWalletBalance(wallet);
};

const flashCrypto = async (address, amount, currency) => {
  const c = normalizeCurrency(currency);
  const n = toAmount(amount);
  if (!SUPPORTED.includes(c)) throw new Error("Invalid currency");

  // This endpoint currently updates app wallet ledger.
  // If real on-chain transfer is required, add signed tx flow with private keys.
  const updatedBalance = await updateWalletBalance(address, n, c);

  return {
    message: `Successfully processed ${n} ${c} to ${address}`,
    transaction: { type: "ledger-credit", currency: c, amount: n, address },
    updatedBalance,
  };
};

const getWalletBalance = async (address) => {
  const wallet = await Wallet.findOne({ address });
  if (!wallet) {
    throw new Error("Wallet not found");
  }
  const normalized = await normalizeWalletBalance(wallet);
  return normalized.balance;
};

const updateWalletBalance = async (address, amount, currency) => {
  const c = normalizeCurrency(currency);
  const n = toAmount(amount);
  if (!SUPPORTED.includes(c)) throw new Error("Invalid currency");

  const wallet = await getOrCreateWallet(address);
  wallet.balance[c] += n;
  await wallet.save();
  return wallet.balance;
};

const transferCrypto = async (fromAddress, toAddress, amount, currency) => {
  const c = normalizeCurrency(currency);
  const n = toAmount(amount);
  if (!SUPPORTED.includes(c)) throw new Error("Invalid currency");

  const fromWallet = await Wallet.findOne({ address: fromAddress });
  const toWallet = await Wallet.findOne({ address: toAddress });

  if (!fromWallet || !toWallet) {
    throw new Error("Wallet not found");
  }

  await normalizeWalletBalance(fromWallet);
  await normalizeWalletBalance(toWallet);

  if (fromWallet.balance[c] < n) {
    throw new Error("Insufficient balance");
  }

  fromWallet.balance[c] -= n;
  toWallet.balance[c] += n;
  await fromWallet.save();
  await toWallet.save();

  return {
    message: `Successfully transferred ${n} ${c} from ${fromAddress} to ${toAddress}`,
    balances: {
      from: fromWallet.balance,
      to: toWallet.balance,
    },
  };
};

module.exports = {
  flashCrypto,
  getWalletBalance,
  updateWalletBalance,
  transferCrypto,
};
