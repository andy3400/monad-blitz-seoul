const { ethers } = require("hardhat");

function showCreateResult(result) {
  console.log('\n✅ 라운드 생성 완료!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🎯 라운드 주소: ${result.roundAddress}`);
  console.log(`📝 트랜잭션: ${result.transactionHash}`);
  console.log(`⏰ 시작 시간: ${new Date(Number(result.timeInfo._startTime) * 1000).toLocaleString()}`);
  console.log(`⏰ 종료 시간: ${new Date(Number(result.timeInfo._endTime) * 1000).toLocaleString()}`);
  console.log(`⏳ 남은 시간: ${Math.round(Number(result.timeInfo._timeLeft) / 60)}분`);
  console.log(`🪙 참여 토큰: ${result.tokenSymbols.join(', ')}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function showStatusResult(result) {
  if (!result.hasActiveRound) {
    console.log('\n❌ 현재 활성화된 라운드가 없습니다.');
    console.log(`새 라운드 생성 가능: ${result.canCreateNew ? '✅' : '❌'}\n`);
    return;
  }

  console.log('\n📊 현재 라운드 정보');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🎯 라운드 주소: ${result.roundAddress}`);
  console.log(`📝 라운드 이름: ${result.roundName}`);
  console.log(`🔄 활성 상태: ${result.isActive ? '✅' : '❌'}`);
  console.log(`🪙 참여 토큰 수: ${result.tokenCount}`);
  console.log(`💰 현재 상금 풀: ${ethers.formatEther(result.totalPrizePool)} ETH`);
  
  console.log('\n⏰ 시간 정보:');
  console.log(`   시작: ${new Date(Number(result.timeInfo._startTime) * 1000).toLocaleString()}`);
  console.log(`   종료: ${new Date(Number(result.timeInfo._endTime) * 1000).toLocaleString()}`);
  console.log(`   종료 여부: ${result.timeInfo._hasEnded ? '✅' : '❌'}`);
  
  if (!result.timeInfo._hasEnded) {
    console.log(`   남은 시간: ${Math.round(Number(result.timeInfo._timeLeft) / 60)}분`);
  }

  if (result.tokenStats && result.tokenStats.length > 0) {
    console.log('\n🪙 참여 토큰 및 베팅 현황:');
    result.tokenStats.forEach(token => {
      const initialPriceUSD = ethers.formatUnits(token.initialPrice, 18);
      const totalBetsETH = ethers.formatEther(token.totalBets);
      
      console.log(`   ${token.symbol}:`);
      console.log(`     초기 가격: $${Number(initialPriceUSD).toLocaleString()}`);
      console.log(`     총 베팅: ${totalBetsETH} ETH`);
    });
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function showFinalizeResult(result) {
  console.log('\n✅ 라운드 종료 완료!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📝 트랜잭션: ${result.transactionHash}`);
  
  if (result.winner && result.winner !== ethers.ZeroAddress) {
    console.log(`🏆 승리 토큰: ${result.winnerSymbol || result.winner}`);
    console.log(`💰 총 상금 풀: ${ethers.formatEther(result.totalPool)} ETH`);
  } else {
    console.log('🤷 승리 토큰이 결정되지 않았습니다.');
  }
  
  if (result.priceUpdates && result.priceUpdates.length > 0) {
    console.log('\n📊 최종 가격 정보:');
    result.priceUpdates.forEach(update => {
      const priceUSD = ethers.formatUnits(update.currentPrice, 18);
      console.log(`   ${update.symbol}: $${Number(priceUSD).toLocaleString()}`);
    });
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function showTokenList(tokens) {
  console.log('\n📋 지원 토큰 목록');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (!tokens || tokens.length === 0) {
    console.log('등록된 토큰이 없습니다.');
  } else {
    tokens.forEach((token, index) => {
      console.log(`${index + 1}. ${token.symbol} (${token.name})`);
      console.log(`   주소: ${token.tokenAddress}`);
    });
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function showError(error) {
  console.log('\n❌ 오류 발생');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`메시지: ${error.message}`);
  
  if (error.code) {
    console.log(`코드: ${error.code}`);
  }
  
  if (error.reason) {
    console.log(`이유: ${error.reason}`);
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function showProgress(message) {
  console.log(`⏳ ${message}...`);
}

function showSuccess(message) {
  console.log(`✅ ${message}`);
}

function showWarning(message) {
  console.log(`⚠️  ${message}`);
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  } else if (minutes > 0) {
    return `${minutes}분 ${secs}초`;
  } else {
    return `${secs}초`;
  }
}

function formatPrice(priceWei, decimals = 18) {
  const price = ethers.formatUnits(priceWei, decimals);
  return Number(price).toLocaleString();
}

module.exports = {
  showCreateResult,
  showStatusResult,
  showFinalizeResult,
  showTokenList,
  showError,
  showProgress,
  showSuccess,
  showWarning,
  formatDuration,
  formatPrice
};