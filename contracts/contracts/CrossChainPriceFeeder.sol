// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CrossChainPriceFeeder {
    // Ethereum Sepolia 상수
    address constant CCIP_ROUTER_SEPOLIA = 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59; // Sepolia CCIP Router
    address constant LINK_TOKEN_SEPOLIA = 0x779877A7B0D9E8603169DdbD7836e478b4624789; // Sepolia LINK
    uint64 constant MONAD_TESTNET_SELECTOR = 2183018362218727504;

    struct TokenPriceInfo {
        address tokenAddress;
        string symbol;
        string name;
        uint256 currentPrice;
        bool isActive;
        uint256 lastUpdated;
    }

    struct CrossChainTokenPriceUpdate {
        address tokenAddress;
        uint256 newPrice;
    }

    // 상태 변수
    address public owner;
    IRouterClient public immutable router;
    IERC20 public immutable linkToken;
    
    // 토큰 가격 관리
    mapping(address => TokenPriceInfo) public tokenPrices;
    address[] public supportedTokens;
    
    // 대상 체인 및 컨트랙트 주소
    mapping(uint64 => address) public destinationContracts; // chainSelector => contract address
    mapping(uint64 => bool) public enabledChains;

    // 이벤트 정의
    event TokenPriceAdded(address indexed tokenAddress, string symbol, string name, uint256 initialPrice);
    event TokenPriceUpdated(address indexed tokenAddress, uint256 oldPrice, uint256 newPrice);
    event PriceMessageSent(uint64 indexed chainSelector, address indexed receiver, uint256 tokenCount, uint256 fees);
    event ChainConfigured(uint64 indexed chainSelector, address contractAddress, bool enabled);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    constructor() {
        owner = msg.sender;
        router = IRouterClient(CCIP_ROUTER_SEPOLIA);
        linkToken = IERC20(LINK_TOKEN_SEPOLIA);
        
        // Monad Testnet을 기본 활성화
        enabledChains[MONAD_TESTNET_SELECTOR] = true;
    }

    // 대상 체인 및 컨트랙트 설정
    function setDestinationContract(uint64 chainSelector, address contractAddress, bool enabled) external onlyOwner {
        destinationContracts[chainSelector] = contractAddress;
        enabledChains[chainSelector] = enabled;
        emit ChainConfigured(chainSelector, contractAddress, enabled);
    }

    // 토큰 추가 및 초기 가격 설정
    function addToken(
        address tokenAddress,
        string memory symbol,
        string memory name,
        uint256 initialPrice
    ) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        require(initialPrice > 0, "Invalid initial price");
        require(!tokenPrices[tokenAddress].isActive, "Token already exists");
        
        tokenPrices[tokenAddress] = TokenPriceInfo({
            tokenAddress: tokenAddress,
            symbol: symbol,
            name: name,
            currentPrice: initialPrice,
            isActive: true,
            lastUpdated: block.timestamp
        });
        
        supportedTokens.push(tokenAddress);
        emit TokenPriceAdded(tokenAddress, symbol, name, initialPrice);
    }

    // 단일 토큰 가격 업데이트
    function updateTokenPrice(address tokenAddress, uint256 newPrice) external onlyOwner {
        require(tokenPrices[tokenAddress].isActive, "Token not found");
        require(newPrice > 0, "Invalid price");
        
        uint256 oldPrice = tokenPrices[tokenAddress].currentPrice;
        tokenPrices[tokenAddress].currentPrice = newPrice;
        tokenPrices[tokenAddress].lastUpdated = block.timestamp;
        
        emit TokenPriceUpdated(tokenAddress, oldPrice, newPrice);
    }


    // 특정 체인으로 가격 정보 전송
    function sendPricesToChain(
        uint64 chainSelector,
        address[] calldata tokenAddresses
    ) public onlyOwner returns (bytes32 messageId) {
        require(enabledChains[chainSelector], "Chain not enabled");
        require(destinationContracts[chainSelector] != address(0), "Destination contract not set");
        require(tokenAddresses.length > 0, "No tokens specified");
        
        // 토큰 가격 데이터 준비
        CrossChainTokenPriceUpdate[] memory updates = new CrossChainTokenPriceUpdate[](tokenAddresses.length);
        
        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            require(tokenPrices[tokenAddresses[i]].isActive, "Token not found");
            updates[i] = CrossChainTokenPriceUpdate({
                tokenAddress: tokenAddresses[i],
                newPrice: tokenPrices[tokenAddresses[i]].currentPrice
            });
        }
        
        // CCIP 메시지 준비
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(destinationContracts[chainSelector]),
            data: abi.encode(updates),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(Client.EVMExtraArgsV1({gasLimit: 500_000})),
            feeToken: address(linkToken)
        });
        
        // 수수료 계산
        uint256 fees = router.getFee(chainSelector, message);
        require(linkToken.balanceOf(address(this)) >= fees, "Insufficient LINK balance");
        
        // LINK 토큰 승인
        linkToken.approve(address(router), fees);
        
        // 메시지 전송
        messageId = router.ccipSend(chainSelector, message);
        
        emit PriceMessageSent(chainSelector, destinationContracts[chainSelector], tokenAddresses.length, fees);
        
        return messageId;
    }

    // 여러 토큰 가격 일괄 업데이트
    function updateMultipleTokenPrices(
        address[] calldata tokenAddresses,
        uint256[] calldata newPrices
    ) public onlyOwner {
        require(tokenAddresses.length == newPrices.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            require(tokenPrices[tokenAddresses[i]].isActive, "Token not found");
            require(newPrices[i] > 0, "Invalid price");
            
            uint256 oldPrice = tokenPrices[tokenAddresses[i]].currentPrice;
            tokenPrices[tokenAddresses[i]].currentPrice = newPrices[i];
            tokenPrices[tokenAddresses[i]].lastUpdated = block.timestamp;
            
            emit TokenPriceUpdated(tokenAddresses[i], oldPrice, newPrices[i]);
        }
    }

    // 모든 활성화된 체인에 가격 정보 브로드캐스트
    function broadcastPrices(address[] calldata tokenAddresses) public onlyOwner {
        require(tokenAddresses.length > 0, "No tokens specified");
        
        // Monad Testnet에 전송
        if (enabledChains[MONAD_TESTNET_SELECTOR] && destinationContracts[MONAD_TESTNET_SELECTOR] != address(0)) {
            sendPricesToChain(MONAD_TESTNET_SELECTOR, tokenAddresses);
        }
        
        // 추가 체인들에도 전송 가능 (나중에 확장)
    }

    // 특정 토큰 가격을 업데이트하고 즉시 브로드캐스트
    function updateAndBroadcast(
        address[] calldata tokenAddresses,
        uint256[] calldata newPrices
    ) external onlyOwner {
        // 가격 업데이트
        updateMultipleTokenPrices(tokenAddresses, newPrices);
        
        // 모든 체인에 브로드캐스트
        broadcastPrices(tokenAddresses);
    }

    // 읽기 전용 함수들
    function getTokenPrice(address tokenAddress) external view returns (uint256) {
        require(tokenPrices[tokenAddress].isActive, "Token not found");
        return tokenPrices[tokenAddress].currentPrice;
    }

    function getTokenInfo(address tokenAddress) external view returns (TokenPriceInfo memory) {
        require(tokenPrices[tokenAddress].isActive, "Token not found");
        return tokenPrices[tokenAddress];
    }

    function getAllTokens() external view returns (TokenPriceInfo[] memory) {
        TokenPriceInfo[] memory tokens = new TokenPriceInfo[](supportedTokens.length);
        
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            tokens[i] = tokenPrices[supportedTokens[i]];
        }
        
        return tokens;
    }

    function getSupportedTokensCount() external view returns (uint256) {
        return supportedTokens.length;
    }

    // 수수료 예상 함수
    function estimateFees(uint64 chainSelector, address[] calldata tokenAddresses) external view returns (uint256) {
        require(enabledChains[chainSelector], "Chain not enabled");
        require(destinationContracts[chainSelector] != address(0), "Destination contract not set");
        
        // 임시 메시지 데이터 준비
        CrossChainTokenPriceUpdate[] memory updates = new CrossChainTokenPriceUpdate[](tokenAddresses.length);
        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            updates[i] = CrossChainTokenPriceUpdate({
                tokenAddress: tokenAddresses[i],
                newPrice: tokenPrices[tokenAddresses[i]].currentPrice
            });
        }
        
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(destinationContracts[chainSelector]),
            data: abi.encode(updates),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(Client.EVMExtraArgsV1({gasLimit: 500_000})),
            feeToken: address(linkToken)
        });
        
        return router.getFee(chainSelector, message);
    }

    // LINK 토큰 관리
    function withdrawLink(uint256 amount) external onlyOwner {
        require(linkToken.balanceOf(address(this)) >= amount, "Insufficient balance");
        linkToken.transfer(owner, amount);
    }

    function getLinkBalance() external view returns (uint256) {
        return linkToken.balanceOf(address(this));
    }

    // 소유권 변경
    function changeOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
    }

    // 긴급 상황 시 토큰 비활성화
    function deactivateToken(address tokenAddress) external onlyOwner {
        require(tokenPrices[tokenAddress].isActive, "Token not found");
        tokenPrices[tokenAddress].isActive = false;
        
        // 배열에서 제거
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            if (supportedTokens[i] == tokenAddress) {
                supportedTokens[i] = supportedTokens[supportedTokens.length - 1];
                supportedTokens.pop();
                break;
            }
        }
    }

}