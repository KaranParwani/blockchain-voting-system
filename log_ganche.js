const Web3 = require("web3");
const web3 = new Web3("http://127.0.0.1:7545"); // Ganache RPC URL

async function getTransactionDetails(txHash) {
    const tx = await web3.eth.getTransaction(txHash);
    console.log("Transaction Details:", tx);
}

const txHash = "0xfde8a30d49d85ff776feff6dd65e82f8d641b6dc5b4cb2edf2967068733c27f6"; // Replace with the actual transaction hash
getTransactionDetails(txHash)
