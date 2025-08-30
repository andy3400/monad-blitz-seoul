const { ethers } = require("hardhat");

async function main() {
    // 환경 변수에서 파라미터 읽기
    const factoryAddress = process.env.FACTORY_ADDRESS;
    
    if (!factoryAddress) {
        console.error("환경 변수를 설정해주세요:");
        console.error("FACTORY_ADDRESS=0x123... npm run round:status");
        return;
    }

    console.log("🔍 라운드 상태 조회 중...");
    
    const [deployer] = await ethers.getSigners();
    console.log("실행 계정:", deployer.address);

    const RoundFactory = await ethers.getContractFactory("RoundFactory");
    const factory = RoundFactory.attach(factoryAddress);

    try {
        // 현재 라운드 정보
        const currentRoundInfo = await factory.getCurrentRoundInfo();
        
        if (currentRoundInfo.roundAddress === ethers.ZeroAddress) {
            console.log("❌ 현재 활성화된 라운드가 없습니다.");
            
            const canCreate = await factory.canCreateNewRound();
            console.log(`새 라운드 생성 가능: ${canCreate ? '✅' : '❌'}`);
            return;
        }

        console.log("📊 현재 라운드 정보:");
        console.log(`   라운드 주소: ${currentRoundInfo.roundAddress}`);
        console.log(`   라운드 이름: ${currentRoundInfo.roundName}`);
        console.log(`   활성 상태: ${currentRoundInfo.isActive ? '✅' : '❌'}`);
        console.log(`   참여 토큰 수: ${currentRoundInfo.tokenCount}`);
        console.log(`   현재 상금 풀: ${ethers.formatEther(currentRoundInfo.totalPrizePool)} ETH`);

        // 라운드 세부 정보
        const Round = await ethers.getContractFactory("Round");
        const round = Round.attach(currentRoundInfo.roundAddress);
        
        const timeInfo = await round.getTimeInfo();
        console.log("\n⏰ 시간 정보:");
        console.log(`   시작 시간: ${new Date(Number(timeInfo._startTime) * 1000).toLocaleString()}`);
        console.log(`   종료 시간: ${new Date(Number(timeInfo._endTime) * 1000).toLocaleString()}`);
        console.log(`   종료 여부: ${timeInfo._hasEnded ? '✅' : '❌'}`);
        
        if (!timeInfo._hasEnded) {
            console.log(`   남은 시간: ${Math.round(Number(timeInfo._timeLeft) / 60)}분`);
        }

        // 참여 토큰들과 베팅 현황
        const registeredTokens = await round.getRegisteredTokens();
        const supportedTokens = await factory.getSupportedTokens();
        
        console.log("\n🪙 참여 토큰 및 베팅 현황:");
        for (const tokenAddress of registeredTokens) {
            const tokenInfo = await round.getTokenInfo(tokenAddress);
            const supportedToken = supportedTokens.find(t => t.tokenAddress === tokenAddress);
            
            const initialPriceUSD = ethers.formatUnits(tokenInfo.initialPrice, 18);
            const totalBetsETH = ethers.formatEther(tokenInfo.totalBets);
            
            console.log(`   ${supportedToken ? supportedToken.symbol : 'Unknown'}:`);
            console.log(`     초기 가격: $${Number(initialPriceUSD).toLocaleString()}`);
            console.log(`     총 베팅: ${totalBetsETH} ETH`);
        }
        
    } catch (error) {
        console.error("❌ 상태 조회 중 오류 발생:", error.message);
        process.exitCode = 1;
    }
}

// 스크립트 실행
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});