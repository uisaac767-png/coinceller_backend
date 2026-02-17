const { transferCrypto } = require('../services/cryptoService');

exports.transferCrypto = async (req, res, next) => {
 try {
 const { fromAddress, toAddress, amount, currency, network, memo } = req.body;
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
