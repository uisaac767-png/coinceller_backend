const {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  PublicKey,
} = require("@solana/web3.js");
const bs58 = require("bs58");

const getSolanaConnection = () => {
  const rpcUrl =
    process.env.SOLANA_RPC_URL ||
    (process.env.HELIUS_API_KEY
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : null);

  if (!rpcUrl) {
    throw new Error("SOLANA_RPC_URL or HELIUS_API_KEY is not configured");
  }

  return new Connection(rpcUrl, "confirmed");
};

const getSolanaKeypair = () => {
  const raw = process.env.SOLANA_PRIVATE_KEY;
  if (!raw) {
    throw new Error("SOLANA_PRIVATE_KEY is not configured");
  }

  let secretKey;
  const trimmed = raw.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const arr = JSON.parse(trimmed);
    secretKey = Uint8Array.from(arr);
  } else {
    secretKey = bs58.decode(trimmed);
  }

  return Keypair.fromSecretKey(secretKey);
};

const sendSolOnChain = async (toAddress, amount) => {
  const connection = getSolanaConnection();
  const fromKeypair = getSolanaKeypair();
  const lamports = Math.round(Number(amount) * LAMPORTS_PER_SOL);
  if (!Number.isFinite(lamports) || lamports <= 0) {
    throw new Error("Invalid SOL amount");
  }

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: new PublicKey(toAddress),
      lamports,
    })
  );

  const signature = await connection.sendTransaction(tx, [fromKeypair], {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  return { hash: signature, receipt: { signature } };
};

const getSolBalance = async (address) => {
  const connection = getSolanaConnection();
  const pubkey = new PublicKey(address);
  const lamports = await connection.getBalance(pubkey, "confirmed");
  return lamports / LAMPORTS_PER_SOL;
};

module.exports = { sendSolOnChain, getSolBalance };
