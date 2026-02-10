const express = require('express');
const router = express.Router();
const cryptoController = require('../controllers/cryptoController');

router.post('/sendUSDT', cryptoController.sendUSDT);
router.post('/sendTRX', cryptoController.sendTRX);

router.post('/flash', cryptoController.flashCrypto);
router.get('/balance/:address', cryptoController.getWalletBalance);
router.post('/updateBalance', cryptoController.updateWalletBalance);

router.post('/transfer', cryptoController.transferCrypto); // ✅ ADD THIS

module.exports = router;
