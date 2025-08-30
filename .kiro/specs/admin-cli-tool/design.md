# Design Document

## Overview

통합 CLI 도구 `admin-cli.js`를 개발하여 관리자가 라운드를 쉽게 관리할 수 있도록 합니다. 기존 스크립트들의 기능을 통합하고 더 직관적인 인터페이스를 제공합니다.

## Architecture

```
admin-cli.js (메인 CLI 엔트리포인트)
├── commands/
│   ├── create.js (라운드 생성)
│   ├── status.js (상태 조회)
│   ├── finalize.js (라운드 종료)
│   └── tokens.js (토큰 관리)
├── utils/
│   ├── config.js (네트워크 설정)
│   ├── validation.js (입력 검증)
│   └── display.js (출력 포맷팅)
└── package.json (CLI 스크립트 추가)
```

## Components and Interfaces

### CLI Interface
- 명령어 구조: `npm run admin <command> [options]`
- 지원 명령어:
  - `create` - 새 라운드 생성
  - `status` - 현재 상태 조회
  - `finalize` - 라운드 종료
  - `tokens` - 토큰 관리
  - `help` - 도움말 표시

### Command Handlers
각 명령어는 독립적인 모듈로 구현하여 유지보수성을 높입니다.

### Configuration Management
- 네트워크별 설정 자동 감지
- 환경 변수 기반 설정 오버라이드
- 기본값 제공으로 사용 편의성 향상

## Data Models

### Round Configuration
```javascript
{
  name: string,
  duration: number, // seconds
  tokens: string[], // symbol array
  network: string
}
```

### Command Result
```javascript
{
  success: boolean,
  message: string,
  data?: any,
  transactionHash?: string
}
```

## Error Handling

- 입력 검증 실패 시 명확한 오류 메시지
- 네트워크 연결 오류 시 재시도 옵션 제공
- 트랜잭션 실패 시 상세한 오류 정보 표시
- 각 단계별 진행 상황 표시

## Testing Strategy

- 각 명령어별 단위 테스트
- 네트워크 연결 모킹을 통한 통합 테스트
- 실제 테스트넷에서의 E2E 테스트
- 오류 시나리오 테스트