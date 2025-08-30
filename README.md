# Monad Blitz - Chainlink Datafeed 예측 게임

Chainlink datafeed의 다음 라운드 가격 변동을 예측하는 온체인 게임입니다. 사용자들이 가격 변동 방향과 폭을 예측하여 ETH를 베팅하고, 정답을 맞춘 사용자들이 틀린 사용자들의 베팅 금액을 나누어 가져가는 시스템입니다.

## 🎯 게임 규칙

### 베팅 옵션
사용자는 6가지 가격 변동 옵션 중 하나를 선택하여 베팅할 수 있습니다:

- **강상승** (+0.02% 이상)
- **중상승** (+0.015% ~ +0.019%)  
- **약상승** (+0.01% ~ +0.014%)
- **약하락** (-0.01% ~ -0.014%)
- **중하락** (-0.015% ~ -0.019%)
- **강하락** (-0.02% 이하)

### 게임 진행
1. **라운드 시작**: Owner가 새 라운드를 생성하면 베팅 시작
2. **베팅 기간**: Chainlink datafeed가 업데이트되기 전까지 베팅 가능
3. **라운드 종료**: 가격이 0.01% 이상 변동하면 자동으로 라운드 종료
4. **정산**: 정답을 맞춘 사용자들이 베팅 비율에 따라 상금을 분배받음

## 🏗️ 아키텍처

### 스마트 컨트랙트
```
contracts/
├── RoundFactory.sol          # 라운드 생성 및 관리
├── Round.sol                 # 개별 라운드 베팅 및 정산
└── interfaces/
    └── AggregatorV3Interface.sol
```

#### RoundFactory.sol
- Chainlink datafeed와 연동하여 라운드 생성
- 한 번에 하나의 활성 라운드만 유지
- Owner만 라운드 생성/종료 가능

#### Round.sol  
- 6가지 베팅 옵션으로 ETH 베팅
- Create2 패턴으로 결정론적 주소 생성
- 완전한 온체인 정산 시스템

## 🔧 기술 스택

### 블록체인
- **네트워크**: Monad Testnet
- **RPC URL**: https://testnet-rpc.monad.xyz
- **Chain ID**: 10143 (0x279F)
- **Explorer**: https://testnet.monadexplorer.com/

### 오라클
- **Chainlink Datafeeds** (Monad Testnet)
  - BTC/USD: `0x2Cd9D7E85494F68F5aF08EF96d6FD5e8F71B4d31`
  - ETH/USD: `0x0c76859E85727683Eeba0C70Bc2e0F5781337818`
  - LINK/USD: `0x4682035965Cd2B88759193ee2660d8A0766e1391`
  - USDC/USD: `0x70BB0758a38ae43418ffcEd9A25273dd4e804D15`
  - USDT/USD: `0x14eE6bE30A91989851Dc23203E41C804D4D71441`
  - SOL/USD: `0x1c2f27C736aC97886F017AbdEedEd81C3C8Af7Be`
  - DOGE/USD: `0x7F1c8B16Ba16AA5a8e720dA162f0d9191f2e6EC5`
  - PEPE/USD: `0x5db2F4591d04CABc9E5C4016e9477A80d383D298`

## 📋 컨트랙트 인터페이스

### RoundFactory 주요 함수

```solidity
// 새 라운드 생성 (Owner만)
function createRound() external onlyOwner returns (address)

// 현재 라운드 종료 (Owner만)  
function finalizeCurrentRound() external onlyOwner

// 현재 라운드 정보 조회
function getCurrentRoundInfo() external view returns (
    address roundAddress,
    bool isActive, 
    uint80 targetRoundId,
    int256 initialPrice
)

// 새 라운드 생성 가능 여부
function canCreateNewRound() external view returns (bool)
```

### Round 주요 함수

```solidity
// ETH로 베팅
function bet(BetType _betType) external payable

// 상금 청구 (라운드 종료 후)
function claimPrize() external

// 사용자 베팅 정보 조회  
function getUserBets(address user) external view returns (uint256[6] memory)

// 청구 가능한 상금 조회
function getClaimableAmount(address user) external view returns (uint256)

// 전체 베팅 금액 조회
function getTotalBetAmounts() external view returns (uint256[6] memory)
```

## 🚀 배포 가이드

### 1. RoundFactory 배포
```solidity
constructor(
    address _priceFeed,  // Chainlink datafeed 주소
    address _owner       // 팩토리 소유자 주소
)
```

### 2. 라운드 생성 및 운영
```javascript
// 1. 새 라운드 생성
await roundFactory.createRound()

// 2. 사용자들이 베팅
await round.bet(BetType.WeakUp, { value: ethers.parseEther("0.1") })

// 3. Chainlink datafeed 업데이트 감지 후 라운드 종료
await roundFactory.finalizeCurrentRound()

// 4. 승자들이 상금 청구
await round.claimPrize()
```

## 🔐 보안 고려사항

- **단일 활성 라운드**: 한 번에 하나의 라운드만 활성화하여 혼란 방지
- **Owner 권한**: 라운드 생성/종료는 Owner만 가능
- **재진입 공격 방지**: 상금 청구 시 상태 변경 후 송금
- **중복 청구 방지**: `hasClaimed` 매핑으로 중복 청구 차단
- **가격 검증**: 베팅 시 라운드 진행 상황 확인

## 📊 게임 통계

각 라운드별로 다음 정보를 추적합니다:
- 각 베팅 옵션별 총 베팅 금액
- 개별 사용자의 베팅 현황
- 라운드 결과 및 승률
- 총 상금 풀 및 배당률

## ⚠️ 주의사항

- Monad Testnet에서만 동작합니다
- Chainlink datafeed의 업데이트 주기에 따라 라운드 길이가 달라질 수 있습니다
- 가격 변동이 0.01% 미만일 경우 라운드가 무효가 될 수 있습니다
- 모든 베팅 금액은 ETH로 이루어집니다

## 📞 지원

문제가 있거나 개선 사항이 있다면 이슈를 등록해 주세요.

---

**⚡ Powered by Monad & Chainlink**