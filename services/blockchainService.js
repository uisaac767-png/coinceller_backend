const { Web3 } = require("web3");
const TronWeb = require("tronweb");

const blockchainService = {
  web3: new Web3(
    `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
  ),
  bscWeb3: new Web3(process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org"),

  tronWeb: new TronWeb({
    fullHost: process.env.TRON_FULL_HOST || "https://api.trongrid.io",
    privateKey: process.env.TRON_PRIVATE_KEY,
  }),
};

module.exports = blockchainService;
