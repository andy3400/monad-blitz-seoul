# 🌉 CrossChain Price Bridge 사용 가이드

## 📋 개요

Ethereum Sepolia에서 Monad Testnet으로 토큰 가격 정보를 CCIP를 통해 전송하는 브릿지 시스템입니다.

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# .env 파일 생성 및 설정
cp .env.example .env

# 필수 환경 변수 설정
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
MONAD_RPC_URL=https://testnet-rpc.monad.xyz

# 배포된 컨트랙트 주소들
PRICE_FEEDER_ADDRESS=0x배포된_PriceFeeder_주소
MONAD_FACTORY_ADDRESS=0x배포된_CrossChainRoundFactory_주소
```

### 2. 컨트랙트 배포

```bash
# 1. Monad에 CrossChainRoundFactory 배포
npm run deploy:crosschain-monad

# 2. Sepolia에 CrossChainPriceFeeder 배포  
npm run deploy:pricefeeder-sepolia
```

### 3. LINK 토큰 준비

CrossChainPriceFeeder 컨트랙트에 LINK 토큰을 전송하세요:
- **Sepolia LINK**: `0x779877A7B0D9E8603169DdbD7836e478b4624789`

### 4. 크로스체인 권한 설정

```javascript
// Monad에서 실행: Sepolia PriceFeeder 주소를 허용
await crossChainFactory.allowlistSender(PRICE_FEEDER_ADDRESS, true);

// Sepolia에서 실행: Monad Factory 주소를 대상으로 설정
await priceFeeder.setDestinationContract("2183018362218727504", MONAD_FACTORY_ADDRESS, true);
```

## 🔧 브릿지 실행 방법

### 방법 1: 자동 브릿지 (권장)

모든 토큰의 최신 가격을 Binance API에서 가져와 업데이트한 후 전송:

```bash
npm run bridge:sepolia-to-monad
```

### 방법 2: 수동 업데이트

특정 토큰의 가격을 수동으로 설정하여 전송:

```bash
# 특정 토큰 업데이트
TARGET_TOKEN_ADDRESS=0x2260FAC5E5542a773Aa44fBCfEdf7C193bc2C599 NEW_PRICE=65000 npm run update-and-send

# 모든 토큰 현재 가격으로 자동 전송
AUTO_CONFIRM=true npm run update-and-send
```

## 📊 모니터링 및 확인

### Sepolia에서 (송신 확인)

```javascript
// PriceFeeder 컨트랙트 연결
const priceFeeder = await ethers.getContractAt("CrossChainPriceFeeder", PRICE_FEEDER_ADDRESS);

// LINK 잔액 확인
const linkBalance = await priceFeeder.getLinkBalance();
console.log("LINK 잔액:", ethers.formatEther(linkBalance));

// 지원 토큰 목록
const tokens = await priceFeeder.getAllTokens();
console.log("지원 토큰:", tokens);

// 수수료 추정
const fees = await priceFeeder.estimateFees("2183018362218727504", [tokenAddress]);
console.log("예상 수수료:", ethers.formatEther(fees), "LINK");
```

### Monad에서 (수신 확인)

```javascript
// CrossChainRoundFactory 연결
const factory = await ethers.getContractAt("CrossChainRoundFactory", MONAD_FACTORY_ADDRESS);

// 크로스체인 토큰 목록 확인
const crossChainTokens = await factory.getCrossChainTokens();
console.log("수신된 크로스체인 토큰:", crossChainTokens);

// 특정 토큰 가격 확인
const price = await factory.getTokenPrice(tokenAddress);
console.log("토큰 가격:", ethers.formatUnits(price, 18), "USD");

// 이벤트 모니터링
factory.on("CrossChainTokenPriceUpdated", (tokenAddress, oldPrice, newPrice, sourceChain) => {
    console.log(`토큰 ${tokenAddress} 가격 업데이트: ${oldPrice} → ${newPrice}`);
});
```

## 🔍 트러블슈팅

### 일반적인 문제들

1. **"Insufficient LINK balance" 오류**
   ```
   해결: PriceFeeder 컨트랙트에 LINK 토큰 전송
   Sepolia LINK: 0x779877A7B0D9E8603169DdbD7836e478b4624789
   ```

2. **"Sender not allowlisted" 오류**
   ```
   해결: Monad의 CrossChainRoundFactory에서 allowlistSender 실행
   await factory.allowlistSender(PRICE_FEEDER_ADDRESS, true)
   ```

3. **"Chain not enabled" 오류**
   ```
   해결: 대상 체인 설정 확인
   await priceFeeder.setDestinationContract("2183018362218727504", MONAD_FACTORY_ADDRESS, true)
   ```

4. **"Destination contract not set" 오류**
   ```
   해결: Monad Factory 주소가 올바르게 설정되었는지 확인
   ```

### 가스 및 수수료 최적화

- CCIP 수수료는 전송하는 토큰 개수에 비례
- 여러 토큰을 한 번에 전송하는 것이 개별 전송보다 효율적
- LINK 토큰 가격 변동에 따라 수수료 변동

## 📈 사용 시나리오

### 시나리오 1: 실시간 가격 피드

```bash
# cron job으로 10분마다 실행
*/10 * * * * cd /path/to/contracts && npm run bridge:sepolia-to-monad
```

### 시나리오 2: 수동 가격 조정

```bash
# Bitcoin 가격을 $70,000로 설정
TARGET_TOKEN_ADDRESS=0x2260FAC5E5542a773Aa44fBCfEdf7C193bc2C599 NEW_PRICE=70000 npm run update-and-send
```

### 시나리오 3: 라운드 시작 전 가격 동기화

```bash
# 모든 토큰 가격을 최신으로 동기화
AUTO_CONFIRM=true npm run update-and-send
```

## 💡 베스트 프랙티스

1. **배포 전 테스트**
   - Testnet에서 충분히 테스트
   - 작은 금액의 LINK로 먼저 시도

2. **모니터링 설정**
   - CCIP Explorer에서 메시지 상태 확인
   - 이벤트 로그 모니터링 설정

3. **보안 고려사항**  
   - 개인키 안전 관리
   - allowlist 설정으로 접근 제어
   - 가격 데이터 소스 신뢰성 확인

4. **비용 관리**
   - LINK 잔액 정기 모니터링
   - 수수료 예상치와 실제 비용 비교
   - 불필요한 전송 최소화

## 🔗 유용한 링크

- [Chainlink CCIP 문서](https://docs.chain.link/ccip)
- [CCIP Explorer](https://ccip.chain.link/)
- [Sepolia LINK Faucet](https://faucets.chain.link/sepolia)
- [Monad 테스트넷 문서](https://docs.monad.xyz)