const { ethers } = require("hardhat");
const readline = require('readline');
const config = require('../utils/config');
const validation = require('../utils/validation');
const display = require('../utils/display');
const { createTokenPriceArray } = require('../scripts/priceUtils');

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
  console.log('🏁 라운드 종료 및 정산을 시작합니다...\n');

  try {
    // 네트워크 설정 로드
    const networkConfig = await config.getNetworkConfig(options.network);
    
    // 필수 파라미터 수집
    const params = await collectParameters(options);
    
    // 입력 검증
    await validation.validateFinalizeParams(params);
    
    // 라운드 종료 실행
    const result = await finalizeRound(params, networkConfig);
    
    // 결과 출력
    display.showFinalizeResult(result);
    
  } catch (error) {
    display.showError(error);
    throw error;
  } finally {
    rl.close();
  }
}

async function collectParameters(options) {
  const params = {};
  
  // 팩토리 주소
  params.factoryAddress = options.factory || 
    await config.getFactoryAddress(options.network) ||
    await askQuestion('팩토리 컨트랙트 주소를 입력하세요: ');
  
  // 라운드 주소
  if (options.round) {
    params.roundAddress = options.round;
  } else {
    // 현재 활성 라운드 자동 감지 시도
    try {
      const RoundFactory = await ethers.getContractFactory("RoundFactory");
      const factory = RoundFactory.attach(params.factoryAddress);
      const currentRoundInfo = await factory.getCurrentRoundInfo();
      
      if (currentRoundInfo.roundAddress !== ethers.ZeroAddress) {
        params.roundAddress = currentRoundInfo.roundAddress;
        console.log(`✓ 현재 활성 라운드 감지: ${params.roundAddress}`);
      } else {
        params.roundAddress = await askQuestion('라운드 컨트랙트 주소를 입력하세요: ');
      }
    } catch (error) {
      params.roundAddress = await askQuestion('라운드 컨트랙트 주소를 입력하세요: ');
    }
  }
  
  // 참여 토큰
  if (options.tokens) {
    params.tokenSymbols = options.tokens.split(' ').filter(t => t.length > 0);
  } else {
    // 라운드에서 자동으로 토큰 목록 가져오기 시도
    try {
      const Round = await ethers.getContractFactory("Round");
      const round = Round.attach(params.roundAddress);
      const RoundFactory = await ethers.getContractFactory("RoundFactory");
      const factory = RoundFactory.attach(params.factoryAddress);
      
      const registeredTokens = await round.getRegisteredTokens();
      const supportedTokens = await factory.getSupportedTokens();
      
      params.tokenSymbols = registeredTokens.map(tokenAddress => {
        const token = supportedTokens.find(t => t.tokenAddress === tokenAddress);
        return token ? token.symbol : tokenAddress;
      }).filter(symbol => symbol.length <= 10); // 심볼만 필터링
      
      console.log(`✓ 라운드 참여 토큰 자동 감지: ${params.tokenSymbols.join(', ')}`);
    } catch (error) {
      const tokensInput = await askQuestion('참여 토큰 심볼들을 입력하세요 (공백으로 구분): ');
      params.tokenSymbols = tokensInput.split(' ').filter(t => t.length > 0);
    }
  }
  
  params.network = options.network || 'monadTestnet';
  
  return params;
}

async function finalizeRound(params, networkConfig) {
  const [deployer] = await ethers.getSigners();
  
  console.log(`📋 라운드 종료 정보:`);
  console.log(`   실행 계정: ${deployer.address}`);
  console.log(`   팩토리 주소: ${params.factoryAddress}`);
  console.log(`   라운드 주소: ${params.roundAddress}`);
  console.log(`   토큰들: ${params.tokenSymbols.join(', ')}`);
  console.log(`   네트워크: ${params.network}\n`);

  const RoundFactory = await ethers.getContractFactory("RoundFactory");
  const factory = RoundFactory.attach(params.factoryAddress);

  const Round = await ethers.getContractFactory("Round");
  const round = Round.attach(params.roundAddress);

  // 라운드 상태 확인
  display.showProgress('라운드 상태 확인 중');
  const timeInfo = await round.getTimeInfo();
  if (!timeInfo._hasEnded) {
    throw new Error(`라운드가 아직 종료되지 않았습니다. (남은 시간: ${Math.round(Number(timeInfo._timeLeft) / 60)}분)`);
  }

  // 지원되는 토큰 목록 조회
  const supportedTokens = await factory.getSupportedTokens();
  
  // 토큰 주소와 현재 가격 수집
  const tokenAddresses = [];
  for (const symbol of params.tokenSymbols) {
    const token = supportedTokens.find(t => t.symbol === symbol);
    if (token) {
      tokenAddresses.push({ symbol, address: token.tokenAddress });
    } else {
      throw new Error(`${symbol} 토큰을 찾을 수 없습니다.`);
    }
  }

  // 현재 가격 조회
  display.showProgress('현재 토큰 가격 조회 중');
  const currentPrices = await createTokenPriceArray(tokenAddresses);
  
  const priceUpdates = currentPrices.map((price, index) => ({
    symbol: tokenAddresses[index].symbol,
    currentPrice: price.currentPrice
  }));

  console.log('\n📊 현재 토큰 가격:');
  priceUpdates.forEach(update => {
    const priceUSD = ethers.formatUnits(update.currentPrice, 18);
    console.log(`   ${update.symbol}: $${Number(priceUSD).toLocaleString()}`);
  });

  // 라운드 종료 트랜잭션 전송
  display.showProgress('라운드 종료 트랜잭션 전송 중');
  const tx = await factory.finalizeRound(params.roundAddress, currentPrices);
  const receipt = await tx.wait();
  
  // 승리 토큰 확인
  const roundStats = await round.getRoundStats();
  let winnerSymbol = null;
  
  if (roundStats.winner !== ethers.ZeroAddress) {
    const winnerToken = supportedTokens.find(t => t.tokenAddress === roundStats.winner);
    winnerSymbol = winnerToken ? winnerToken.symbol : null;
  }
  
  return {
    success: true,
    transactionHash: tx.hash,
    winner: roundStats.winner,
    winnerSymbol,
    totalPool: roundStats.totalPool,
    priceUpdates
  };
}

module.exports = { execute };