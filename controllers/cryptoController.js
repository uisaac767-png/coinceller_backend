const {
  flashCrypto,
  getWalletBalance,
  updateWalletBalance,
  transferCrypto,
} = require("../services/cryptoService");

exports.flashCrypto = async (req, res, next) => {
  try {
    const { address, amount, currency } = req.body;
    const response = await flashCrypto(address, amount, currency);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.getWalletBalance = async (req, res, next) => {
  try {
    const { address } = req.params;
    const balance = await getWalletBalance(address);
    res.json({ balance });
  } catch (error) {
    next(error);
  }
};

exports.updateWalletBalance = async (req, res, next) => {
  try {
    const { address, amount, currency } = req.body;
    const updatedBalance = await updateWalletBalance(address, amount, currency);
    res.json({ updatedBalance });
  } catch (error) {
    next(error);
  }
};

exports.transferCrypto = async (req, res, next) => {
  try {
    const { fromAddress, toAddress, amount, currency } = req.body;
    const response = await transferCrypto(fromAddress, toAddress, amount, currency);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.sendUSDT = async (req, res, next) => {
  try {
    const { address, amount } = req.body;
    const response = await flashCrypto(address, amount, "USDT");
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.sendTRX = async (req, res, next) => {
  try {
    const { address, amount } = req.body;
    const response = await flashCrypto(address, amount, "TRX");
    res.json(response);
  } catch (error) {
    next(error);
  }
};
