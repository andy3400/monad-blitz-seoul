// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Round.sol";

contract RoundFactory {
    struct TokenInfo {
        address tokenAddress;
        string symbol;
        string name;
        uint256 currentPrice;
        bool isActive;
    }
    
    address public owner;
    uint256 public currentRoundIndex;
    
    mapping(uint256 => address) public rounds;
    mapping(address => bool) public isValidRound;
    mapping(address => TokenInfo) public supportedTokens;
    address[] public tokenList;
    
    address public currentActiveRound;
    
    event RoundCreated(uint256 indexed roundIndex, address indexed roundAddress, string roundName, uint256 tokenCount);
    event TokenAdded(address indexed tokenAddress, string symbol, string name, uint256 initialPrice);
    event TokenRemoved(address indexed tokenAddress);
    event TokenPriceUpdated(address indexed tokenAddress, uint256 oldPrice, uint256 newPrice);
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
        string memory name,
        uint256 initialPrice
    ) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        require(initialPrice > 0, "Invalid initial price");
        require(!supportedTokens[tokenAddress].isActive, "Token already supported");
        
        supportedTokens[tokenAddress] = TokenInfo({
            tokenAddress: tokenAddress,
            symbol: symbol,
            name: name,
            currentPrice: initialPrice,
            isActive: true
        });
        
        tokenList.push(tokenAddress);
        
        emit TokenAdded(tokenAddress, symbol, name, initialPrice);
    }
    
    function updateTokenPrice(address tokenAddress, uint256 newPrice) external onlyOwner {
        require(supportedTokens[tokenAddress].isActive, "Token not supported");
        require(newPrice > 0, "Invalid price");
        
        uint256 oldPrice = supportedTokens[tokenAddress].currentPrice;
        supportedTokens[tokenAddress].currentPrice = newPrice;
        
        emit TokenPriceUpdated(tokenAddress, oldPrice, newPrice);
    }
    
    function updateTokenPrices(address[] calldata tokenAddresses, uint256[] calldata newPrices) external onlyOwner {
        require(tokenAddresses.length == newPrices.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            require(supportedTokens[tokenAddresses[i]].isActive, "Token not supported");
            require(newPrices[i] > 0, "Invalid price");
            
            uint256 oldPrice = supportedTokens[tokenAddresses[i]].currentPrice;
            supportedTokens[tokenAddresses[i]].currentPrice = newPrices[i];
            
            emit TokenPriceUpdated(tokenAddresses[i], oldPrice, newPrices[i]);
        }
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
    
    function createRound(
        string memory roundName, 
        uint256 duration,
        address[] calldata participatingTokens
    ) external onlyOwner returns (address) {
        require(currentActiveRound == address(0), "Active round exists");
        require(bytes(roundName).length > 0, "Round name required");
        require(duration > 0, "Duration must be greater than 0");
        require(participatingTokens.length > 1, "Need at least 2 tokens");
        
        // Prepare token data for Round constructor
        address[] memory tokenAddresses = new address[](participatingTokens.length);
        uint256[] memory initialPrices = new uint256[](participatingTokens.length);
        
        for (uint256 i = 0; i < participatingTokens.length; i++) {
            require(supportedTokens[participatingTokens[i]].isActive, "Token not supported");
            tokenAddresses[i] = participatingTokens[i];
            initialPrices[i] = supportedTokens[participatingTokens[i]].currentPrice;
        }
        
        bytes32 salt = keccak256(abi.encodePacked(currentRoundIndex, roundName, block.timestamp));
        
        Round newRound = new Round{salt: salt}(
            roundName, 
            duration, 
            tokenAddresses, 
            initialPrices
        );
        
        address roundAddress = address(newRound);
        rounds[currentRoundIndex] = roundAddress;
        isValidRound[roundAddress] = true;
        currentActiveRound = roundAddress;
        
        emit RoundCreated(currentRoundIndex, roundAddress, roundName, participatingTokens.length);
        
        currentRoundIndex++;
        return roundAddress;
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
        
        // Update token prices in factory
        for (uint256 i = 0; i < currentPrices.length; i++) {
            Round.TokenPrice memory priceData = currentPrices[i];
            if (supportedTokens[priceData.tokenAddress].isActive) {
                uint256 oldPrice = supportedTokens[priceData.tokenAddress].currentPrice;
                supportedTokens[priceData.tokenAddress].currentPrice = priceData.currentPrice;
                emit TokenPriceUpdated(priceData.tokenAddress, oldPrice, priceData.currentPrice);
            }
        }
        
        // Finalize round with new prices
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
        
        // Update token prices in factory
        for (uint256 i = 0; i < currentPrices.length; i++) {
            Round.TokenPrice memory priceData = currentPrices[i];
            if (supportedTokens[priceData.tokenAddress].isActive) {
                uint256 oldPrice = supportedTokens[priceData.tokenAddress].currentPrice;
                supportedTokens[priceData.tokenAddress].currentPrice = priceData.currentPrice;
                emit TokenPriceUpdated(priceData.tokenAddress, oldPrice, priceData.currentPrice);
            }
        }
        
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
    
    function getTokenPrice(address tokenAddress) external view returns (uint256) {
        require(supportedTokens[tokenAddress].isActive, "Token not supported");
        return supportedTokens[tokenAddress].currentPrice;
    }
    
    function getTokenPrices(address[] calldata tokenAddresses) external view returns (uint256[] memory) {
        uint256[] memory prices = new uint256[](tokenAddresses.length);
        
        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            require(supportedTokens[tokenAddresses[i]].isActive, "Token not supported");
            prices[i] = supportedTokens[tokenAddresses[i]].currentPrice;
        }
        
        return prices;
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