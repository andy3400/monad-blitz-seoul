// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Round.sol";

contract RoundFactory {
    struct TokenInfo {
        address tokenAddress;
        string symbol;
        string name;
        bool isActive;
    }
    
    address public owner;
    uint256 public currentRoundIndex;
    
    mapping(uint256 => address) public rounds;
    mapping(address => bool) public isValidRound;
    mapping(address => TokenInfo) public supportedTokens;
    address[] public tokenList;
    
    address public currentActiveRound;
    
    event RoundCreated(uint256 indexed roundIndex, address indexed roundAddress, string roundName);
    event TokenAdded(address indexed tokenAddress, string symbol, string name);
    event TokenRemoved(address indexed tokenAddress);
    event TokenRegisteredInRound(address indexed roundAddress, address indexed tokenAddress, uint256 initialPrice);
    event RoundFinalized(address indexed roundAddress, address indexed winningToken);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }
    
    constructor(address _owner) {
        owner = _owner;
    }
    
    function addSupportedToken(
        address tokenAddress, 
        string memory symbol, 
        string memory name
    ) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        require(!supportedTokens[tokenAddress].isActive, "Token already supported");
        
        supportedTokens[tokenAddress] = TokenInfo({
            tokenAddress: tokenAddress,
            symbol: symbol,
            name: name,
            isActive: true
        });
        
        tokenList.push(tokenAddress);
        
        emit TokenAdded(tokenAddress, symbol, name);
    }
    
    function removeSupportedToken(address tokenAddress) external onlyOwner {
        require(supportedTokens[tokenAddress].isActive, "Token not supported");
        
        supportedTokens[tokenAddress].isActive = false;
        
        for (uint256 i = 0; i < tokenList.length; i++) {
            if (tokenList[i] == tokenAddress) {
                tokenList[i] = tokenList[tokenList.length - 1];
                tokenList.pop();
                break;
            }
        }
        
        emit TokenRemoved(tokenAddress);
    }
    
    function createRound(string memory roundName, uint256 duration) external onlyOwner returns (address) {
        require(currentActiveRound == address(0), "Active round exists");
        require(bytes(roundName).length > 0, "Round name required");
        require(duration > 0, "Duration must be greater than 0");
        
        bytes32 salt = keccak256(abi.encodePacked(currentRoundIndex, roundName, block.timestamp));
        
        Round newRound = new Round{salt: salt}(roundName, duration);
        
        address roundAddress = address(newRound);
        rounds[currentRoundIndex] = roundAddress;
        isValidRound[roundAddress] = true;
        currentActiveRound = roundAddress;
        
        emit RoundCreated(currentRoundIndex, roundAddress, roundName);
        
        currentRoundIndex++;
        return roundAddress;
    }
    
    function registerTokensInRound(
        address roundAddress,
        address[] calldata tokenAddresses,
        uint256[] calldata initialPrices
    ) external onlyOwner {
        require(isValidRound[roundAddress], "Invalid round address");
        require(roundAddress == currentActiveRound, "Not current active round");
        require(tokenAddresses.length == initialPrices.length, "Arrays length mismatch");
        require(tokenAddresses.length > 1, "Need at least 2 tokens");
        
        Round round = Round(roundAddress);
        require(round.isActive() && !round.isFinalized(), "Round not active");
        
        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            require(supportedTokens[tokenAddresses[i]].isActive, "Token not supported");
            require(initialPrices[i] > 0, "Invalid initial price");
            
            round.registerToken(tokenAddresses[i], initialPrices[i]);
            
            emit TokenRegisteredInRound(roundAddress, tokenAddresses[i], initialPrices[i]);
        }
    }
    
    function finalizeRound(
        address roundAddress,
        Round.TokenPrice[] calldata currentPrices
    ) external onlyOwner {
        require(isValidRound[roundAddress], "Invalid round address");
        require(roundAddress == currentActiveRound, "Not current active round");
        
        Round round = Round(roundAddress);
        require(round.isActive() && !round.isFinalized(), "Round not active");
        
        (, , , , bool hasEnded) = round.getTimeInfo();
        require(hasEnded, "Round time not ended yet");
        
        round.finalize(currentPrices);
        
        emit RoundFinalized(roundAddress, round.winningToken());
        
        currentActiveRound = address(0);
    }
    
    function emergencyFinalizeRound(
        address roundAddress,
        Round.TokenPrice[] calldata currentPrices
    ) external onlyOwner {
        require(isValidRound[roundAddress], "Invalid round address");
        
        Round round = Round(roundAddress);
        require(round.isActive() && !round.isFinalized(), "Round not active");
        
        round.finalize(currentPrices);
        
        emit RoundFinalized(roundAddress, round.winningToken());
        
        if (currentActiveRound == roundAddress) {
            currentActiveRound = address(0);
        }
    }
    
    function changeOwner(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid new owner");
        owner = _newOwner;
    }
    
    function getSupportedTokens() external view returns (TokenInfo[] memory) {
        TokenInfo[] memory activeTokens = new TokenInfo[](tokenList.length);
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < tokenList.length; i++) {
            TokenInfo memory token = supportedTokens[tokenList[i]];
            if (token.isActive) {
                activeTokens[activeCount] = token;
                activeCount++;
            }
        }
        
        TokenInfo[] memory result = new TokenInfo[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            result[i] = activeTokens[i];
        }
        
        return result;
    }
    
    function getRoundInfo(uint256 roundIndex) external view returns (
        address roundAddress,
        string memory roundName,
        bool isActive,
        bool isFinalized,
        uint256 totalPrizePool,
        address winningToken
    ) {
        roundAddress = rounds[roundIndex];
        if (roundAddress != address(0)) {
            Round round = Round(roundAddress);
            (roundName, isActive, isFinalized, , totalPrizePool, winningToken) = round.getRoundStats();
        }
    }
    
    function getCurrentRoundInfo() external view returns (
        address roundAddress,
        string memory roundName,
        bool isActive,
        uint256 tokenCount,
        uint256 totalPrizePool
    ) {
        roundAddress = currentActiveRound;
        if (roundAddress != address(0)) {
            Round round = Round(roundAddress);
            bool isFinalized;
            address winningToken;
            (roundName, isActive, isFinalized, tokenCount, totalPrizePool, winningToken) = round.getRoundStats();
        }
    }
    
    function canCreateNewRound() external view returns (bool) {
        return currentActiveRound == address(0);
    }
}