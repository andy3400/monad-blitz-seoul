# Monad Blitz - 토큰 승부 예측 게임

라운드 기간 동안 등록된 토큰들 중 가장 높은 상승률을 기록할 토큰을 예측하는 온체인 게임입니다. 정답을 맞춘 사용자들이 틀린 사용자들의 베팅 금액을 비율에 따라 분배받는 시스템입니다.

## 🎯 게임 규칙

### 기본 플로우
1. **라운드 생성**: Owner가 라운드 이름과 지속시간을 설정하여 새 라운드 시작
2. **토큰 등록**: Owner가 라운드에 참여할 토큰들과 초기 가격을 등록
3. **베팅 기간**: 사용자들이 가장 많이 오를 것 같은 토큰에 ETH 베팅
4. **라운드 종료**: 설정된 시간이 지나면 Owner가 최종 가격을 제공하고 라운드 종료
5. **자동 정산**: 가장 높은 상승률을 기록한 토큰을 예측한 사용자들에게 즉시 상금 분배

### 승리 조건
- 라운드에 등록된 토큰들 중 **가장 높은 상승률**을 기록한 토큰을 예측
- 상승률 = (최종가격 - 초기가격) / 초기가격 × 100%
- 상승한 토큰이 없으면 라운드 무효

### 상금 분배
- 승리 토큰을 예측한 모든 사용자가 베팅 비율에 따라 전체 상금 풀 분배
- 라운드 종료와 동시에 자동으로 지갑에 상금 지급 (별도 청구 불필요)

## 🏗️ 아키텍처

### 스마트 컨트랙트
```
contracts/
├── RoundFactory.sol          # 라운드 및 토큰 관리
└── Round.sol                 # 개별 라운드 베팅 및 정산
```

#### RoundFactory.sol
- 지원 토큰 추가/제거 관리
- 라운드 생성 (이름, 지속시간 설정)
- 라운드에 토큰 등록 및 초기 가격 설정
- 라운드 종료 및 최종 가격 제공

#### Round.sol  
- 등록된 토큰에 ETH 베팅
- 시간 기반 라운드 관리 (startTime, endTime, duration)
- 최고 상승률 토큰 자동 계산
- 승리자들에게 즉시 상금 분배

## 🔧 기술 스택

### 블록체인
- **네트워크**: Monad Testnet
- **RPC URL**: https://testnet-rpc.monad.xyz
- **Chain ID**: 41454 (0xa1f6)
- **Explorer**: https://testnet.monadexplorer.com/

### 프론트엔드
- **React**: 사용자 인터페이스
- **TypeScript**: 타입 안전성
- **Vite**: 빌드 도구
- **TailwindCSS**: 스타일링
- **Wagmi**: Ethereum 상호작용
- **RainbowKit**: 지갑 연결

## 📋 컨트랙트 인터페이스

### RoundFactory 주요 함수

```solidity
// 지원 토큰 추가 (Owner만)
function addSupportedToken(
    address tokenAddress, 
    string symbol, 
    string name,
    uint256 initialPrice
) external

// 토큰 가격 업데이트 (Owner만)
function updateTokenPrices(
    address[] tokenAddresses,
    uint256[] newPrices
) external

// 라운드 생성 (Owner만) - 토큰과 가격 자동 설정
function createRound(
    string roundName, 
    uint256 duration,
    address[] participatingTokens
) external returns (address)

// 라운드 종료 및 정산 (Owner만) - 토큰 가격도 동시 업데이트
function finalizeRound(
    address roundAddress,
    TokenPrice[] currentPrices
) external

// 지원 토큰 목록 조회 (가격 포함)
function getSupportedTokens() external view returns (TokenInfo[] memory)

// 토큰 가격 조회
function getTokenPrice(address tokenAddress) external view returns (uint256)
function getTokenPrices(address[] tokenAddresses) external view returns (uint256[] memory)

// 현재 라운드 정보
function getCurrentRoundInfo() external view returns (
    address roundAddress,
    string roundName,
    bool isActive,
    uint256 tokenCount,
    uint256 totalPrizePool
)
```

### Round 주요 함수

```solidity
// 토큰에 베팅
function bet(address tokenAddress) external payable

// 등록된 토큰 목록 조회
function getRegisteredTokens() external view returns (address[] memory)

// 토큰 정보 조회
function getTokenInfo(address tokenAddress) external view returns (
    uint256 initialPrice,
    uint256 totalBets,
    bool isRegistered
)

// 사용자 베팅 정보
function getUserTotalBets(address user) external view returns (
    address[] memory tokens,
    uint256[] memory amounts
)

// 시간 정보 조회
function getTimeInfo() external view returns (
    uint256 startTime,
    uint256 endTime, 
    uint256 duration,
    uint256 timeLeft,
    bool hasEnded
)

// 라운드 통계
function getRoundStats() external view returns (
    string name,
    bool active,
    bool finalized,
    uint256 totalTokens,
    uint256 totalPool,
    address winner
)
```

## 🚀 사용 시나리오

### 1. 라운드 설정 (Owner)
```javascript
// 지원 토큰 추가 (초기 가격과 함께)
await factory.addSupportedToken("0x123...", "BTC", "Bitcoin", 65000000000)
await factory.addSupportedToken("0x456...", "ETH", "Ethereum", 2500000000)

// 1시간 라운드 생성 (참여 토큰들과 현재 가격을 자동으로 설정)
const roundAddress = await factory.createRound(
    "Morning Battle",
    3600, // duration in seconds
    ["0x123...", "0x456..."] // participating tokens
)
```

### 2. 사용자 베팅
```javascript
const round = new Contract(roundAddress, roundABI, signer)

// BTC에 0.1 ETH 베팅
await round.bet("0x123...", { value: ethers.parseEther("0.1") })

// ETH에 0.05 ETH 베팅  
await round.bet("0x456...", { value: ethers.parseEther("0.05") })
```

### 3. 라운드 종료 (Owner)
```javascript
// 라운드 시간이 종료된 후 최종 가격 제공
const finalPrices = [
    { tokenAddress: "0x123...", currentPrice: 66300000000 }, // BTC +2%
    { tokenAddress: "0x456...", currentPrice: 2525000000 }   // ETH +1%
]

// Factory에서 토큰 가격 업데이트 + 라운드 종료 + 승자에게 상금 자동 분배
await factory.finalizeRound(roundAddress, finalPrices)

// Factory의 토큰 가격들도 자동으로 업데이트됨
console.log(await factory.getTokenPrice("0x123...")) // 66300000000 (새로운 BTC 가격)
```

## 🔐 보안 고려사항

- **시간 기반 제어**: 라운드 시간이 종료되기 전까지만 베팅 가능
- **Owner 권한**: 라운드 생성, 토큰 등록, 종료는 Owner만 가능
- **원자적 정산**: 라운드 종료와 상금 분배가 하나의 트랜잭션에서 처리
- **재진입 공격 방지**: 상금 지급 전 상태 업데이트
- **가격 검증**: 등록된 토큰의 가격 데이터만 허용

## 📊 게임 통계

각 라운드별로 추적되는 정보:
- 참여 토큰 수 및 초기/최종 가격
- 각 토큰별 총 베팅 금액 및 베터 수
- 개별 사용자의 베팅 내역
- 승리 토큰 및 상승률
- 총 상금 풀 및 분배 결과

## ⚠️ 주의사항

- 라운드 시간이 종료된 후에는 베팅 불가
- 상승한 토큰이 없으면 라운드 무효 (베팅 금액 환불 없음)
- Owner가 제공하는 가격 데이터의 정확성에 의존
- 모든 베팅 금액은 ETH로 이루어짐
- 상금은 라운드 종료 시 자동으로 지급 (별도 청구 불필요)

## 💡 확장 가능성

- 다양한 자산 클래스 지원 (NFT, DeFi 토큰 등)
- 복합 베팅 옵션 (상위 N개 토큰 예측)
- 시간대별 라운드 (1시간, 24시간, 1주일 등)
- 토큰별 가중치 시스템
- 사용자 랭킹 및 리워드 시스템

---

**⚡ Powered by Monad Blockchain**