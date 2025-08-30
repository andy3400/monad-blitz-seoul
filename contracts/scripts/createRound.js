const { ethers } = require("hardhat");
const { createTokenPriceArray, getMultipleTokenPrices } = require("./priceUtils");

async function main() {
    // 환경 변수에서 파라미터 읽기
    const factoryAddress = process.env.FACTORY_ADDRESS;
    const roundName = process.env.ROUND_NAME;
    const durationStr = process.env.DURATION;
    const tokenSymbolsStr = process.env.TOKENS;
    
    if (!factoryAddress || !roundName || !durationStr || !tokenSymbolsStr) {
        console.error("환경 변수를 설정해주세요:");
        console.error("FACTORY_ADDRESS=0x123... ROUND_NAME='Morning Battle' DURATION=3600 TOKENS='BTC ETH SOL' npm run round:create");
        return;
    }
    
    const tokenSymbols = tokenSymbolsStr.split(' ').filter(token => token.length > 0);

    const duration = parseInt(durationStr);
    console.log(`🚀 라운드 생성 중...`);
    console.log(`   팩토리 주소: ${factoryAddress}`);
    console.log(`   라운드 이름: ${roundName}`);
    console.log(`   지속 시간: ${duration}초 (${Math.round(duration / 60)}분)`);
    console.log(`   참여 토큰: ${tokenSymbols.join(', ')}`);

    const [deployer] = await ethers.getSigners();
    console.log("실행 계정:", deployer.address);

    const RoundFactory = await ethers.getContractFactory("RoundFactory");
    const factory = RoundFactory.attach(factoryAddress);

    try {
        // 지원되는 토큰 목록 조회
        const supportedTokens = await factory.getSupportedTokens();
        console.log("\n📋 지원 가능한 토큰들:");
        supportedTokens.forEach(token => {
            console.log(`   ${token.symbol} (${token.name}): ${token.tokenAddress}`);
        });

        // 참여 토큰 주소 찾기
        const participatingTokens = [];
        for (const symbol of tokenSymbols) {
            const token = supportedTokens.find(t => t.symbol === symbol);
            if (token) {
                participatingTokens.push(token.tokenAddress);
                console.log(`✓ ${symbol} 토큰 찾음: ${token.tokenAddress}`);
            } else {
                console.error(`❌ ${symbol} 토큰을 지원 토큰 목록에서 찾을 수 없습니다.`);
                return;
            }
        }

        // 라운드 생성
        console.log("\n🎯 라운드 생성 트랜잭션 전송 중...");
        const tx = await factory.createRound(roundName, duration, participatingTokens);
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

        if (roundCreatedEvent) {
            const parsedEvent = factory.interface.parseLog(roundCreatedEvent);
            const roundAddress = parsedEvent.args.roundAddress;
            
            console.log("✅ 라운드 생성 완료!");
            console.log(`   라운드 주소: ${roundAddress}`);
            console.log(`   트랜잭션 해시: ${tx.hash}`);
            
            // 라운드 정보 조회
            const Round = await ethers.getContractFactory("Round");
            const round = Round.attach(roundAddress);
            const timeInfo = await round.getTimeInfo();
            
            console.log("\n⏰ 라운드 시간 정보:");
            console.log(`   시작 시간: ${new Date(Number(timeInfo._startTime) * 1000).toLocaleString()}`);
            console.log(`   종료 시간: ${new Date(Number(timeInfo._endTime) * 1000).toLocaleString()}`);
            console.log(`   남은 시간: ${Math.round(Number(timeInfo._timeLeft) / 60)}분`);
            
        } else {
            console.error("❌ 라운드 생성 이벤트를 찾을 수 없습니다.");
        }
        
    } catch (error) {
        console.error("❌ 라운드 생성 중 오류 발생:", error.message);
        process.exitCode = 1;
    }
}

// 스크립트 실행
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});