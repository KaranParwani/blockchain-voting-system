require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Deploying contract...");

    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider("HTTP://127.0.0.1:7545");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    // Load ABI
    const abi = JSON.parse(fs.readFileSync(path.resolve(process.env.ABI_PATH), "utf8"));

    // Load bytecode (plain string)
    const bytecode = fs.readFileSync(path.resolve(process.env.BYTE_CODE_PATH), "utf8").trim();

    const factory = new ethers.ContractFactory(abi, bytecode, wallet);

    // Deploy the contract
    const contract = await factory.deploy(); // Use factory.deploy() to deploy
    console.log("Waiting for contract deployment...");
    await contract.deploymentTransaction().wait();

    console.log("Contract deployed at:", contract.target); // contract.target holds the address
}

main().catch((error) => {
    console.error("Error:", error);
});