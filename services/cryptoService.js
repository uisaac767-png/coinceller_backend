const { web3, bscWeb3, tronWeb } = require("./blockchainService");
const { sendSolOnChain, getSolBalance } = require("./solanaService");
const { sendBtcOnChain, getBtcBalance } = require("./btcService");
const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");

const SUPPORTED = ["USDT", "BTC", "ETH", "TRX", "SOL"];

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

const getEvmAccount = (opts) => {
  const privateKey = process.env[opts.privateKeyEnv];
  const walletAddress = process.env[opts.walletAddressEnv];

  if (!privateKey) {
    throw new Error(`${opts.privateKeyEnv} is not configured`);
  }
  if (!walletAddress) {
    throw new Error(`${opts.walletAddressEnv} is not configured`);
  }

  const account = opts.web3.eth.accounts.privateKeyToAccount(privateKey);
  if (account.address.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new Error(
      `${opts.walletAddressEnv} does not match ${opts.privateKeyEnv}`
    );
  }
  return account;
};

const getEthAccount = () =>
  getEvmAccount({
    web3,
    privateKeyEnv: "EVM_PRIVATE_KEY",
    walletAddressEnv: "WALLET_ADDRESS",
  });

const getBscAccount = () => {
  const privateKeyEnv = process.env.BSC_PRIVATE_KEY
    ? "BSC_PRIVATE_KEY"
    : "EVM_PRIVATE_KEY";
  const walletAddressEnv = process.env.BSC_WALLET_ADDRESS
    ? "BSC_WALLET_ADDRESS"
    : "WALLET_ADDRESS";

  return getEvmAccount({
    web3: bscWeb3,
    privateKeyEnv,
    walletAddressEnv,
  });
};

const getTronSenderAddress = () => {
  const fromAddress = process.env.TRX_WALLET_ADDRESS;
  const tronPrivateKey = process.env.TRON_PRIVATE_KEY;

  if (!fromAddress) {
    throw new Error("TRX_WALLET_ADDRESS is not configured");
  }
  if (!tronPrivateKey) {
    throw new Error("TRON_PRIVATE_KEY is not configured");
  }

  const derived = tronWeb.address.fromPrivateKey(tronPrivateKey);
  if (derived !== fromAddress) {
    throw new Error("TRX_WALLET_ADDRESS does not match TRON_PRIVATE_KEY");
  }

  return fromAddress;
};

const normalizeNetwork = (network) => {
  if (!network) return null;
  return String(network).trim().toUpperCase();
};

const getExplorerUrl = (currency, network, txHash) => {
  if (!txHash) return null;
  const c = normalizeCurrency(currency);
  const n = normalizeNetwork(network);

  if (c === "BTC") return `https://mempool.space/tx/${txHash}`;
  if (c === "SOL") return `https://solscan.io/tx/${txHash}`;
  if (c === "TRX") return `https://tronscan.org/#/transaction/${txHash}`;
  if (c === "ETH") return `https://etherscan.io/tx/${txHash}`;

  if (c === "USDT") {
    if (n === "TRC20") return `https://tronscan.org/#/transaction/${txHash}`;
    if (n === "BEP20") return `https://bscscan.com/tx/${txHash}`;
    return `https://etherscan.io/tx/${txHash}`;
  }

  return null;
};

const assertSupportedNetwork = (currency, network) => {
  if (!network) return;

  if (currency === "ETH") {
    if (!["ETH", "ETHEREUM"].includes(network)) {
      throw new Error("Unsupported network for ETH");
    }
    return;
  }

  if (currency === "USDT") {
    if (!["ERC20", "ETH", "ETHEREUM", "BEP20", "TRC20"].includes(network)) {
      throw new Error(
        "Unsupported network for USDT. Use ERC20, BEP20, or TRC20."
      );
    }
    return;
  }

  if (currency === "TRX") {
    if (!["TRX", "TRON"].includes(network)) {
      throw new Error("Unsupported network for TRX");
    }
    return;
  }

  if (currency === "SOL") {
    if (!["SOL", "SOLANA"].includes(network)) {
      throw new Error("Unsupported network for SOL");
    }
    return;
  }

  if (currency === "BTC") {
    if (!["BTC", "BITCOIN"].includes(network)) {
      throw new Error("Unsupported network for BTC");
    }
    return;
  }
};

const sendEthOnChain = async (toAddress, amount) => {
  const account = getEthAccount();
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

const sendUsdtErc20OnChain = async (toAddress, amount) => {
  const account = getEthAccount();
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

const sendUsdtBep20OnChain = async (toAddress, amount) => {
  const account = getBscAccount();
  const usdtAddress = process.env.USDT_BSC_ADDRESS;
  const usdtAbiRaw = process.env.USDT_ABI;

  if (!usdtAddress || !usdtAbiRaw) {
    throw new Error("USDT_BSC_ADDRESS or USDT_ABI is not configured");
  }

  const usdtAbi = JSON.parse(usdtAbiRaw);
  const contract = new bscWeb3.eth.Contract(usdtAbi, usdtAddress);
  const amountUnits = Math.round(amount * 1e6).toString(); // USDT: 6 decimals
  const data = contract.methods.transfer(toAddress, amountUnits).encodeABI();

  const gasPrice = await bscWeb3.eth.getGasPrice();
  const nonce = await bscWeb3.eth.getTransactionCount(account.address, "pending");
  const chainId = await bscWeb3.eth.getChainId();
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

  const signed = await bscWeb3.eth.accounts.signTransaction(
    tx,
    account.privateKey
  );
  if (!signed.rawTransaction) {
    throw new Error("Failed to sign USDT BEP20 transaction");
  }
  const receipt = await bscWeb3.eth.sendSignedTransaction(signed.rawTransaction);
  return { hash: receipt.transactionHash, receipt };
};

const getUsdtErc20Balance = async (address) => {
  const usdtAddress = process.env.USDT_ADDRESS;
  const usdtAbiRaw = process.env.USDT_ABI;
  if (!usdtAddress || !usdtAbiRaw) {
    throw new Error("USDT_ADDRESS or USDT_ABI is not configured");
  }
  const usdtAbi = JSON.parse(usdtAbiRaw);
  const contract = new web3.eth.Contract(usdtAbi, usdtAddress);
  const balance = await contract.methods.balanceOf(address).call();
  return Number(balance) / 1e6;
};

const getUsdtBep20Balance = async (address) => {
  const usdtAddress = process.env.USDT_BSC_ADDRESS;
  const usdtAbiRaw = process.env.USDT_ABI;
  if (!usdtAddress || !usdtAbiRaw) {
    throw new Error("USDT_BSC_ADDRESS or USDT_ABI is not configured");
  }
  const usdtAbi = JSON.parse(usdtAbiRaw);
  const contract = new bscWeb3.eth.Contract(usdtAbi, usdtAddress);
  const balance = await contract.methods.balanceOf(address).call();
  return Number(balance) / 1e6;
};

const getUsdtTrc20Balance = async (address) => {
  const usdtTronAddress = process.env.USDT_TRON_ADDRESS;
  if (!usdtTronAddress) {
    throw new Error("USDT_TRON_ADDRESS is not configured");
  }
  const contract = await tronWeb.contract().at(usdtTronAddress);
  const balance = await contract.balanceOf(address).call();
  return Number(balance.toString()) / 1e6;
};

const normalizeMemo = (memo) => {
  if (memo == null) return null;
  const value = String(memo).trim();
  if (!value) return null;
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes > 100) {
    throw new Error("TRC20 memo is too long (max 100 bytes)");
  }
  return value;
};

const sendUsdtTrc20OnChain = async (toAddress, amount, memo) => {
  const usdtTronAddress = process.env.USDT_TRON_ADDRESS;
  if (!usdtTronAddress) {
    throw new Error("USDT_TRON_ADDRESS is not configured");
  }

  const fromAddress = getTronSenderAddress();
  const amountUnits = Math.round(amount * 1e6);
  const { transaction, result } = await tronWeb.transactionBuilder.triggerSmartContract(
    usdtTronAddress,
    "transfer(address,uint256)",
    { feeLimit: 10_000_000 },
    [
      { type: "address", value: toAddress },
      { type: "uint256", value: amountUnits },
    ],
    fromAddress
  );

  if (!result || !result.result || !transaction) {
    throw new Error("USDT TRC20 transfer failed");
  }

  const safeMemo = normalizeMemo(memo);
  if (safeMemo) {
    tronWeb.transactionBuilder.addUpdateData(transaction, safeMemo, "utf8");
  }

  const signed = await tronWeb.trx.sign(transaction);
  const sendResult = await tronWeb.trx.sendRawTransaction(signed);
  if (!sendResult.result) {
    throw new Error(sendResult.code || "USDT TRC20 transfer failed");
  }

  return { hash: sendResult.txid, receipt: sendResult };
};

const sendTrxOnChain = async (toAddress, amount) => {
  const fromAddress = getTronSenderAddress();

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

const sendOnChain = async (currency, toAddress, amount, network, memo) => {
  assertSupportedNetwork(currency, network);
  if (currency === "BTC") {
    return sendBtcOnChain(toAddress, amount);
  }

  if (currency === "ETH") {
    return sendEthOnChain(toAddress, amount);
  }

  if (currency === "USDT") {
    if (network === "TRC20") {
      return sendUsdtTrc20OnChain(toAddress, amount, memo);
    }
    if (network === "BEP20") {
      return sendUsdtBep20OnChain(toAddress, amount);
    }
    return sendUsdtErc20OnChain(toAddress, amount);
  }

  if (currency === "TRX") {
    return sendTrxOnChain(toAddress, amount);
  }

  if (currency === "SOL") {
    return sendSolOnChain(toAddress, amount);
  }

  throw new Error("Invalid currency");
};

const getOnchainBalance = async (address, currency, network) => {
  const c = normalizeCurrency(currency);
  const net = normalizeNetwork(network);
  if (!SUPPORTED.includes(c)) throw new Error("Invalid currency");

  if (c === "BTC") {
    return getBtcBalance(address);
  }

  if (c === "ETH") {
    const wei = await web3.eth.getBalance(address);
    return Number(web3.utils.fromWei(wei, "ether"));
  }

  if (c === "USDT") {
    if (net === "TRC20") return getUsdtTrc20Balance(address);
    if (net === "BEP20") return getUsdtBep20Balance(address);
    return getUsdtErc20Balance(address);
  }

  if (c === "TRX") {
    const sun = await tronWeb.trx.getBalance(address);
    return Number(sun) / 1_000_000;
  }

  if (c === "SOL") {
    return getSolBalance(address);
  }

  throw new Error("Unsupported currency");
};

const emptyBalance = () => ({
  USDT: 0,
  BTC: 0,
  ETH: 0,
  TRX: 0,
  SOL: 0,
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

const sendCrypto = async (address, amount, currency, network, memo) => {
  const c = normalizeCurrency(currency);
  const n = toAmount(amount);
  const net = normalizeNetwork(network);
  if (!SUPPORTED.includes(c)) throw new Error("Invalid currency");

  const onchain = await sendOnChain(c, address, n, net, memo);
  const updatedBalance = await updateWalletBalance(address, n, c);

  return {
    message: `Successfully sent ${n} ${c} to ${address}`,
    transaction: {
      type: "onchain-credit",
      currency: c,
      amount: n,
      address,
      txHash: onchain.hash,
      network: net || undefined,
    },
    updatedBalance,
  };
};

const flashCrypto = async (address, amount, currency, network) =>
  sendCrypto(address, amount, currency, network);

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

const transferCrypto = async (
  fromAddress,
  toAddress,
  amount,
  currency,
  network,
  memo,
  options = {}
) => {
  const c = normalizeCurrency(currency);
  const n = toAmount(amount);
  const net = normalizeNetwork(network);
  if (!SUPPORTED.includes(c)) throw new Error("Invalid currency");

  const fromWallet = await Wallet.findOne({ address: fromAddress });
  if (!fromWallet) {
    throw new Error("Wallet not found");
  }

  await normalizeWalletBalance(fromWallet);

  if (fromWallet.balance[c] < n) {
    throw new Error("Insufficient balance");
  }

  const forceOnChain =
    options && (options.forceOnChain === true || options.external === true);

  const toWallet = await Wallet.findOne({ address: toAddress });

  if (!forceOnChain && toWallet) {
    await normalizeWalletBalance(toWallet);
    fromWallet.balance[c] -= n;
    toWallet.balance[c] += n;
    await fromWallet.save();
    await toWallet.save();

    const tx = await Transaction.create({
      fromAddress,
      toAddress,
      amount: n,
      currency: c,
    });

    return {
      message: `Successfully transferred ${n} ${c} from ${fromAddress} to ${toAddress}`,
      mode: "internal-ledger",
      balances: {
        from: fromWallet.balance,
        to: toWallet.balance,
      },
      transaction: {
        id: tx._id,
        timestamp: tx.timestamp,
        fromAddress,
        toAddress,
        amount: n,
        currency: c,
        network: net || undefined,
        memo: memo || undefined,
      },
    };
  }

  let onchain;
  try {
    onchain = await sendOnChain(c, toAddress, n, net, memo);
  } catch (err) {
    const message =
      err && err.message ? err.message : String(err || "Unknown error");
    const error = new Error(`On-chain transfer failed: ${message}`);
    error.statusCode = 502;
    throw error;
  }
  fromWallet.balance[c] -= n;
  await fromWallet.save();

  const tx = await Transaction.create({
    fromAddress,
    toAddress,
    amount: n,
    currency: c,
  });

  return {
    message: `Successfully transferred ${n} ${c} from ${fromAddress} to external wallet ${toAddress}`,
    mode: "external-onchain",
    txHash: onchain.hash,
    explorerUrl: getExplorerUrl(c, net, onchain.hash),
    network: net || undefined,
    balances: {
      from: fromWallet.balance,
    },
    transaction: {
      id: tx._id,
      timestamp: tx.timestamp,
      fromAddress,
      toAddress,
      amount: n,
      currency: c,
      network: net || undefined,
      memo: memo || undefined,
      txHash: onchain.hash,
    },
  };
};

module.exports = {
  sendCrypto,
  flashCrypto,
  getWalletBalance,
  getOnchainBalance,
  updateWalletBalance,
  transferCrypto,
};
