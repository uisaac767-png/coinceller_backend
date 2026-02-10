const { transferCrypto } = require('../services/cryptoService');
const { tronWeb } = require('../services/blockchainService');

exports.transferCrypto = async (req, res, next) => {
 try {
 const { fromAddress, toAddress, amount, currency } = req.body;
 const response = await transferCrypto(fromAddress, toAddress, amount, currency, tronWeb);
 res.json(response);
 } catch (error) {
 next(error);
 }
};
