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

app.post("/add_candidate", async (request, response) => {
    const { election_id, candidate_name } = request.body;

    if (!election_id || !candidate_name) {
        response.status(400).json({
            error: "Please provide the candidate name and election ID"
        })
    }

    try {

        const transaction = await contract.addCandidate(election_id, candidate_name);
        const receipt = await transaction.wait(); // Wait for transaction to be mined

        // Parse the event to get the candidateId
        const event = receipt.events.find(event => event.event === "CandidateAdded");
        if (event) {
            const { electionId, candidateId, name } = event.args;
            return response.status(200).json({
                message: "Added Candidate Successfully",
                transaction_hash: transaction.hash,
                election_id: electionId.toString(),
                candidate_id: candidateId.toString(),
                candidate_name: name,
            });

        } else {
            console.error("CandidateAdded event not found in receipt.");
            return response.status(500).json({ error: "CandidateAdded event not emitted" });
        }

    } catch (error) {
        // const add_candidate_error = error['info']['error']['message'];
        console.error("Error fetching election:", error);
        // response.status(500).json({ error: add_candidate_error });
    }

 })

app.get("get_candidate", async (response, request) => {

})

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
}); 