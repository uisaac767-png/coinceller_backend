const axios = require("axios");
const bitcoin = require("bitcoinjs-lib");
const ECPairFactory = require("ecpair").default;
const ecc = require("tiny-secp256k1");

const ECPair = ECPairFactory(ecc);
const NETWORK = bitcoin.networks.bitcoin;

const getRpcConfig = () => {
  const url = process.env.BTC_RPC_URL;
  const user = process.env.BTC_RPC_USER;
  const pass = process.env.BTC_RPC_PASSWORD;
  const wallet = process.env.BTC_RPC_WALLET;
  if (!url || !user || !pass) return null;
  return { url, user, pass, wallet };
};

const callRpc = async (method, params = []) => {
  const config = getRpcConfig();
  if (!config) {
    throw new Error("BTC RPC is not configured");
  }
  const endpoint = config.wallet
    ? `${config.url}/wallet/${config.wallet}`
    : config.url;

  const response = await axios.post(
    endpoint,
    {
      jsonrpc: "2.0",
      id: "celler",
      method,
      params,
    },
    {
      auth: {
        username: config.user,
        password: config.pass,
      },
      timeout: 15000,
    }
  );

  if (response.data?.error) {
    throw new Error(response.data.error.message || "BTC RPC error");
  }

  return response.data?.result;
};

const fetchBlockchair = async (path, params = {}) => {
  const key = process.env.BLOCKCHAIR_API_KEY;
  const url = `https://api.blockchair.com/bitcoin/${path}`;
  const response = await axios.get(url, {
    params: key ? { key, ...params } : params,
    timeout: 15000,
  });
  return response.data;
};

const estimateFeeRate = async () => {
  const envRate = Number(process.env.BTC_FEE_RATE_SAT_PER_VB);
  if (Number.isFinite(envRate) && envRate > 0) return envRate;

  try {
    const stats = await fetchBlockchair("stats");
    const suggested = stats?.data?.suggested_transaction_fee_per_byte;
    if (Number.isFinite(suggested) && suggested > 0) return suggested;
  } catch (_) {}

  return 10;
};

const selectUtxos = (utxos, target) => {
  const selected = [];
  let total = 0;
  for (const utxo of utxos) {
    selected.push(utxo);
    total += utxo.value;
    if (total >= target) break;
  }
  return { selected, total };
};

const buildAndBroadcastWithBlockchair = async (toAddress, amountBtc) => {
  const fromAddress = process.env.BTC_FROM_ADDRESS;
  const wif = process.env.BTC_PRIVATE_KEY_WIF;

  if (!fromAddress || !wif) {
    throw new Error("BTC_FROM_ADDRESS or BTC_PRIVATE_KEY_WIF is not configured");
  }

  if (!fromAddress.startsWith("bc1")) {
    throw new Error(
      "Blockchair fallback requires a bech32 (bc1) sender address. Use BTC RPC instead."
    );
  }

  const keyPair = ECPair.fromWIF(wif, NETWORK);
  const payment = bitcoin.payments.p2wpkh({
    pubkey: keyPair.publicKey,
    network: NETWORK,
  });

  if (!payment.address || payment.address !== fromAddress) {
    throw new Error("BTC_FROM_ADDRESS does not match BTC_PRIVATE_KEY_WIF");
  }

  const dashboard = await fetchBlockchair(
    `dashboards/address/${fromAddress}`
  );
  const utxos = dashboard?.data?.[fromAddress]?.utxo || [];
  if (!Array.isArray(utxos) || utxos.length === 0) {
    throw new Error("No BTC UTXOs available for sender address");
  }

  const feeRate = await estimateFeeRate();
  const amountSats = Math.round(Number(amountBtc) * 1e8);
  if (!Number.isFinite(amountSats) || amountSats <= 0) {
    throw new Error("Invalid BTC amount");
  }

  const estimatedInputs = 1;
  const estimatedOutputs = 2;
  const estimatedVbytes = estimatedInputs * 68 + estimatedOutputs * 31 + 10;
  const estimatedFee = Math.ceil(estimatedVbytes * feeRate);
  const target = amountSats + estimatedFee;

  utxos.sort((a, b) => b.value - a.value);
  const { selected, total } = selectUtxos(utxos, target);
  if (total < target) {
    throw new Error("Insufficient BTC balance for amount + fee");
  }

  const psbt = new bitcoin.Psbt({ network: NETWORK });
  for (const utxo of selected) {
    psbt.addInput({
      hash: utxo.transaction_hash,
      index: utxo.index,
      witnessUtxo: {
        script: payment.output,
        value: utxo.value,
      },
    });
  }

  psbt.addOutput({
    address: toAddress,
    value: amountSats,
  });

  const change = total - amountSats - estimatedFee;
  if (change > 546) {
    psbt.addOutput({
      address: fromAddress,
      value: change,
    });
  }

  psbt.signAllInputs(keyPair);
  psbt.finalizeAllInputs();
  const rawTx = psbt.extractTransaction().toHex();

  const key = process.env.BLOCKCHAIR_API_KEY;
  const pushUrl = `https://api.blockchair.com/bitcoin/push/transaction${
    key ? `?key=${key}` : ""
  }`;
  const response = await axios.post(
    pushUrl,
    new URLSearchParams({ data: rawTx }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
    }
  );

  const txid = response?.data?.data?.transaction_hash;
  if (!txid) {
    throw new Error("Blockchair broadcast failed");
  }

  return { hash: txid, receipt: response.data };
};

const sendBtcOnChain = async (toAddress, amountBtc) => {
  const rpcConfig = getRpcConfig();
  if (rpcConfig) {
    const txid = await callRpc("sendtoaddress", [toAddress, Number(amountBtc)]);
    return { hash: txid, receipt: { txid, provider: "bitcoin-core" } };
  }

  return buildAndBroadcastWithBlockchair(toAddress, amountBtc);
};

module.exports = { sendBtcOnChain };
