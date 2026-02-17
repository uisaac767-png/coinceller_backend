const axios = require("axios");

const COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price";

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

module.exports = { fetchPrices };
