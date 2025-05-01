require("dotenv").config();
const express = require("express");
const { ethers } = require("ethers");
const fs = require("fs");

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
    const { election_name, start_time, end_time } = request.body;

    if ( !election_name || !start_time || !end_time ) {
        return response.status(400).json({ error: "Missing field required!" });
    }

    // Validate that the start and end times are in the future and correctly ordered
    const currentTime = Math.floor(Date.now() / 1000); 

    // Current time in Unix timestamp
    if (start_time <= currentTime) {
        return response.status(400).json({ error: "Start time must be in the future" });
    }
    if (end_time <= currentTime) {
        return response.status(400).json({ error: "End time must be in the future" });
    }
    if (end_time <= start_time) {
        return response.status(400).json({ error: "End time must be later than start time" });
    }

    try{
        const transaction = await contract.createElection(election_name, start_time, end_time);
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
        console.error('Error adding candidate:', error);
        response.status(500).json({ success: false, message: 'Error adding candidate', error: error.message });
    }
});

app.get("/get_candidate", async (request, response) => {
    const { election_id, candidate_id } = request.body;

    if ( !election_id || !candidate_id ) {
        response.status(400).json({ error : "Missing required field"});
    }

    const transaction = await contract.getCandidate(election_id, candidate_id);
    response.status(200).json({
        candidate_id: candidate_id,
        candidate_name: transaction.name,
        vote_count: transaction.voteCount.toString() 
    })
})

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
}); 