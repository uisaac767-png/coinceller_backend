const { web3, tronWeb } = require('./blockchainService');
const Wallet = require('../models/walletModel');

const flashCrypto = async (address, amount, currency) => {
 let transaction;
 switch (currency) {
 case 'BTC':
 transaction = await web3.eth.sendTransaction({
 from: process.env.WALLET_ADDRESS,
 to: address,
 value: web3.utils.toWei(amount, 'ether'),
 });
 break;
 case 'USDT':
 const usdtContract = new web3.eth.Contract(JSON.parse(process.env.USDT_ABI), process.env.USDT_ADDRESS);
 transaction = await usdtContract.methods.transfer(address, web3.utils.toWei(amount, 'ether')).send({ from: process.env.WALLET_ADDRESS });
 break;
 case 'ETH':
 transaction = await web3.eth.sendTransaction({
 from: process.env.WALLET_ADDRESS,
 to: address,
 value: web3.utils.toWei(amount, 'ether'),
 });
 break;
 case 'TRX':
 const trxTransaction = await tronWeb.transactionBuilder.sendToken(
 process.env.TRX_WALLET_ADDRESS,
 address,
 amount,
 'TRX'
 );
 const signedTransaction = await tronWeb.trx.sign(trxTransaction);
 const receipt = await tronWeb.trx.sendRawTransaction(signedTransaction);
 transaction = receipt;
 break;
 default:
 throw new Error('Invalid currency');
 }

 // Update wallet balance
 await updateWalletBalance(address, amount, currency);

 return { message: `Successfully processed ${amount} ${currency} to ${address}`, transaction };
};

const getWalletBalance = async (address) => {
 const wallet = await Wallet.findOne({ address });
 if (!wallet) {
 throw new Error('Wallet not found');
 }
 return wallet.balance;
};

const updateWalletBalance = async (address, amount, currency) => {
 const wallet = await Wallet.findOne({ address });
 if (!wallet) {
 throw new Error('Wallet not found');
 }
 wallet.balance[currency] += amount;
 await wallet.save();
 return wallet.balance;
};

const transferCrypto = async (fromAddress, toAddress, amount, currency) => {
 const fromWallet = await Wallet.findOne({ address: fromAddress });
 const toWallet = await Wallet.findOne({ address: toAddress });

 if (!fromWallet || !toWallet) {
 throw new Error('Wallet not found');
 }

 if (fromWallet.balance[currency] < amount) {
 throw new Error('Insufficient balance');
 }

 fromWallet.balance[currency] -= amount;
 toWallet.balance[currency] += amount;
 await fromWallet.save();
 await toWallet.save();

 return { message: `Successfully transferred ${amount} ${currency} from ${fromAddress} to ${toAddress}` };
};

module.exports = { flashCrypto, getWalletBalance, updateWalletBalance, transferCrypto };
