const { ethers } = require("hardhat");

async function validateCreateParams(params) {
  // 팩토리 주소 검증
  if (!params.factoryAddress) {
    throw new Error('팩토리 컨트랙트 주소가 필요합니다.');
  }
  
  if (!ethers.isAddress(params.factoryAddress)) {
    throw new Error('유효하지 않은 팩토리 주소입니다.');
  }
  
  // 라운드 이름 검증
  if (!params.roundName || params.roundName.length === 0) {
    throw new Error('라운드 이름이 필요합니다.');
  }
  
  if (params.roundName.length > 100) {
    throw new Error('라운드 이름은 100자를 초과할 수 없습니다.');
  }
  
  // 지속 시간 검증
  if (!params.duration || params.duration <= 0) {
    throw new Error('유효한 지속 시간이 필요합니다.');
  }
  
  if (params.duration < 60) {
    throw new Error('라운드 지속 시간은 최소 60초 이상이어야 합니다.');
  }
  
  if (params.duration > 86400 * 7) { // 7일
    throw new Error('라운드 지속 시간은 최대 7일을 초과할 수 없습니다.');
  }
  
  // 토큰 심볼 검증
  if (!params.tokenSymbols || params.tokenSymbols.length === 0) {
    throw new Error('최소 하나의 토큰 심볼이 필요합니다.');
  }
  
  if (params.tokenSymbols.length > 10) {
    throw new Error('참여 토큰은 최대 10개까지 가능합니다.');
  }
  
  // 토큰 심볼 형식 검증
  for (const symbol of params.tokenSymbols) {
    if (!/^[A-Z]{2,10}$/.test(symbol)) {
      throw new Error(`유효하지 않은 토큰 심볼입니다: ${symbol}. 2-10자의 대문자만 허용됩니다.`);
    }
  }
  
  // 중복 토큰 검증
  const uniqueTokens = new Set(params.tokenSymbols);
  if (uniqueTokens.size !== params.tokenSymbols.length) {
    throw new Error('중복된 토큰 심볼이 있습니다.');
  }
  
  return true;
}

async function validateFinalizeParams(params) {
  // 팩토리 주소 검증
  if (!params.factoryAddress || !ethers.isAddress(params.factoryAddress)) {
    throw new Error('유효한 팩토리 컨트랙트 주소가 필요합니다.');
  }
  
  // 라운드 주소 검증
  if (!params.roundAddress || !ethers.isAddress(params.roundAddress)) {
    throw new Error('유효한 라운드 컨트랙트 주소가 필요합니다.');
  }
  
  // 토큰 심볼 검증
  if (!params.tokenSymbols || params.tokenSymbols.length === 0) {
    throw new Error('토큰 심볼들이 필요합니다.');
  }
  
  return true;
}

async function validateTokenParams(params) {
  // 팩토리 주소 검증
  if (!params.factoryAddress || !ethers.isAddress(params.factoryAddress)) {
    throw new Error('유효한 팩토리 컨트랙트 주소가 필요합니다.');
  }
  
  return true;
}

function validateAddress(address, fieldName = '주소') {
  if (!address) {
    throw new Error(`${fieldName}가 필요합니다.`);
  }
  
  if (!ethers.isAddress(address)) {
    throw new Error(`유효하지 않은 ${fieldName}입니다: ${address}`);
  }
  
  return true;
}

function validateTokenSymbol(symbol) {
  if (!symbol) {
    throw new Error('토큰 심볼이 필요합니다.');
  }
  
  if (!/^[A-Z]{2,10}$/.test(symbol)) {
    throw new Error(`유효하지 않은 토큰 심볼입니다: ${symbol}. 2-10자의 대문자만 허용됩니다.`);
  }
  
  return true;
}

function validateDuration(duration) {
  const durationNum = parseInt(duration);
  
  if (isNaN(durationNum) || durationNum <= 0) {
    throw new Error('유효한 지속 시간이 필요합니다.');
  }
  
  if (durationNum < 60) {
    throw new Error('라운드 지속 시간은 최소 60초 이상이어야 합니다.');
  }
  
  if (durationNum > 86400 * 7) { // 7일
    throw new Error('라운드 지속 시간은 최대 7일을 초과할 수 없습니다.');
  }
  
  return durationNum;
}

module.exports = {
  validateCreateParams,
  validateFinalizeParams,
  validateTokenParams,
  validateAddress,
  validateTokenSymbol,
  validateDuration
};