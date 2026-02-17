const { fetchPrices, fetchCandles } = require("../services/marketService");

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

exports.getCandles = async (req, res, next) => {
  try {
    const coin = req.query.coin || "BTC";
    const interval = req.query.interval || "5m";
    const candles = await fetchCandles(coin, interval);
    res.json({
      coin: String(coin).toUpperCase(),
      interval,
      candles,
      source: "coingecko",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
