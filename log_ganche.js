const Web3 = require("web3");
const web3 = new Web3("http://127.0.0.1:7545"); // Ganache RPC URL

async function getTransactionDetails(txHash) {
    const tx = await web3.eth.getTransaction(txHash);
    console.log("Transaction Details:", tx);
}

const txHash = "0xea9f0926fa8d43b8b6b00361bfb9194059afa2e29c669bf3ad546282499b9416"; // Replace with the actual transaction hash
getTransactionDetails(txHash)
