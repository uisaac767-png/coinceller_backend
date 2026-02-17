const express = require('express');
const router = express.Router();
const cryptoController = require('../controllers/cryptoController');

router.post('/sendUSDT', cryptoController.sendUSDT);
router.post('/sendTRX', cryptoController.sendTRX);

router.post('/send', cryptoController.sendCrypto);
router.post('/flash', cryptoController.flashCrypto);
router.get('/balance/:address', cryptoController.getWalletBalance);
router.get('/onchain-balance/:address', cryptoController.getOnchainBalance);
router.post('/updateBalance', cryptoController.updateWalletBalance);

router.post('/transfer', cryptoController.transferCrypto); // ✅ ADD THIS

module.exports = router;
