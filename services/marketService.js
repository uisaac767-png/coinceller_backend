const axios = require("axios");

const COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price";
const COINGECKO_MARKET_CHART =
  "https://api.coingecko.com/api/v3/coins";

const COIN_IDS = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  TRX: "tron",
  SOL: "solana",
};

const fetchPrices = async () => {
  const ids = Object.values(COIN_IDS).join(",");
  const response = await axios.get(COINGECKO_URL, {
    params: { ids, vs_currencies: "usd" },
    timeout: 10000,
  });

  const data = response.data || {};
  return {
    BTC: data.bitcoin?.usd ?? null,
    ETH: data.ethereum?.usd ?? null,
    USDT: data.tether?.usd ?? null,
    TRX: data.tron?.usd ?? null,
    SOL: data.solana?.usd ?? null,
  };
};

const toIntervalMs = (interval) => {
  const value = String(interval || "5m").toLowerCase();
  if (value === "1m") return 60 * 1000;
  if (value === "5m") return 5 * 60 * 1000;
  if (value === "15m") return 15 * 60 * 1000;
  if (value === "1h") return 60 * 60 * 1000;
  if (value === "1d") return 24 * 60 * 60 * 1000;
  return 5 * 60 * 1000;
};

const aggregateCandles = (prices, intervalMs) => {
  const buckets = new Map();
  for (const item of prices) {
    if (!Array.isArray(item) || item.length < 2) continue;
    const ts = Number(item[0]);
    const price = Number(item[1]);
    if (!Number.isFinite(ts) || !Number.isFinite(price)) continue;
    const bucket = Math.floor(ts / intervalMs) * intervalMs;
    const existing = buckets.get(bucket);
    if (!existing) {
      buckets.set(bucket, {
        t: bucket,
        o: price,
        h: price,
        l: price,
        c: price,
      });
    } else {
      existing.h = Math.max(existing.h, price);
      existing.l = Math.min(existing.l, price);
      existing.c = price;
    }
  }
  return Array.from(buckets.values()).sort((a, b) => a.t - b.t);
};

const fetchCandles = async (symbol, interval = "5m") => {
  const id = COIN_IDS[String(symbol || "").toUpperCase()];
  if (!id) throw new Error("Unsupported coin");

  const response = await axios.get(
    `${COINGECKO_MARKET_CHART}/${id}/market_chart`,
    {
      params: {
        vs_currency: "usd",
        days: 1,
        interval: "minute",
      },
      timeout: 10000,
    }
  );

  const prices = response.data?.prices || [];
  const intervalMs = toIntervalMs(interval);
  return aggregateCandles(prices, intervalMs);
};

module.exports = { fetchPrices, fetchCandles };
