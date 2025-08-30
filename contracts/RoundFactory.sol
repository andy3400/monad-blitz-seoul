// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Round.sol";
import "./interfaces/AggregatorV3Interface.sol";

contract RoundFactory {
    AggregatorV3Interface public immutable priceFeed;
    address public owner;
    
    uint256 public currentRoundIndex;
    mapping(uint256 => address) public rounds;
    mapping(address => bool) public isValidRound;
    
    address public currentActiveRound;
    uint80 public lastProcessedRoundId;
    
    event RoundCreated(
        uint256 indexed roundIndex,
        address indexed roundAddress,
        uint80 targetRoundId,
        int256 initialPrice
    );
    
    event RoundFinalized(
        address indexed roundAddress,
        uint80 finalRoundId,
        int256 finalPrice
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }
    
    constructor(address _priceFeed, address _owner) {
        priceFeed = AggregatorV3Interface(_priceFeed);
        owner = _owner;
        
        (uint80 roundId,,,, ) = priceFeed.latestRoundData();
        lastProcessedRoundId = roundId;
    }
    
    function createRound() external onlyOwner returns (address) {
        require(currentActiveRound == address(0), "Active round exists");
        
        (uint80 currentRoundId, int256 currentPrice,,,) = priceFeed.latestRoundData();
        require(currentRoundId > lastProcessedRoundId, "No new round available");
        
        bytes32 salt = keccak256(abi.encodePacked(currentRoundIndex, currentRoundId, block.timestamp));
        
        Round newRound = new Round{salt: salt}(
            address(priceFeed),
            currentRoundId
        );
        
        address roundAddress = address(newRound);
        rounds[currentRoundIndex] = roundAddress;
        isValidRound[roundAddress] = true;
        currentActiveRound = roundAddress;
        
        emit RoundCreated(currentRoundIndex, roundAddress, currentRoundId, currentPrice);
        
        currentRoundIndex++;
        return roundAddress;
    }
    
    function finalizeCurrentRound() external onlyOwner {
        require(currentActiveRound != address(0), "No active round");
        
        Round round = Round(currentActiveRound);
        require(!round.isFinalized(), "Round already finalized");
        
        (uint80 currentRoundId,,,, ) = priceFeed.latestRoundData();
        require(currentRoundId > round.targetRoundId(), "Target round not completed");
        
        round.finalize();
        
        (uint80 finalRoundId, int256 finalPrice,,,) = priceFeed.latestRoundData();
        emit RoundFinalized(currentActiveRound, finalRoundId, finalPrice);
        
        lastProcessedRoundId = round.targetRoundId();
        currentActiveRound = address(0);
    }
    
    function forceCreateRound(uint80 _targetRoundId) external onlyOwner returns (address) {
        require(currentActiveRound == address(0), "Active round exists");
        require(_targetRoundId > lastProcessedRoundId, "Invalid target round ID");
        
        bytes32 salt = keccak256(abi.encodePacked(currentRoundIndex, _targetRoundId, block.timestamp));
        
        Round newRound = new Round{salt: salt}(
            address(priceFeed),
            _targetRoundId
        );
        
        address roundAddress = address(newRound);
        rounds[currentRoundIndex] = roundAddress;
        isValidRound[roundAddress] = true;
        currentActiveRound = roundAddress;
        
        (, int256 currentPrice,,,) = priceFeed.getRoundData(_targetRoundId);
        emit RoundCreated(currentRoundIndex, roundAddress, _targetRoundId, currentPrice);
        
        currentRoundIndex++;
        return roundAddress;
    }
    
    function emergencyFinalizeRound(address _roundAddress) external onlyOwner {
        require(isValidRound[_roundAddress], "Invalid round address");
        require(_roundAddress == currentActiveRound, "Not current active round");
        
        Round round = Round(_roundAddress);
        require(!round.isFinalized(), "Round already finalized");
        
        round.finalize();
        
        (uint80 finalRoundId, int256 finalPrice,,,) = priceFeed.latestRoundData();
        emit RoundFinalized(_roundAddress, finalRoundId, finalPrice);
        
        lastProcessedRoundId = round.targetRoundId();
        currentActiveRound = address(0);
    }
    
    function changeOwner(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid new owner");
        owner = _newOwner;
    }
    
    function getRoundInfo(uint256 _roundIndex) external view returns (
        address roundAddress,
        bool isFinalized,
        uint256 totalPrizePool,
        uint80 targetRoundId
    ) {
        roundAddress = rounds[_roundIndex];
        if (roundAddress != address(0)) {
            Round round = Round(roundAddress);
            isFinalized = round.isFinalized();
            totalPrizePool = round.totalPrizePool();
            targetRoundId = round.targetRoundId();
        }
    }
    
    function getCurrentRoundInfo() external view returns (
        address roundAddress,
        bool isActive,
        uint80 targetRoundId,
        int256 initialPrice
    ) {
        roundAddress = currentActiveRound;
        isActive = (roundAddress != address(0));
        
        if (isActive) {
            Round round = Round(roundAddress);
            targetRoundId = round.targetRoundId();
            initialPrice = round.initialPrice();
        }
    }
    
    function canCreateNewRound() external view returns (bool) {
        if (currentActiveRound != address(0)) {
            return false;
        }
        
        (uint80 currentRoundId,,,, ) = priceFeed.latestRoundData();
        return currentRoundId > lastProcessedRoundId;
    }
    
    function getLatestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return priceFeed.latestRoundData();
    }
}