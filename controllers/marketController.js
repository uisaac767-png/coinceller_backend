const { fetchPrices } = require("../services/marketService");

exports.getPrices = async (req, res, next) => {
  try {
    const prices = await fetchPrices();
    res.json({
      prices,
      source: "coingecko",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
