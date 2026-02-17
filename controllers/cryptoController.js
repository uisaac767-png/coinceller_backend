const {
  sendCrypto,
  flashCrypto,
  getWalletBalance,
  updateWalletBalance,
  transferCrypto,
} = require("../services/cryptoService");

exports.sendCrypto = async (req, res, next) => {
  try {
    const { address, amount, currency, network, memo } = req.body;
    const response = await sendCrypto(address, amount, currency, network, memo);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.flashCrypto = async (req, res, next) => {
  try {
    const { address, amount, currency, network, memo } = req.body;
    const response = await sendCrypto(address, amount, currency, network, memo);
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
    const { fromAddress, toAddress, amount, currency, network, memo } =
      req.body;
    const response = await transferCrypto(
      fromAddress,
      toAddress,
      amount,
      currency,
      network,
      memo
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.sendUSDT = async (req, res, next) => {
  try {
    const { address, amount } = req.body;
    const response = await sendCrypto(address, amount, "USDT", "ERC20");
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.sendTRX = async (req, res, next) => {
  try {
    const { address, amount } = req.body;
    const response = await sendCrypto(address, amount, "TRX", "TRON");
    res.json(response);
  } catch (error) {
    next(error);
  }
};
