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
