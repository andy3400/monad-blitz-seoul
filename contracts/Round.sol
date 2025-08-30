// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/AggregatorV3Interface.sol";

contract Round {
    enum BetType {
        StrongUp,    // +0.02%
        MediumUp,    // +0.015%
        WeakUp,      // +0.01%
        WeakDown,    // -0.01%
        MediumDown,  // -0.015%
        StrongDown   // -0.02%
    }
    
    struct Bet {
        BetType betType;
        uint256 amount;
        address bettor;
    }
    
    AggregatorV3Interface public immutable priceFeed;
    address public immutable factory;
    uint80 public immutable targetRoundId;
    int256 public initialPrice;
    
    mapping(BetType => uint256) public totalBetAmounts;
    mapping(address => mapping(BetType => uint256)) public userBets;
    Bet[] public bets;
    
    bool public isFinalized;
    BetType public winningBetType;
    uint256 public totalPrizePool;
    uint256 public winningPoolAmount;
    
    mapping(address => bool) public hasClaimed;
    
    event BetPlaced(address indexed bettor, BetType betType, uint256 amount);
    event RoundFinalized(BetType winningBetType, int256 finalPrice, int256 priceChange);
    event PrizeClaimed(address indexed winner, uint256 amount);
    
    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory can call");
        _;
    }
    
    modifier notFinalized() {
        require(!isFinalized, "Round already finalized");
        _;
    }
    
    modifier onlyFinalized() {
        require(isFinalized, "Round not finalized");
        _;
    }
    
    constructor(
        address _priceFeed,
        uint80 _targetRoundId
    ) {
        priceFeed = AggregatorV3Interface(_priceFeed);
        factory = msg.sender;
        targetRoundId = _targetRoundId;
        
        (, int256 price,,,) = priceFeed.getRoundData(_targetRoundId);
        initialPrice = price;
    }
    
    function bet(BetType _betType) external payable notFinalized {
        require(msg.value > 0, "Bet amount must be greater than 0");
        
        (, int256 currentPrice,,,) = priceFeed.latestRoundData();
        require(currentPrice == initialPrice, "Round has already progressed");
        
        userBets[msg.sender][_betType] += msg.value;
        totalBetAmounts[_betType] += msg.value;
        
        bets.push(Bet({
            betType: _betType,
            amount: msg.value,
            bettor: msg.sender
        }));
        
        emit BetPlaced(msg.sender, _betType, msg.value);
    }
    
    function finalize() external onlyFactory notFinalized {
        (uint80 latestRoundId, int256 finalPrice,,,) = priceFeed.latestRoundData();
        require(latestRoundId > targetRoundId, "Target round not completed yet");
        
        int256 priceChange = finalPrice - initialPrice;
        int256 changePercentage = (priceChange * 10000) / initialPrice;
        
        if (changePercentage >= 20) {
            winningBetType = BetType.StrongUp;
        } else if (changePercentage >= 15) {
            winningBetType = BetType.MediumUp;
        } else if (changePercentage >= 10) {
            winningBetType = BetType.WeakUp;
        } else if (changePercentage <= -20) {
            winningBetType = BetType.StrongDown;
        } else if (changePercentage <= -15) {
            winningBetType = BetType.MediumDown;
        } else if (changePercentage <= -10) {
            winningBetType = BetType.WeakDown;
        } else {
            revert("No valid winning condition met");
        }
        
        isFinalized = true;
        totalPrizePool = address(this).balance;
        winningPoolAmount = totalBetAmounts[winningBetType];
        
        emit RoundFinalized(winningBetType, finalPrice, priceChange);
    }
    
    function claimPrize() external onlyFinalized {
        require(!hasClaimed[msg.sender], "Prize already claimed");
        require(userBets[msg.sender][winningBetType] > 0, "No winning bet found");
        
        uint256 userWinningBet = userBets[msg.sender][winningBetType];
        uint256 prizeAmount = (userWinningBet * totalPrizePool) / winningPoolAmount;
        
        hasClaimed[msg.sender] = true;
        
        (bool success, ) = payable(msg.sender).call{value: prizeAmount}("");
        require(success, "Prize transfer failed");
        
        emit PrizeClaimed(msg.sender, prizeAmount);
    }
    
    function getBetTypeThresholds() external pure returns (int256[6] memory) {
        return [
            int256(20),   // StrongUp: +0.02%
            int256(15),   // MediumUp: +0.015%
            int256(10),   // WeakUp: +0.01%
            int256(-10),  // WeakDown: -0.01%
            int256(-15),  // MediumDown: -0.015%
            int256(-20)   // StrongDown: -0.02%
        ];
    }
    
    function getUserBets(address user) external view returns (uint256[6] memory) {
        uint256[6] memory bets;
        for (uint256 i = 0; i < 6; i++) {
            bets[i] = userBets[user][BetType(i)];
        }
        return bets;
    }
    
    function getTotalBetAmounts() external view returns (uint256[6] memory) {
        uint256[6] memory amounts;
        for (uint256 i = 0; i < 6; i++) {
            amounts[i] = totalBetAmounts[BetType(i)];
        }
        return amounts;
    }
    
    function getClaimableAmount(address user) external view onlyFinalized returns (uint256) {
        if (hasClaimed[user] || userBets[user][winningBetType] == 0) {
            return 0;
        }
        
        uint256 userWinningBet = userBets[user][winningBetType];
        return (userWinningBet * totalPrizePool) / winningPoolAmount;
    }
}