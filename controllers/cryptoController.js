exports.flashCrypto = async (req, res, next) => {
  try {
    const { address, amount, currency } = req.body;
    const response = await flashCryptoService(address, amount, currency);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.getWalletBalance = async (req, res, next) => {
  try {
    const { address } = req.params;
    const balance = await getWalletBalanceService(address);
    res.json({ balance });
  } catch (error) {
    next(error);
  }
};

exports.updateWalletBalance = async (req, res, next) => {
  try {
    const { address, amount, currency } = req.body;
    const updatedBalance = await updateWalletBalanceService(address, amount, currency);
    res.json({ updatedBalance });
  } catch (error) {
    next(error);
  }
};

exports.transferCrypto = async (req, res, next) => {
  try {
    const { fromAddress, toAddress, amount, currency } = req.body;
    const response = await transferCryptoService(fromAddress, toAddress, amount, currency);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.sendUSDT = async (req, res, next) => {
  try {
    return res.json({ message: "sendUSDT endpoint working ✅" });
  } catch (error) {
    next(error);
  }
};

exports.sendTRX = async (req, res, next) => {
  try {
    return res.json({ message: "sendTRX endpoint working ✅" });
  } catch (error) {
    next(error);
  }
};
