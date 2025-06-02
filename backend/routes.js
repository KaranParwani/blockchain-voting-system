require("dotenv").config();
const express = require("express");
const { ethers } = require("ethers");
const fs = require("fs");
const { request } = require("http");
const path = require("path");

const app = express();
const port = 3000;

app.use(express.json());

const rpcUrl = process.env.RPC_URL;
const privateKey = process.env.PRIVATE_KEY;
const contractAddress = process.env.CONTRACT_ADDRESS;
const abi = JSON.parse(fs.readFileSync(process.env.ABI_PATH, "utf-8"))

// Initialize ethers
const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(contractAddress, abi, wallet);

// API to create election
app.post('/create_election', async (request, response) => {
    const { election_name } = request.body;

    const secondsToAddStart = 1 * 60; // Convert minutes to seconds
    const new_time = Math.floor(Date.now() / 1000) + secondsToAddStart;

    const secondsToAdd = process.env.ELECTION_TIME_HOURS * 60 * 60; // Convert hours to seconds

    end_time = new_time + secondsToAdd;

    if ( !election_name || !new_time || !end_time ) {
        return response.status(400).json({ error: "Missing field required!" });
    }

    // Validate that the start and end times are in the future and correctly ordered
    const currentTime = Math.floor(Date.now() / 1000); 

    // Current time in Unix timestamp
    if (new_time < currentTime) {
        return response.status(400).json({ error: "Start time must be in the future" });
    }
    if (end_time <= currentTime) {
        return response.status(400).json({ error: "End time must be in the future" });
    }
    if (end_time <= new_time) {
        return response.status(400).json({ error: "End time must be later than start time" });
    }
    
    try{
        const transaction = await contract.createElection(election_name, new_time, end_time);
        await transaction.wait();
        
        // Fetch the latest election ID
        const electionCount = await contract.electionCount(); // Get the BigNumber
        const electionId = electionCount - 1n; // Convert to number, then subtract

        response.status(200).json({
            message: "Election created successfully",
            transaction_hash: transaction.hash,
            created_election_id: electionId.toString()
        });

    } catch (error) {
        console.error("Error creating election:", error);
        response.status(500).json({ error: "Failed to create election" });
    }
})

app.get("/election/:id", async (request, response) => {
    const election_id = request.params.id;
    console.log(election_id);

    try{
        const election = await contract.elections(election_id);
        console.log("Election Details:", election);

        response.status(200).json({
            election_id: election.id.toString(),          // Convert BigNumber to string
            election_name: election.electionName,        // String, no conversion needed
            start_time: election.startTime.toString(), // Convert BigNumber to string
            end_time: election.endTime.toString(),     // Convert BigNumber to string
            is_active: election.isActive        // Boolean, no conversion needed
        });

    } catch (error) {
        console.error("Error fetching election:", error);
        response.status(500).json({ error: "Failed to fetch election" });
    }
 })

// Route to add a candidate
app.post('/add_candidate', async (request, response) => {
    const { election_id, candidate_name } = request.body;

    try {
        const transaction = await contract.addCandidate(election_id, candidate_name);

        // Wait for the transaction to be mined
        await transaction.wait();

        // Fetch the latest candidate count from the contract
        const election = await contract.elections(election_id);
        const candidateCountBigNumber = election.candidateCount; // Access the candidate count from the struct
        candidateId = candidateCountBigNumber - 1n;

        response.status(200).json({
            message: "Candidate added successfully",
            transaction_hash: transaction.hash,
            created_candidate_id: candidateId.toString()
        });
        
    } catch (error) {
        console.error(error.info);
        console.log('-----------------');
        response.status(500).json({ success: false, message: 'Error adding candidate', error: error.info.error.message });
    }
});

app.get("/get_candidate", async (request, response) => {
    try 
    {
        const { election_id, candidate_id } = request.query;

        console.log(election_id);
        console.log(candidate_id);

        if ( !election_id || !candidate_id ) {
            response.status(400).json({ error : "Missing required field"});
        }

        const transaction = await contract.getCandidate(election_id, candidate_id);
        response.status(200).json({
            candidate_id: candidate_id,
            candidate_name: transaction.name,
            vote_count: transaction.voteCount.toString() 
        })
    } catch (error) {
        console.error("Error fetching election:", error);
        response.status(500).json({ error: error? error.message : error.shortMessage });
    }
})

app.post('/vote', async (request, response) => {
    try {
        const { election_id, candidate_id, voterPrivatekey } = request.body;

        const unixTimestamp = Math.floor(Date.now() / 1000);
        console.log(unixTimestamp);
        
        if ( !election_id || !candidate_id || !voterPrivatekey ) {
            response.status(400).json({ error : "Missing required field"});
        }

        // Initialize provider and wallet
        const provider = new ethers.JsonRpcProvider("HTTP://127.0.0.1:7545");
        const voterWallet = new ethers.Wallet(voterPrivatekey, provider);

        // Load ABI
        const abi = JSON.parse(fs.readFileSync(path.resolve(process.env.ABI_PATH), "utf8"));

        // Initialize contract instance with voter's wallet
        const contract = new ethers.Contract(contractAddress, abi, voterWallet);

        const transaction = await contract.vote(election_id, candidate_id);
        console.log("Transaction sent:", transaction.hash);

        const receipt = await transaction.wait();

        if (receipt.status == 1) {
            response.status(200).json({
                transaction_hash: transaction.hash,
                message: "You have successfully voted",
                block_number: receipt.blockNumber
            });
        } else {
            response.status(400).json({
                transaction_hash: transaction.hash,
                message: "Something went wrong",
            });
        }

    } catch (error) {
        console.error("Error : ", error);
        response.status(500).json({ error: "Fail to vote", message: error});
    }
})

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
}); 