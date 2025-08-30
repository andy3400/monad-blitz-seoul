const { ethers } = require("hardhat");
const config = require('../utils/config');
const validation = require('../utils/validation');
const display = require('../utils/display');

async function execute(options) {
  console.log('🔍 라운드 상태 조회 중...\n');

  try {
    // 네트워크 설정 로드
    const networkConfig = await config.getNetworkConfig(options.network);
    
    // 팩토리 주소 가져오기
    const factoryAddress = options.factory || await config.getFactoryAddress(options.network);
    
    // 상태 조회 실행
    const result = await getRoundStatus(factoryAddress, options);
    
    // 결과 출력
    display.showStatusResult(result);
    
  } catch (error) {
    display.showError(error);
    throw error;
  }
}

async function getRoundStatus(factoryAddress, options) {
  const [deployer] = await ethers.getSigners();
  
  const RoundFactory = await ethers.getContractFactory("RoundFactory");
  const factory = RoundFactory.attach(factoryAddress);

  // 현재 라운드 정보 조회
  const currentRoundInfo = await factory.getCurrentRoundInfo();
  
  if (currentRoundInfo.roundAddress === ethers.ZeroAddress) {
    const canCreate = await factory.canCreateNewRound();
    return {
      hasActiveRound: false,
      canCreateNew: canCreate
    };
  }

  // 라운드 세부 정보 조회
  const Round = await ethers.getContractFactory("Round");
  const round = Round.attach(currentRoundInfo.roundAddress);
  
  const timeInfo = await round.getTimeInfo();
  const supportedTokens = await factory.getSupportedTokens();
  
  // 참여 토큰 및 베팅 현황
  const registeredTokens = await round.getRegisteredTokens();
  const tokenStats = [];
  
  for (const tokenAddress of registeredTokens) {
    const tokenInfo = await round.getTokenInfo(tokenAddress);
    const supportedToken = supportedTokens.find(t => t.tokenAddress === tokenAddress);
    
    tokenStats.push({
      symbol: supportedToken ? supportedToken.symbol : 'Unknown',
      name: supportedToken ? supportedToken.name : 'Unknown',
      address: tokenAddress,
      initialPrice: tokenInfo.initialPrice,
      totalBets: tokenInfo.totalBets
    });
  }

  return {
    hasActiveRound: true,
    roundAddress: currentRoundInfo.roundAddress,
    roundName: currentRoundInfo.roundName,
    isActive: currentRoundInfo.isActive,
    tokenCount: currentRoundInfo.tokenCount,
    totalPrizePool: currentRoundInfo.totalPrizePool,
    timeInfo,
    tokenStats
  };
}

module.exports = { execute };