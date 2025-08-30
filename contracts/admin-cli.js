#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');

// CLI 버전 정보
program.version('1.0.0');

// 도움말 설정
program
  .name('admin-cli')
  .description('라운드 관리를 위한 통합 CLI 도구')
  .usage('<command> [options]');

// 명령어 등록
program
  .command('create')
  .description('새로운 라운드 생성')
  .option('-f, --factory <address>', '팩토리 컨트랙트 주소')
  .option('-n, --name <name>', '라운드 이름')
  .option('-d, --duration <seconds>', '라운드 지속 시간 (초)')
  .option('-t, --tokens <symbols>', '참여 토큰 심볼들 (공백으로 구분)')
  .option('--network <network>', '네트워크 (기본값: monadTestnet)')
  .action(async (options) => {
    try {
      const createCommand = require('./commands/create');
      await createCommand.execute(options);
    } catch (error) {
      console.error('❌ 라운드 생성 중 오류:', error.message);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('현재 라운드 상태 조회')
  .option('-f, --factory <address>', '팩토리 컨트랙트 주소')
  .option('--network <network>', '네트워크 (기본값: monadTestnet)')
  .option('--history', '과거 라운드 히스토리 포함')
  .action(async (options) => {
    try {
      const statusCommand = require('./commands/status');
      await statusCommand.execute(options);
    } catch (error) {
      console.error('❌ 상태 조회 중 오류:', error.message);
      process.exit(1);
    }
  });

program
  .command('finalize')
  .description('라운드 종료 및 정산')
  .option('-f, --factory <address>', '팩토리 컨트랙트 주소')
  .option('-r, --round <address>', '라운드 컨트랙트 주소')
  .option('-t, --tokens <symbols>', '참여 토큰 심볼들 (공백으로 구분)')
  .option('--network <network>', '네트워크 (기본값: monadTestnet)')
  .action(async (options) => {
    try {
      const finalizeCommand = require('./commands/finalize');
      await finalizeCommand.execute(options);
    } catch (error) {
      console.error('❌ 라운드 종료 중 오류:', error.message);
      process.exit(1);
    }
  });

program
  .command('tokens')
  .description('지원 토큰 관리')
  .option('-f, --factory <address>', '팩토리 컨트랙트 주소')
  .option('--network <network>', '네트워크 (기본값: monadTestnet)')
  .option('--list', '지원 토큰 목록 조회')
  .action(async (options) => {
    try {
      const tokensCommand = require('./commands/tokens');
      await tokensCommand.execute(options);
    } catch (error) {
      console.error('❌ 토큰 관리 중 오류:', error.message);
      process.exit(1);
    }
  });

// 도움말 명령어
program
  .command('help [command]')
  .description('명령어 도움말 표시')
  .action((command) => {
    if (command) {
      program.commands.find(cmd => cmd.name() === command)?.help();
    } else {
      console.log(`
🎯 라운드 관리 CLI 도구

사용법:
  npm run admin <command> [options]

주요 명령어:
  create     새로운 라운드 생성
  status     현재 라운드 상태 조회  
  finalize   라운드 종료 및 정산
  tokens     지원 토큰 관리

예시:
  npm run admin create --name "Morning Battle" --duration 3600 --tokens "BTC ETH SOL"
  npm run admin status
  npm run admin finalize --round 0x123...
  npm run admin tokens --list

자세한 도움말: npm run admin help <command>
      `);
    }
  });

// 기본 동작 (인수 없이 실행시)
if (process.argv.length <= 2) {
  program.commands.find(cmd => cmd.name() === 'help')?.action();
  process.exit(0);
}

// 명령어 파싱 및 실행
program.parse(process.argv);

// 알 수 없는 명령어 처리
program.on('command:*', () => {
  console.error('❌ 알 수 없는 명령어입니다.');
  console.log('사용 가능한 명령어를 보려면: npm run admin help');
  process.exit(1);
});