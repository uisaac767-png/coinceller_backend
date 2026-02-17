const Transaction = require("../models/transactionModel");

exports.getTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find()
      .sort({ timestamp: -1 })
      .limit(200)
      .lean();
    res.json(transactions);
  } catch (err) {
    next(err);
  }
};
