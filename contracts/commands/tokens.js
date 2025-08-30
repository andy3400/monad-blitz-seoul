const { ethers } = require("hardhat");
const config = require('../utils/config');
const validation = require('../utils/validation');
const display = require('../utils/display');

async function execute(options) {
  console.log('🪙 토큰 관리 도구\n');

  try {
    // 네트워크 설정 로드
    const networkConfig = await config.getNetworkConfig(options.network);
    
    // 팩토리 주소 가져오기
    const factoryAddress = options.factory || await config.getFactoryAddress(options.network);
    
    // 토큰 목록 조회 및 표시
    const tokens = await getTokenList(factoryAddress);
    display.showTokenList(tokens);
    
  } catch (error) {
    display.showError(error);
    throw error;
  }
}

async function getTokenList(factoryAddress) {
  const [deployer] = await ethers.getSigners();
  
  const RoundFactory = await ethers.getContractFactory("RoundFactory");
  const factory = RoundFactory.attach(factoryAddress);

  // 지원되는 토큰 목록 조회
  const supportedTokens = await factory.getSupportedTokens();
  
  return supportedTokens.map(token => ({
    symbol: token.symbol,
    name: token.name,
    tokenAddress: token.tokenAddress
  }));
}

module.exports = { execute };