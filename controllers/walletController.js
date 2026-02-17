const { generateAll } = require("../services/walletAddressService");

const formatWallets = (wallets) => {
  if (!wallets) return null;
  return {
    network: wallets.network || "testnet",
    evm: wallets.evm?.address || null,
    bsc: wallets.bsc?.address || null,
    tron: wallets.tron?.address || null,
    sol: wallets.sol?.address || null,
    btc: wallets.btc?.address || null,
  };
};

exports.getWalletAddresses = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user.wallets || !user.wallets.evm?.address) {
      return res.json({ wallets: null, network: "testnet" });
    }
    return res.json({ wallets: formatWallets(user.wallets) });
  } catch (err) {
    next(err);
  }
};

exports.generateWalletAddresses = async (req, res, next) => {
  try {
    const user = req.user;
    const wallets = await generateAll();
    user.wallets = wallets;
    await user.save();
    return res.json({ wallets: formatWallets(user.wallets) });
  } catch (err) {
    next(err);
  }
};
