# CrossChain RoundFactory 배포 가이드

## 🌐 개요

CrossChainRoundFactory는 Chainlink CCIP를 사용하여 다른 블록체인에서 전송되는 토큰 가격 정보를 수신하는 크로스체인 버전입니다.

### 🔗 아키텍처
- **Monad Testnet**: CCIP 메시지 수신자 (다른 체인의 토큰 가격 정보 수신)
- **다른 체인들**: CCIP 메시지 송신자 (토큰 가격 정보 전송)

## 📋 CCIP 설정 정보

| 항목 | Monad Testnet | 
|------|---------------|
| CCIP Router | `0x5f16e51e3Dcb255480F090157DD01bA962a53E54` |
| Chain Selector | `2183018362218727504` |
| 역할 | 메시지 수신자 |

## 🚀 배포 과정

### 1단계: 환경 설정

```bash
# .env 파일 설정
PRIVATE_KEY=your_private_key_here
MONAD_RPC_URL=https://testnet-rpc.monad.xyz

# 로컬 토큰 주소 설정 (선택사항)
TOKEN_LOCAL_BTC_ADDRESS=0x실제BTC토큰주소
TOKEN_LOCAL_ETH_ADDRESS=0x실제ETH토큰주소
```

### 2단계: Monad Testnet 배포

```bash
npm run deploy:crosschain-monad
```

**실행 내용:**
- CrossChainRoundFactory 배포 (CCIP 수신 전용)
- 선택적으로 로컬 토큰 등록 (Binance API 가격 사용)
- Ethereum Sepolia 체인을 허용된 송신 체인으로 설정

### 3단계: 크로스체인 권한 설정

배포된 컨트랙트에서 메시지 송신자 허용:

```javascript
// Monad의 CrossChainRoundFactory에서 실행
await crossChainFactory.allowlistSender(SENDER_ADDRESS, true);
await crossChainFactory.allowlistSourceChain(ETH_SEPOLIA_SELECTOR, true);
```

## 📨 CCIP 메시지 형식

### 메시지 구조

다른 체인에서 전송해야 하는 메시지 형식:

```javascript
// 단일 토큰 가격 업데이트
const message = [
    {
        tokenAddress: "0x토큰주소",
        newPrice: "1000000000000000000000" // wei 단위 (18자리)
    }
];

// 여러 토큰 가격 업데이트
const message = [
    {
        tokenAddress: "0xBTC주소",
        newPrice: "65000000000000000000000" // $65,000
    },
    {
        tokenAddress: "0xETH주소", 
        newPrice: "2500000000000000000000"  // $2,500
    }
];
```

### 메시지 인코딩

```javascript
// ABI 인코딩
const encodedMessage = ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(address,uint256)[]"], 
    [message]
);
```

## 🔧 크로스체인 기능

### 자동 처리되는 기능

1. **토큰 가격 업데이트**
   - CCIP 메시지 수신 시 `crossChainTokens` 매핑 자동 업데이트
   - 새로운 토큰 자동 추가 (처음 수신 시)

2. **이벤트 발생**
   - `CrossChainTokenPriceUpdated`: 가격 업데이트 시
   - `CrossChainMessageReceived`: 메시지 수신 시

### 수동 관리 기능

```javascript
// 크로스체인 토큰 정보 조회
const crossChainTokens = await factory.getCrossChainTokens();

// 특정 토큰 가격 조회 (로컬 + 크로스체인)
const price = await factory.getTokenPrice(tokenAddress);

// 크로스체인 토큰 메타데이터 설정
await factory.setCrossChainTokenInfo(
    tokenAddress,
    "BTC",
    "Bitcoin"
);

// 새로운 송신자/체인 허용
await factory.allowlistSender(senderAddress, true);
await factory.allowlistSourceChain(chainSelector, true);
```

## 🎯 라운드 생성

크로스체인 토큰과 로컬 토큰을 함께 사용 가능:

```javascript
// 로컬 토큰 + 크로스체인 토큰 혼합 라운드
const roundAddress = await factory.createRound(
    "Global Token Battle",
    3600, // 1시간
    [
        localBTCAddress,     // 로컬 토큰
        crossChainETHAddress, // 크로스체인 토큰  
        localSOLAddress      // 로컬 토큰
    ]
);
```

## 📊 모니터링

### 이벤트 구독

```javascript
// 크로스체인 가격 업데이트 모니터링
factory.on("CrossChainTokenPriceUpdated", (tokenAddress, oldPrice, newPrice, sourceChain) => {
    console.log(`Token ${tokenAddress} price updated from ${oldPrice} to ${newPrice} from chain ${sourceChain}`);
});

// CCIP 메시지 수신 모니터링
factory.on("CrossChainMessageReceived", (sourceChain, sender, tokenCount) => {
    console.log(`Received ${tokenCount} token updates from ${sender} on chain ${sourceChain}`);
});
```

### 상태 조회

```javascript
// 크로스체인 토큰 목록 조회
const crossChainTokens = await factory.getCrossChainTokens();
console.log("Cross-chain tokens:", crossChainTokens);

// 로컬 토큰 목록 조회
const localTokens = await factory.getSupportedTokens();
console.log("Local tokens:", localTokens);
```

## ⚠️ 주의사항

1. **메시지 송신 비용**
   - CCIP 메시지 전송 비용은 송신자가 지불
   - 수신자(Monad)는 가스 비용 없음

2. **보안 설정**
   - `allowlistedSenders`와 `allowlistedSourceChains` 설정 필수
   - 신뢰할 수 있는 송신자만 허용

3. **토큰 주소 관리**
   - 크로스체인 토큰 주소는 송신 체인의 실제 토큰 주소 사용
   - 체인별로 동일한 토큰이라도 주소가 다를 수 있음

4. **가격 정확성**
   - 송신자가 제공하는 가격 데이터의 정확성에 의존
   - Oracle 또는 신뢰할 수 있는 가격 피드 사용 권장

## 💡 사용 예시

### 1단계: Monad에서 CrossChainRoundFactory 배포
```bash
npm run deploy:crosschain-monad
```

### 2단계: 다른 체인에서 가격 정보 전송
```javascript
// Ethereum Sepolia에서 실행
const message = [{
    tokenAddress: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", // WBTC
    newPrice: ethers.parseUnits("65000", 18) // $65,000
}];

await ccipSender.sendMessage(MONAD_SELECTOR, MONAD_FACTORY_ADDRESS, message);
```

### 3단계: Monad에서 확인
```javascript
// 크로스체인 토큰 확인
const tokens = await factory.getCrossChainTokens();
const btcPrice = await factory.getTokenPrice("0x2260fac5e5542a773aa44fbcfedf7c193bc2c599");
```

### 4단계: 라운드 생성 및 베팅
```javascript
// 크로스체인 토큰으로 라운드 생성
const round = await factory.createRound("Cross-Chain Battle", 3600, [
    "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599" // 크로스체인 WBTC
]);
```

## 🔗 참고 자료

- [Chainlink CCIP 문서](https://docs.chain.link/ccip)
- [Monad 테스트넷 정보](https://docs.monad.xyz)
- [CCIP Supported Networks](https://docs.chain.link/ccip/supported-networks)