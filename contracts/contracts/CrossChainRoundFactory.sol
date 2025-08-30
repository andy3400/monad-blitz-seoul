// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Round.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

contract CrossChainRoundFactory is CCIPReceiver {
    // 상수 정의 - Monad 테스트넷 기준
    address constant CCIP_ROUTER = 0x5f16e51e3Dcb255480F090157DD01bA962a53E54;
    uint64 constant ETH_SEPOLIA_SELECTOR = 16015286601757825753;

    struct TokenInfo {
        address tokenAddress;
        string symbol;
        string name;
        uint256 currentPrice;
        bool isActive;
    }

    struct CrossChainTokenPriceUpdate {
        address tokenAddress;
        uint256 newPrice;
    }

    // 상태 변수
    address public owner;
    uint256 public currentRoundIndex;
    
    // 로컬 토큰 관리 (기존 RoundFactory와 동일)
    mapping(uint256 => address) public rounds;
    mapping(address => bool) public isValidRound;
    mapping(address => TokenInfo) public supportedTokens;
    address[] public tokenList;
    address public currentActiveRound;
    
    // 크로스체인 토큰 관리 (새로 추가)
    mapping(address => TokenInfo) public crossChainTokens;
    address[] public crossChainTokenList;
    
    // CCIP 관련 상태 변수
    mapping(uint64 => bool) public allowlistedSourceChains;
    mapping(address => bool) public allowlistedSenders;

    // 이벤트 정의
    event RoundCreated(uint256 indexed roundIndex, address indexed roundAddress, string roundName, uint256 tokenCount);
    event TokenAdded(address indexed tokenAddress, string symbol, string name, uint256 initialPrice);
    event TokenRemoved(address indexed tokenAddress);
    event TokenPriceUpdated(address indexed tokenAddress, uint256 oldPrice, uint256 newPrice);
    event RoundFinalized(address indexed roundAddress, address indexed winningToken);
    
    // 크로스체인 관련 이벤트
    event CrossChainTokenPriceUpdated(address indexed tokenAddress, uint256 oldPrice, uint256 newPrice, uint64 sourceChain);
    event CrossChainMessageReceived(uint64 indexed sourceChainSelector, address indexed sender, uint256 tokenCount);

    // 접근 제어 수정자
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    modifier onlyAllowlistedSourceChain(uint64 _sourceChainSelector) {
        require(allowlistedSourceChains[_sourceChainSelector], "Source chain not allowlisted");
        _;
    }

    modifier onlyAllowlistedSender(address _sender) {
        require(allowlistedSenders[_sender], "Sender not allowlisted");
        _;
    }

    constructor(address _owner) CCIPReceiver(CCIP_ROUTER) {
        owner = _owner;
        
        // Ethereum Sepolia에서 오는 메시지 허용
        allowlistedSourceChains[ETH_SEPOLIA_SELECTOR] = true;
        
        // 오너를 허용된 송신자로 설정
        allowlistedSenders[_owner] = true;
    }

    // CCIP 관련 관리 함수들
    function allowlistSourceChain(uint64 _sourceChainSelector, bool allowed) external onlyOwner {
        allowlistedSourceChains[_sourceChainSelector] = allowed;
    }

    function allowlistSender(address _sender, bool allowed) external onlyOwner {
        allowlistedSenders[_sender] = allowed;
    }

    // CCIP 메시지 수신 함수 (핵심 기능)
    function _ccipReceive(Client.Any2EVMMessage memory any2EvmMessage)
        internal
        override
        onlyAllowlistedSourceChain(any2EvmMessage.sourceChainSelector)
    {
        address sender = abi.decode(any2EvmMessage.sender, (address));
        require(allowlistedSenders[sender], "Sender not allowlisted");
        
        // 메시지 데이터 디코딩: 토큰 가격 업데이트 배열
        CrossChainTokenPriceUpdate[] memory updates = abi.decode(
            any2EvmMessage.data, 
            (CrossChainTokenPriceUpdate[])
        );
        
        // 각 토큰 가격 업데이트 처리
        for (uint256 i = 0; i < updates.length; i++) {
            _updateCrossChainTokenPrice(
                updates[i].tokenAddress, 
                updates[i].newPrice, 
                any2EvmMessage.sourceChainSelector
            );
        }
        
        emit CrossChainMessageReceived(any2EvmMessage.sourceChainSelector, sender, updates.length);
    }

    // 크로스체인 토큰 가격 업데이트 내부 함수
    function _updateCrossChainTokenPrice(address tokenAddress, uint256 newPrice, uint64 sourceChain) internal {
        require(newPrice > 0, "Invalid price");
        
        uint256 oldPrice = crossChainTokens[tokenAddress].currentPrice;
        
        // 새로운 토큰인 경우 리스트에 추가
        if (!crossChainTokens[tokenAddress].isActive) {
            crossChainTokens[tokenAddress] = TokenInfo({
                tokenAddress: tokenAddress,
                symbol: "UNKNOWN", // 심볼은 별도로 설정 가능
                name: "Cross-Chain Token",
                currentPrice: newPrice,
                isActive: true
            });
            crossChainTokenList.push(tokenAddress);
        } else {
            // 기존 토큰 가격 업데이트
            crossChainTokens[tokenAddress].currentPrice = newPrice;
        }
        
        emit CrossChainTokenPriceUpdated(tokenAddress, oldPrice, newPrice, sourceChain);
    }

    // 크로스체인 토큰 정보 수동 설정 (심볼, 이름 등)
    function setCrossChainTokenInfo(
        address tokenAddress, 
        string memory symbol, 
        string memory name
    ) external onlyOwner {
        require(crossChainTokens[tokenAddress].isActive, "Token not found");
        crossChainTokens[tokenAddress].symbol = symbol;
        crossChainTokens[tokenAddress].name = name;
    }

    // 기존 RoundFactory 기능들 (로컬 토큰 관리)
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

    function createRound(
        string memory roundName, 
        uint256 duration,
        address[] calldata participatingTokens
    ) external onlyOwner returns (address) {
        require(currentActiveRound == address(0), "Active round exists");
        require(bytes(roundName).length > 0, "Round name required");
        require(duration > 0, "Duration must be greater than 0");
        require(participatingTokens.length > 1, "Need at least 2 tokens");
        
        // 토큰 데이터 준비 (로컬 또는 크로스체인 토큰 모두 사용 가능)
        address[] memory tokenAddresses = new address[](participatingTokens.length);
        uint256[] memory initialPrices = new uint256[](participatingTokens.length);
        
        for (uint256 i = 0; i < participatingTokens.length; i++) {
            tokenAddresses[i] = participatingTokens[i];
            
            // 로컬 토큰인지 크로스체인 토큰인지 확인
            if (supportedTokens[participatingTokens[i]].isActive) {
                initialPrices[i] = supportedTokens[participatingTokens[i]].currentPrice;
            } else if (crossChainTokens[participatingTokens[i]].isActive) {
                initialPrices[i] = crossChainTokens[participatingTokens[i]].currentPrice;
            } else {
                revert("Token not supported");
            }
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
        
        // (, , , , bool hasEnded) = round.getTimeInfo();
        // require(hasEnded, "Round time not ended yet");
        
        // 라운드 종료
        round.finalize(currentPrices);
        
        emit RoundFinalized(roundAddress, round.winningToken());
        
        currentActiveRound = address(0);
    }

    // 읽기 전용 함수들
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

    function getCrossChainTokens() external view returns (TokenInfo[] memory) {
        TokenInfo[] memory activeTokens = new TokenInfo[](crossChainTokenList.length);
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < crossChainTokenList.length; i++) {
            TokenInfo memory token = crossChainTokens[crossChainTokenList[i]];
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
        if (supportedTokens[tokenAddress].isActive) {
            return supportedTokens[tokenAddress].currentPrice;
        } else if (crossChainTokens[tokenAddress].isActive) {
            return crossChainTokens[tokenAddress].currentPrice;
        } else {
            revert("Token not supported");
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

    // 소유권 변경
    function changeOwner(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid new owner");
        owner = _newOwner;
        allowlistedSenders[_newOwner] = true;
    }
}