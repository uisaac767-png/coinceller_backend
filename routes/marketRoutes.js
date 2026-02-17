const express = require("express");
const router = express.Router();
const marketController = require("../controllers/marketController");

router.get("/prices", marketController.getPrices);
router.get("/candles", marketController.getCandles);

module.exports = router;
