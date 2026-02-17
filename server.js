// ===============================
// 🚀 Celler Backend Server
// ===============================

// ✅ DNS Fix for MongoDB Atlas (must stay at the very top)
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

const REQUIRED_ENV = [
  "MONGO_URI",
  "INFURA_PROJECT_ID",
  "WALLET_ADDRESS",
  "USDT_ABI",
  "USDT_ADDRESS",
  "TRX_WALLET_ADDRESS",
  "SENDGRID_API_KEY",
];

const OPTIONAL_ENV = [
  "EVM_PRIVATE_KEY",
  "TRON_PRIVATE_KEY",
  "TRON_FULL_HOST",
  "USDT_TRON_ADDRESS",
  "BSC_RPC_URL",
  "BSC_PRIVATE_KEY",
  "BSC_WALLET_ADDRESS",
  "USDT_BSC_ADDRESS",
  "BTC_RPC_URL",
  "BTC_RPC_USER",
  "BTC_RPC_PASSWORD",
  "BTC_RPC_WALLET",
  "BTC_FROM_ADDRESS",
  "BTC_PRIVATE_KEY_WIF",
  "BLOCKCHAIR_API_KEY",
  "BTC_FEE_RATE_SAT_PER_VB",
  "HELIUS_API_KEY",
  "SOLANA_RPC_URL",
  "SOLANA_PRIVATE_KEY",
];

const missingRequired = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingRequired.length) {
  console.warn(
    "Missing required environment variables:",
    missingRequired.join(", ")
  );
}

const missingOptional = OPTIONAL_ENV.filter((key) => !process.env[key]);
if (missingOptional.length) {
  console.warn(
    "Missing optional environment variables:",
    missingOptional.join(", ")
  );
}

// ===============================
// ✅ Middleware
// ===============================
app.use(cors());
app.use(express.json());

// ===============================
// ✅ API Routes
// ===============================
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/transfer", require("./routes/transferRoutes"));
app.use("/api/transaction", require("./routes/transactionRoutes"));
app.use("/api/profile", require("./routes/profileRoutes"));
app.use("/api/crypto", require("./routes/cryptoRoutes"));
app.use("/api/market", require("./routes/marketRoutes"));
app.use("/api/wallets", require("./routes/walletRoutes"));

// ===============================
// ✅ Root Route (Professional Status Check)
// ===============================
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    app: "Celler Backend API",
    message: "Celler server is running successfully 🚀",
    timestamp: new Date(),
  });
});

// ===============================
// ✅ MongoDB Connection
// ===============================
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("===================================");
    console.log("✅ MongoDB Connected Successfully");
    console.log("🚀 Celler Backend is LIVE");
    console.log("===================================");
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Failed");
    console.error(err.message);
    process.exit(1);
  });

// ===============================
// ✅ Global Error Handler
// ===============================
app.use(require("./middleware/errorHandler"));

// ===============================
// ✅ Start Server
// ===============================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("===================================");
  console.log(`🚀 Celler is running on port ${PORT}`);
  console.log("🌍 Environment:", process.env.NODE_ENV || "development");
  console.log("===================================");
});
