const crypto = require("crypto");
const { Web3 } = require("web3");
const TronWeb = require("tronweb");
const { Keypair } = require("@solana/web3.js");
const bs58 = require("bs58");
const bitcoin = require("bitcoinjs-lib");
const ECPairFactory = require("ecpair").default;
const ecc = require("tiny-secp256k1");

const ECPair = ECPairFactory(ecc);
const web3 = new Web3();

const toKey = () => {
  const raw = process.env.MASTER_KEY;
  if (!raw) return null;
  return crypto.createHash("sha256").update(raw).digest();
};

const encrypt = (plain) => {
  const key = toKey();
  if (!key) {
    return { cipher: plain, alg: "plain" };
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    cipher: enc.toString("base64"),
  };
};

const generateEvm = () => {
  const account = web3.eth.accounts.create();
  return {
    address: account.address,
    privateKey: account.privateKey,
  };
};

const generateTron = async () => {
  const account = await TronWeb.createAccount();
  return {
    address: account.address.base58,
    privateKey: account.privateKey,
  };
};

const generateSol = () => {
  const kp = Keypair.generate();
  return {
    address: kp.publicKey.toBase58(),
    privateKey: bs58.encode(kp.secretKey),
  };
};

const generateBtcTestnet = () => {
  const keyPair = ECPair.makeRandom({ network: bitcoin.networks.testnet });
  const payment = bitcoin.payments.p2wpkh({
    pubkey: keyPair.publicKey,
    network: bitcoin.networks.testnet,
  });
  if (!payment.address) throw new Error("Failed to generate BTC address");
  return {
    address: payment.address,
    privateKey: keyPair.toWIF(),
  };
};

const generateAll = async () => {
  const evm = generateEvm();
  const bsc = generateEvm();
  const tron = await generateTron();
  const sol = generateSol();
  const btc = generateBtcTestnet();

  return {
    evm: {
      address: evm.address,
      privateKey: encrypt(evm.privateKey),
    },
    bsc: {
      address: bsc.address,
      privateKey: encrypt(bsc.privateKey),
    },
    tron: {
      address: tron.address,
      privateKey: encrypt(tron.privateKey),
    },
    sol: {
      address: sol.address,
      privateKey: encrypt(sol.privateKey),
    },
    btc: {
      address: btc.address,
      privateKey: encrypt(btc.privateKey),
    },
    network: "testnet",
  };
};

module.exports = { generateAll };
