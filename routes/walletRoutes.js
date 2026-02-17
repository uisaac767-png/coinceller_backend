const express = require("express");
const auth = require("../middleware/auth");
const {
  getWalletAddresses,
  generateWalletAddresses,
} = require("../controllers/walletController");

const router = express.Router();

router.get("/addresses", auth, getWalletAddresses);
router.post("/generate", auth, generateWalletAddresses);

module.exports = router;
