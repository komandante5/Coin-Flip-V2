// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IVRFSystem} from "./IVRF.sol";

contract CoinFlip {
    // ----------------------------------------------------------------------------
    // State Variables
    // ----------------------------------------------------------------------------
    
    // VRF provider for randomness
    IVRFSystem public vrfSystem;
    
    // Contract management
    address public owner;
    address public vrfAddress;
    
    // Game parameters
    uint256 public constant HOUSE_EDGE = 1_000_000; // 1% in 8-decimal format
    uint256 public constant WIN_CHANCE = 50_000_000; // 50% in 8-decimal format  
    uint256 public constant BASE_PAYOUT = 200_000_000 - 2 * HOUSE_EDGE; // 1.98x payout (2x - 1% house edge) in 8-decimal format
    uint256 public minBet = 0.001 ether; // Minimum bet amount
    uint256 public maxRewardPercent = 10_000_000; // 10% of contract balance max payout
    
    // Game state
    uint256 public contractBalance;
    
    // ----------------------------------------------------------------------------
    // Flip Request Structure and Mapping
    // ----------------------------------------------------------------------------
    
    enum CoinSide { HEADS, TAILS }
    
    struct FlipRequest {
        address player;
        uint256 betAmount;
        CoinSide choice;
        bool processed;
    }
    
    mapping(uint256 => FlipRequest) public flipRequests;
    
    // ----------------------------------------------------------------------------
    // Events
    // ----------------------------------------------------------------------------
    
    event FlipCommitted(
        address indexed player,
        uint256 betAmount,
        CoinSide choice,
        uint256 indexed requestId
    );
    
    event FlipRevealed(
        address indexed player,
        uint256 betAmount,
        CoinSide choice,
        CoinSide result,
        bool didWin,
        uint256 payout,
        uint256 indexed requestId
    );
    
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    event VRFChanged(address oldVRF, address newVRF);
    event MinBetUpdated(uint256 oldMinBet, uint256 newMinBet);
    event MaxRewardPercentUpdated(uint256 oldPercent, uint256 newPercent);
    event FundsDeposited(address indexed depositor, uint256 amount);
    event FundsWithdrawn(address indexed recipient, uint256 amount);
    
    // ----------------------------------------------------------------------------
    // Constructor
    // ----------------------------------------------------------------------------
    
    constructor(address _owner, address _vrf) {
        require(_owner != address(0), "Invalid owner address");
        require(_vrf != address(0), "Invalid VRF provider address");
        
        owner = _owner;
        vrfAddress = _vrf;
        vrfSystem = IVRFSystem(_vrf);
        contractBalance = 0;
    }
    
    // ----------------------------------------------------------------------------
    // Modifiers
    // ----------------------------------------------------------------------------
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyVRF() {
        require(msg.sender == vrfAddress, "Not VRF provider");
        _;
    }
    
    // ----------------------------------------------------------------------------
    // Owner Functions
    // ----------------------------------------------------------------------------
    
    /**
     * @notice Transfer ownership to a new address
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid new owner");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
    
    /**
     * @notice Set VRF provider address
     */
    function setVRFAddress(address _newVRF) external onlyOwner {
        require(_newVRF != address(0), "Invalid new VRF provider");
        emit VRFChanged(vrfAddress, _newVRF);
        vrfAddress = _newVRF;
        vrfSystem = IVRFSystem(_newVRF);
    }
    
    /**
     * @notice Set minimum bet amount
     */
    function setMinBet(uint256 _minBet) external onlyOwner {
        emit MinBetUpdated(minBet, _minBet);
        minBet = _minBet;
    }
    
    /**
     * @notice Set maximum reward percentage
     */
    function setMaxRewardPercent(uint256 _percentIn8decimals) external onlyOwner {
        require(_percentIn8decimals > 0 && _percentIn8decimals <= 50_000_000, "Invalid reward percent"); // Max 50%
        emit MaxRewardPercentUpdated(maxRewardPercent, _percentIn8decimals);
        maxRewardPercent = _percentIn8decimals;
    }
    
    /**
     * @notice Deposit ETH to fund the contract
     */
    function depositFunds() external payable onlyOwner {
        contractBalance += msg.value;
        emit FundsDeposited(msg.sender, msg.value);
    }
    
    /**
     * @notice Withdraw ETH from the contract
     */
    function withdrawFunds(uint256 _amount) external onlyOwner {
        require(_amount <= contractBalance, "Insufficient contract balance");
        contractBalance -= _amount;
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "ETH transfer failed");
        emit FundsWithdrawn(msg.sender, _amount);
    }
    
    /**
     * @notice Emergency function to withdraw all ETH
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        contractBalance = 0;
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "ETH transfer failed");
        emit FundsWithdrawn(msg.sender, balance);
    }
    
    // ----------------------------------------------------------------------------
    // Game Functions
    // ----------------------------------------------------------------------------
    
    /**
     * @notice Flip a coin - choose heads or tails
     * @param _choice Player's choice: 0 for HEADS, 1 for TAILS
     */
    function flipCoin(CoinSide _choice) external payable {
        require(msg.value >= minBet, "Bet amount below minimum");
        
        // Calculate potential payout
        uint256 potentialPayout = (msg.value * BASE_PAYOUT) / 1e8;
        uint256 maxAllowedPayout = (contractBalance * maxRewardPercent) / 1e8;
        require(potentialPayout <= maxAllowedPayout, "Bet exceeds max reward limit");
        
        // Add bet to contract balance
        contractBalance += msg.value;
        
        // Request random number from VRF
        uint256 requestId = vrfSystem.requestRandomNumberWithTraceId(0);
        
        // Store flip request
        flipRequests[requestId] = FlipRequest({
            player: msg.sender,
            betAmount: msg.value,
            choice: _choice,
            processed: false
        });
        
        emit FlipCommitted(msg.sender, msg.value, _choice, requestId);
    }
    
    /**
     * @notice Called by VRF system with random number to resolve flip
     */
    function randomNumberCallback(uint256 requestId, uint256 randomNumber) external onlyVRF {
        FlipRequest storage flipReq = flipRequests[requestId];
        require(!flipReq.processed, "Flip already processed");
        flipReq.processed = true;
        
        // Determine coin flip result (0 = HEADS, 1 = TAILS)
        uint256 flipResult = uint256(keccak256(abi.encodePacked(requestId, randomNumber))) % 2;
        CoinSide result = CoinSide(flipResult);
        
        bool didWin = (result == flipReq.choice);
        uint256 payout = 0;
        
        if (didWin) {
            // Calculate payout (bet amount * 1.98)
            payout = (flipReq.betAmount * BASE_PAYOUT) / 1e8;
            
            // Ensure we have enough balance
            require(payout <= contractBalance, "Insufficient contract balance");
            
            // Send payout to player
            contractBalance -= payout;
            (bool success, ) = flipReq.player.call{value: payout}("");
            require(success, "ETH transfer failed");
        }
        // If player loses, their bet stays in the contract (already added in flipCoin)
        
        emit FlipRevealed(
            flipReq.player,
            flipReq.betAmount,
            flipReq.choice,
            result,
            didWin,
            payout,
            requestId
        );
    }
    
    // ----------------------------------------------------------------------------
    // View Functions
    // ----------------------------------------------------------------------------
    
    /**
     * @notice Check if a bet amount is valid
     */
    function canPlaceBet(uint256 _betAmount) public view returns (bool canBet, string memory reason) {
        if (_betAmount < minBet) {
            return (false, "Bet amount below minimum");
        }
        
        uint256 potentialPayout = (_betAmount * BASE_PAYOUT) / 1e8;
        uint256 maxAllowedPayout = (contractBalance * maxRewardPercent) / 1e8;
        
        if (potentialPayout > maxAllowedPayout) {
            return (false, "Bet exceeds max reward limit");
        }
        
        return (true, "");
    }
    
    /**
     * @notice Get bet limits
     */
    function getBetLimits() public view returns (uint256 minBetAmount, uint256 maxBetAmount) {
        minBetAmount = minBet;
        
        // Calculate max bet based on max allowed payout
        uint256 maxAllowedPayout = (contractBalance * maxRewardPercent) / 1e8;
        maxBetAmount = (maxAllowedPayout * 1e8) / BASE_PAYOUT;
        
        if (maxBetAmount < minBetAmount) {
            maxBetAmount = 0; // Indicates insufficient contract balance
        }
    }
    
    /**
     * @notice Calculate payout for a bet amount
     */
    function calculatePayout(uint256 _betAmount) public pure returns (uint256 potentialPayout) {
        return (_betAmount * BASE_PAYOUT) / 1e8;
    }
    
    /**
     * @notice Get game statistics
     */
    function getGameStats() public view returns (
        uint256 houseEdge,
        uint256 winChance,
        uint256 payoutMultiplier,
        uint256 currentBalance,
        uint256 minBetAmount,
        uint256 maxBetAmount
    ) {
        houseEdge = HOUSE_EDGE;
        winChance = WIN_CHANCE;
        payoutMultiplier = BASE_PAYOUT;
        currentBalance = contractBalance;
        (minBetAmount, maxBetAmount) = getBetLimits();
    }
    
    // ----------------------------------------------------------------------------
    // Utility Functions
    // ----------------------------------------------------------------------------
    
    /**
     * @notice Get contract's actual ETH balance
     */
    function getActualBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Convert CoinSide enum to string
     */
    function coinSideToString(CoinSide _side) public pure returns (string memory) {
        if (_side == CoinSide.HEADS) {
            return "HEADS";
        } else {
            return "TAILS";
        }
    }
    
    // Allow contract to receive ETH
    receive() external payable {
        // Only allow owner to send ETH directly (for funding)
        require(msg.sender == owner, "Only owner can send ETH directly");
        contractBalance += msg.value;
        emit FundsDeposited(msg.sender, msg.value);
    }
}