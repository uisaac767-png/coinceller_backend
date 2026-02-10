const express = require('express');
const { transferCrypto } = require('../controllers/transferController');
const router = express.Router();

router.post('/', transferCrypto);

module.exports = router;
