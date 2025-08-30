// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Round {
    struct TokenPrice {
        address tokenAddress;
        uint256 currentPrice;
    }
    
    struct Bet {
        address tokenAddress;
        uint256 amount;
        address bettor;
    }
    
    address public immutable factory;
    string public roundName;
    uint256 public immutable startTime;
    uint256 public immutable duration;
    uint256 public immutable endTime;
    
    mapping(address => uint256) public initialPrices;
    mapping(address => uint256) public tokenTotalBets;
    mapping(address => mapping(address => uint256)) public userBets;
    
    address[] public registeredTokens;
    Bet[] public bets;
    
    bool public isActive;
    bool public isFinalized;
    address public winningToken;
    uint256 public totalPrizePool;
    uint256 public winningPoolAmount;
    
    event TokenRegistered(address indexed tokenAddress, uint256 initialPrice);
    event BetPlaced(address indexed bettor, address indexed tokenAddress, uint256 amount);
    event RoundFinalized(address indexed winningToken, uint256 winningPercentage);
    event PrizeDistributed(address indexed winner, uint256 amount);
    
    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory can call");
        _;
    }
    
    modifier onlyActive() {
        require(isActive && !isFinalized && block.timestamp <= endTime, "Round not active");
        _;
    }
    
    modifier onlyFinalized() {
        require(isFinalized, "Round not finalized");
        _;
    }
    
    constructor(string memory _roundName, uint256 _duration) {
        factory = msg.sender;
        roundName = _roundName;
        startTime = block.timestamp;
        duration = _duration;
        endTime = block.timestamp + _duration;
        isActive = true;
    }
    
    function registerToken(address tokenAddress, uint256 initialPrice) external onlyFactory onlyActive {
        require(initialPrice > 0, "Initial price must be greater than 0");
        require(initialPrices[tokenAddress] == 0, "Token already registered");
        
        initialPrices[tokenAddress] = initialPrice;
        registeredTokens.push(tokenAddress);
        
        emit TokenRegistered(tokenAddress, initialPrice);
    }
    
    function bet(address tokenAddress) external payable onlyActive {
        require(msg.value > 0, "Bet amount must be greater than 0");
        require(initialPrices[tokenAddress] > 0, "Token not registered");
        
        userBets[msg.sender][tokenAddress] += msg.value;
        tokenTotalBets[tokenAddress] += msg.value;
        
        bets.push(Bet({
            tokenAddress: tokenAddress,
            amount: msg.value,
            bettor: msg.sender
        }));
        
        emit BetPlaced(msg.sender, tokenAddress, msg.value);
    }
    
    function finalize(TokenPrice[] calldata currentPrices) external onlyFactory {
        require(isActive && !isFinalized, "Round not active or already finalized");
        require(block.timestamp >= endTime, "Round not ended yet");
        require(currentPrices.length == registeredTokens.length, "Invalid price data length");
        require(registeredTokens.length > 0, "No tokens registered");
        
        uint256 maxPercentageIncrease = 0;
        address bestToken = address(0);
        
        for (uint256 i = 0; i < currentPrices.length; i++) {
            TokenPrice memory priceData = currentPrices[i];
            require(initialPrices[priceData.tokenAddress] > 0, "Token not registered");
            
            uint256 initialPrice = initialPrices[priceData.tokenAddress];
            if (priceData.currentPrice > initialPrice) {
                uint256 percentageIncrease = ((priceData.currentPrice - initialPrice) * 10000) / initialPrice;
                if (percentageIncrease > maxPercentageIncrease) {
                    maxPercentageIncrease = percentageIncrease;
                    bestToken = priceData.tokenAddress;
                }
            }
        }
        
        require(bestToken != address(0), "No token had positive performance");
        
        winningToken = bestToken;
        isFinalized = true;
        totalPrizePool = address(this).balance;
        winningPoolAmount = tokenTotalBets[winningToken];
        
        _distributePrizes();
        
        emit RoundFinalized(winningToken, maxPercentageIncrease);
    }
    
    function _distributePrizes() internal {
        if (winningPoolAmount == 0) return;
        
        for (uint256 i = 0; i < bets.length; i++) {
            Bet memory currentBet = bets[i];
            if (currentBet.tokenAddress == winningToken) {
                uint256 userWinningBet = userBets[currentBet.bettor][winningToken];
                if (userWinningBet > 0) {
                    uint256 prizeAmount = (userWinningBet * totalPrizePool) / winningPoolAmount;
                    userBets[currentBet.bettor][winningToken] = 0;
                    
                    (bool success, ) = payable(currentBet.bettor).call{value: prizeAmount}("");
                    if (success) {
                        emit PrizeDistributed(currentBet.bettor, prizeAmount);
                    }
                }
            }
        }
    }
    
    function getRegisteredTokens() external view returns (address[] memory) {
        return registeredTokens;
    }
    
    function getTokenInfo(address tokenAddress) external view returns (
        uint256 initialPrice,
        uint256 totalBets,
        bool isRegistered
    ) {
        initialPrice = initialPrices[tokenAddress];
        totalBets = tokenTotalBets[tokenAddress];
        isRegistered = initialPrice > 0;
    }
    
    function getUserBetForToken(address user, address tokenAddress) external view returns (uint256) {
        return userBets[user][tokenAddress];
    }
    
    function getAllTokenTotalBets() external view returns (address[] memory tokens, uint256[] memory amounts) {
        tokens = new address[](registeredTokens.length);
        amounts = new uint256[](registeredTokens.length);
        
        for (uint256 i = 0; i < registeredTokens.length; i++) {
            tokens[i] = registeredTokens[i];
            amounts[i] = tokenTotalBets[registeredTokens[i]];
        }
    }
    
    function getUserTotalBets(address user) external view returns (address[] memory tokens, uint256[] memory amounts) {
        tokens = new address[](registeredTokens.length);
        amounts = new uint256[](registeredTokens.length);
        
        for (uint256 i = 0; i < registeredTokens.length; i++) {
            tokens[i] = registeredTokens[i];
            amounts[i] = userBets[user][registeredTokens[i]];
        }
    }
    
    function getRoundStats() external view returns (
        string memory name,
        bool active,
        bool finalized,
        uint256 totalTokens,
        uint256 totalPool,
        address winner
    ) {
        name = roundName;
        active = isActive && block.timestamp <= endTime;
        finalized = isFinalized;
        totalTokens = registeredTokens.length;
        totalPool = address(this).balance;
        winner = winningToken;
    }
    
    function getTimeInfo() external view returns (
        uint256 _startTime,
        uint256 _endTime,
        uint256 _duration,
        uint256 _timeLeft,
        bool _hasEnded
    ) {
        _startTime = startTime;
        _endTime = endTime;
        _duration = duration;
        _timeLeft = block.timestamp >= endTime ? 0 : endTime - block.timestamp;
        _hasEnded = block.timestamp >= endTime;
    }
}