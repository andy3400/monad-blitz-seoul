# 컨트랙트 배포 가이드

## 🚀 배포 준비

### 1. 환경 변수 설정
```bash
# .env 파일 생성
cp .env.example .env
```

`.env` 파일에서 다음 항목들을 설정하세요:

- `PRIVATE_KEY`: 배포할 계정의 개인키 (0x 접두사 없이)
- `MONAD_RPC_URL`: Monad 테스트넷 RPC URL (기본값: https://testnet-rpc.monad.xyz)
- `TOKEN_*_ADDRESS`: 지원할 토큰들의 컨트랙트 주소

### 2. 의존성 설치
```bash
npm install
```

### 3. 컨트랙트 컴파일
```bash
npm run compile
```

## 🔨 배포 실행

### Monad 테스트넷 배포
```bash
npm run deploy:monad-testnet
```

### 로컬 테스트넷 배포
```bash
# 먼저 로컬 노드 실행
npx hardhat node

# 다른 터미널에서 배포
npm run deploy:localhost
```

## 📄 배포 결과

배포가 완료되면 `deployments/` 폴더에 다음과 같은 정보가 저장됩니다:

```json
{
  "network": "monadTestnet",
  "deployer": "0x...",
  "contracts": {
    "RoundFactory": {
      "address": "0x...",
      "owner": "0x..."
    }
  },
  "supportedTokens": [
    {
      "address": "0x...",
      "symbol": "BTC",
      "name": "Bitcoin"
    }
  ],
  "timestamp": "2024-...",
  "blockNumber": 12345
}
```

## 🔍 컨트랙트 검증

배포 완료 후 출력되는 명령어로 컨트랙트를 검증할 수 있습니다:

```bash
npx hardhat verify --network monadTestnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## 📋 배포 후 설정

### 1. 토큰 추가
```javascript
// RoundFactory 컨트랙트에 토큰 추가
await factory.addSupportedToken(
    "0x토큰주소", 
    "BTC", 
    "Bitcoin"
);
```

### 2. 라운드 생성
```javascript
// 1시간(3600초) 라운드 생성
const roundAddress = await factory.createRound("Morning Battle", 3600);
```

### 3. 토큰 등록
```javascript
// 라운드에 토큰들과 초기 가격 등록
await factory.registerTokensInRound(
    roundAddress,
    ["0x토큰1주소", "0x토큰2주소"],
    [65000000000, 2500000000] // 초기 가격 (wei 단위)
);
```

## ⚠️ 주의사항

- **개인키 보안**: `.env` 파일을 절대 공개 저장소에 커밋하지 마세요
- **가스비**: 배포 시 충분한 가스비를 확보하세요
- **네트워크**: 올바른 네트워크에 배포하는지 확인하세요
- **토큰 주소**: 실제 토큰 컨트랙트 주소를 사용하세요

## 🔗 유용한 링크

- [Monad 테스트넷 익스플로러](https://testnet.monadexplorer.com/)
- [Monad 테스트넷 Faucet](https://faucet.monad.xyz/)
- [Hardhat 문서](https://hardhat.org/docs)

## 🐛 문제 해결

### 가스 부족 오류
```bash
Error: insufficient funds for gas * price + value
```
- Monad 테스트넷 토큰을 faucet에서 받으세요

### RPC 연결 오류
```bash
Error: could not detect network
```
- `.env` 파일의 `MONAD_RPC_URL` 확인
- 네트워크 연결 상태 확인

### 컴파일 오류
```bash
Error: Cannot resolve dependency
```
- `npm install` 재실행
- Node.js 버전 확인 (v16+ 권장)