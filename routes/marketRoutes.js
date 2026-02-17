const express = require("express");
const router = express.Router();
const marketController = require("../controllers/marketController");

router.get("/prices", marketController.getPrices);

module.exports = router;
