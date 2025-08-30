const { ethers } = require("hardhat");
const readline = require('readline');
const config = require('../utils/config');
const validation = require('../utils/validation');
const display = require('../utils/display');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function execute(options) {
  console.log('🚀 라운드 생성을 시작합니다...\n');

  try {
    // 네트워크 설정 로드
    const networkConfig = await config.getNetworkConfig(options.network);
    
    // 필수 파라미터 수집
    const params = await collectParameters(options);
    
    // 입력 검증
    await validation.validateCreateParams(params);
    
    // 라운드 생성 실행
    const result = await createRound(params, networkConfig);
    
    // 결과 출력
    display.showCreateResult(result);
    
  } catch (error) {
    throw error;
  } finally {
    rl.close();
  }
}

async function collectParameters(options) {
  const params = {};
  
  // 팩토리 주소
  params.factoryAddress = options.factory || 
    await askQuestion('팩토리 컨트랙트 주소를 입력하세요: ');
  
  // 라운드 이름
  params.roundName = options.name || 
    await askQuestion('라운드 이름을 입력하세요: ');
  
  // 지속 시간
  if (options.duration) {
    params.duration = parseInt(options.duration);
  } else {
    const durationInput = await askQuestion('라운드 지속 시간을 입력하세요 (초, 기본값 3600): ');
    params.duration = parseInt(durationInput) || 3600;
  }
  
  // 참여 토큰
  if (options.tokens) {
    params.tokenSymbols = options.tokens.split(' ').filter(t => t.length > 0);
  } else {
    const tokensInput = await askQuestion('참여 토큰 심볼들을 입력하세요 (공백으로 구분, 예: BTC ETH SOL): ');
    params.tokenSymbols = tokensInput.split(' ').filter(t => t.length > 0);
  }
  
  params.network = options.network || 'monadTestnet';
  
  return params;
}

async function createRound(params, networkConfig) {
  const [deployer] = await ethers.getSigners();
  
  console.log(`📋 라운드 생성 정보:`);
  console.log(`   실행 계정: ${deployer.address}`);
  console.log(`   팩토리 주소: ${params.factoryAddress}`);
  console.log(`   라운드 이름: ${params.roundName}`);
  console.log(`   지속 시간: ${params.duration}초 (${Math.round(params.duration / 60)}분)`);
  console.log(`   참여 토큰: ${params.tokenSymbols.join(', ')}`);
  console.log(`   네트워크: ${params.network}\n`);

  const RoundFactory = await ethers.getContractFactory("RoundFactory");
  const factory = RoundFactory.attach(params.factoryAddress);

  // 지원되는 토큰 목록 조회
  console.log('📊 지원 토큰 목록 조회 중...');
  const supportedTokens = await factory.getSupportedTokens();
  
  console.log('지원 가능한 토큰들:');
  supportedTokens.forEach(token => {
    console.log(`   ${token.symbol} (${token.name}): ${token.tokenAddress}`);
  });

  // 참여 토큰 주소 찾기
  const participatingTokens = [];
  for (const symbol of params.tokenSymbols) {
    const token = supportedTokens.find(t => t.symbol === symbol);
    if (token) {
      participatingTokens.push(token.tokenAddress);
      console.log(`✓ ${symbol} 토큰 찾음: ${token.tokenAddress}`);
    } else {
      throw new Error(`${symbol} 토큰을 지원 토큰 목록에서 찾을 수 없습니다.`);
    }
  }

  // 라운드 생성 트랜잭션
  console.log('\n🎯 라운드 생성 트랜잭션 전송 중...');
  const tx = await factory.createRound(params.roundName, params.duration, participatingTokens);
  const receipt = await tx.wait();
  
  // 이벤트에서 라운드 주소 추출
  const roundCreatedEvent = receipt.logs.find(log => {
    try {
      const parsed = factory.interface.parseLog(log);
      return parsed.name === 'RoundCreated';
    } catch (e) {
      return false;
    }
  });

  if (!roundCreatedEvent) {
    throw new Error('라운드 생성 이벤트를 찾을 수 없습니다.');
  }

  const parsedEvent = factory.interface.parseLog(roundCreatedEvent);
  const roundAddress = parsedEvent.args.roundAddress;
  
  // 라운드 정보 조회
  const Round = await ethers.getContractFactory("Round");
  const round = Round.attach(roundAddress);
  const timeInfo = await round.getTimeInfo();
  
  return {
    success: true,
    roundAddress,
    transactionHash: tx.hash,
    timeInfo,
    tokenSymbols: params.tokenSymbols
  };
}

module.exports = { execute };