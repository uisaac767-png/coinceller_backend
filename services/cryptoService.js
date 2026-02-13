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

const getEvmAccount = () => {
  const privateKey = process.env.EVM_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("EVM_PRIVATE_KEY is not configured");
  }
  return web3.eth.accounts.privateKeyToAccount(privateKey);
};

const sendEthOnChain = async (toAddress, amount) => {
  const account = getEvmAccount();
  const valueWei = web3.utils.toWei(String(amount), "ether");
  const gasPrice = await web3.eth.getGasPrice();
  const nonce = await web3.eth.getTransactionCount(account.address, "pending");
  const chainId = await web3.eth.getChainId();

  const tx = {
    from: account.address,
    to: toAddress,
    value: valueWei,
    gas: 21000,
    gasPrice,
    nonce,
    chainId,
  };

  const signed = await web3.eth.accounts.signTransaction(tx, account.privateKey);
  if (!signed.rawTransaction) throw new Error("Failed to sign ETH transaction");
  const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);
  return { hash: receipt.transactionHash, receipt };
};

const sendUsdtOnChain = async (toAddress, amount) => {
  const account = getEvmAccount();
  const usdtAddress = process.env.USDT_ADDRESS;
  const usdtAbiRaw = process.env.USDT_ABI;

  if (!usdtAddress || !usdtAbiRaw) {
    throw new Error("USDT_ADDRESS or USDT_ABI is not configured");
  }

  const usdtAbi = JSON.parse(usdtAbiRaw);
  const contract = new web3.eth.Contract(usdtAbi, usdtAddress);
  const amountUnits = Math.round(amount * 1e6).toString(); // USDT: 6 decimals
  const data = contract.methods.transfer(toAddress, amountUnits).encodeABI();

  const gasPrice = await web3.eth.getGasPrice();
  const nonce = await web3.eth.getTransactionCount(account.address, "pending");
  const chainId = await web3.eth.getChainId();
  const gas = await contract.methods
    .transfer(toAddress, amountUnits)
    .estimateGas({ from: account.address });

  const tx = {
    from: account.address,
    to: usdtAddress,
    data,
    gas,
    gasPrice,
    nonce,
    chainId,
  };

  const signed = await web3.eth.accounts.signTransaction(tx, account.privateKey);
  if (!signed.rawTransaction) throw new Error("Failed to sign USDT transaction");
  const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);
  return { hash: receipt.transactionHash, receipt };
};

const sendTrxOnChain = async (toAddress, amount) => {
  const fromAddress = process.env.TRX_WALLET_ADDRESS;
  if (!fromAddress) {
    throw new Error("TRX_WALLET_ADDRESS is not configured");
  }

  const sunAmount = Math.round(amount * 1_000_000); // TRX: 1e6 sun
  const unsigned = await tronWeb.transactionBuilder.sendTrx(
    toAddress,
    sunAmount,
    fromAddress
  );
  const signed = await tronWeb.trx.sign(unsigned);
  const result = await tronWeb.trx.sendRawTransaction(signed);
  if (!result.result) {
    throw new Error(result.code || "TRX transfer failed");
  }
  return { hash: result.txid, receipt: result };
};

const sendOnChain = async (currency, toAddress, amount) => {
  if (currency === "BTC") {
    throw new Error("BTC on-chain transfer is not supported by current backend");
  }

  if (currency === "ETH") {
    return sendEthOnChain(toAddress, amount);
  }

  if (currency === "USDT") {
    return sendUsdtOnChain(toAddress, amount);
  }

  if (currency === "TRX") {
    return sendTrxOnChain(toAddress, amount);
  }

  throw new Error("Invalid currency");
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

  const onchain = await sendOnChain(c, address, n);
  const updatedBalance = await updateWalletBalance(address, n, c);

  return {
    message: `Successfully processed ${n} ${c} to ${address}`,
    transaction: {
      type: "onchain-credit",
      currency: c,
      amount: n,
      address,
      txHash: onchain.hash,
    },
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
  if (!fromWallet) {
    throw new Error("Wallet not found");
  }

  await normalizeWalletBalance(fromWallet);

  if (fromWallet.balance[c] < n) {
    throw new Error("Insufficient balance");
  }

  const toWallet = await Wallet.findOne({ address: toAddress });
  if (toWallet) {
    await normalizeWalletBalance(toWallet);
    fromWallet.balance[c] -= n;
    toWallet.balance[c] += n;
    await fromWallet.save();
    await toWallet.save();

    return {
      message: `Successfully transferred ${n} ${c} from ${fromAddress} to ${toAddress}`,
      mode: "internal-ledger",
      balances: {
        from: fromWallet.balance,
        to: toWallet.balance,
      },
    };
  }

  const onchain = await sendOnChain(c, toAddress, n);
  fromWallet.balance[c] -= n;
  await fromWallet.save();

  return {
    message: `Successfully transferred ${n} ${c} from ${fromAddress} to external wallet ${toAddress}`,
    mode: "external-onchain",
    txHash: onchain.hash,
    balances: {
      from: fromWallet.balance,
    },
  };
};

module.exports = {
  flashCrypto,
  getWalletBalance,
  updateWalletBalance,
  transferCrypto,
};
