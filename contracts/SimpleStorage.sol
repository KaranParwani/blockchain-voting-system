// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "hardhat/console.sol";

contract VotingElection {

    // Admin's wallet address (Person deploying the contract)
    address public admin;

    struct Election {
        uint id;                       // Unique ID for election
        string electionName;           // Name of the election
        uint startTime;                // Election start time
        uint endTime;                  // Election end time
        bool isActive;                 // Whether the election is active
        uint candidateCount;           // Number of candidates
        bool winnerDeclared;           // Winner Declared True or False
        mapping(uint => Candidate) candidates;  // Candidates in the election
        mapping(address => bool) hasVoted;      // Track if an address has voted
    }

    struct Candidate {
        uint id;                       // Candidate ID
        string candidateName;          // Name of the candidate
        uint voteCount;                // Number of votes the candidate has
    }

    uint public electionCount;         // Total number of elections
    mapping(uint => Election) public elections; // All elections

    // Events for transparency
    event ElectionCreated(uint id, string name, uint startTime, uint endTime);
    event CandidateAdded(uint electionId, uint candidateId, string name);
    event Voted(uint electionId, uint candidateId, address voter);
    event WinnerDeclared(uint electionId, string winnerName);

    // Contract constructor to set the admin
    constructor() {
        admin = msg.sender;
    }

    // Modifier to restrict access to admin
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    // Modifier to check if an election exists
    modifier electionExists(uint _electionId) {
        require(_electionId < electionCount, "Election ID does not exist");
        _;
    }

    // Create a new election (admin only)
    function createElection(string memory _electionName, uint _startTime, uint _endTime) public onlyAdmin {
        require(_startTime > block.timestamp, "Start time must be in the future");
        require(_startTime < _endTime, "Start time should be before end time");

        Election storage e = elections[electionCount];
        e.electionName = _electionName;
        e.startTime = _startTime;
        e.endTime = _endTime;
        e.isActive = true;
        e.id = electionCount;

        emit ElectionCreated(electionCount, _electionName, _startTime, _endTime);
        electionCount++;
    }

    // Add a candidate to an election (admin only)
    function addCandidate(uint _electionId, string memory _name) public onlyAdmin electionExists(_electionId) returns (uint) {
        Election storage e = elections[_electionId];

        uint candidateId = e.candidateCount;
        e.candidates[candidateId] = Candidate(candidateId, _name, 0);
        e.candidateCount++;

        emit CandidateAdded(_electionId, candidateId, _name);
        
        return candidateId; // RETURN THE NEW CANDIDATE ID THAT WAS CREATED
    }

    // Vote for a candidate in an election
    function vote(uint _electionId, uint _candidateId) public electionExists(_electionId) {

        Election storage e = elections[_electionId];
        require(!e.hasVoted[msg.sender], "You have already voted");
        require(_candidateId < e.candidateCount, "Invalid candidate ID");

        Candidate storage c = e.candidates[_candidateId];
        c.voteCount++;
        e.hasVoted[msg.sender] = true;

        emit Voted(_electionId, _candidateId, msg.sender);
    }

    // Check if an election is active
    function isElectionActive(uint _electionId) public view returns (bool) {
        Election storage e = elections[_electionId];
        return block.timestamp >= e.startTime && block.timestamp <= e.endTime && e.isActive;
    }

    // Get candidate details
    function getCandidate(uint _electionId, uint _candidateId) public view electionExists(_electionId) returns (string memory name, uint voteCount) {
        Election storage e = elections[_electionId];
        require(_candidateId < e.candidateCount, "Invalid candidate ID");
        Candidate storage c = e.candidates[_candidateId];
        return (c.candidateName, c.voteCount);
    } 

    function declareWinner(uint _electionId) public electionExists(_electionId) {
        Election storage e = elections[_electionId];
        console.log("Election Name:", e.electionName);
        console.log("End Time:", e.endTime);
        console.log("Current Time:", block.timestamp);
        console.log("Winner Declared:", e.winnerDeclared);

        require(block.timestamp > e.endTime, "Election is still active");
        require(!e.winnerDeclared, "Winner already declared");

        uint winningVoteCount = 0;
        uint winnerId;
        for (uint i = 0; i < e.candidateCount; i++) {
            console.log("Candidate ID:", i);
            console.log("Vote Count:", e.candidates[i].voteCount);
            if (e.candidates[i].voteCount > winningVoteCount) {
                winningVoteCount = e.candidates[i].voteCount;
                winnerId = i;
                console.log("New Winner ID:", winnerId);
                console.log("Winning Vote Count:", winningVoteCount);
            }
        }

        e.winnerDeclared = true;
        console.log("Final Winner ID:", winnerId);
        emit WinnerDeclared(_electionId, e.candidates[winnerId].candidateName);
    }

}
           