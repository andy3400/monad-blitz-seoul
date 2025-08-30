const { ethers } = require("hardhat");
const { createTokenPriceArray, getMultipleTokenPrices } = require("./priceUtils");

async function main() {
    // 환경 변수에서 파라미터 읽기
    const factoryAddress = process.env.FACTORY_ADDRESS;
    const roundAddress = process.env.ROUND_ADDRESS;
    const tokenSymbolsStr = process.env.TOKENS;
    
    if (!factoryAddress || !roundAddress || !tokenSymbolsStr) {
        console.error("환경 변수를 설정해주세요:");
        console.error("FACTORY_ADDRESS=0x123... ROUND_ADDRESS=0x456... TOKENS='BTC ETH SOL' npm run round:finalize");
        return;
    }
    
    const tokenSymbols = tokenSymbolsStr.split(' ').filter(token => token.length > 0);

    console.log(`🏁 라운드 종료 및 정산 중...`);
    console.log(`   팩토리 주소: ${factoryAddress}`);
    console.log(`   라운드 주소: ${roundAddress}`);
    console.log(`   토큰들: ${tokenSymbols.join(', ')}`);

    const [deployer] = await ethers.getSigners();
    console.log("실행 계정:", deployer.address);

    const RoundFactory = await ethers.getContractFactory("RoundFactory");
    const factory = RoundFactory.attach(factoryAddress);

    const Round = await ethers.getContractFactory("Round");
    const round = Round.attach(roundAddress);

    try {
        // 라운드 상태 확인
        const timeInfo = await round.getTimeInfo();
        if (!timeInfo._hasEnded) {
            console.error(`❌ 라운드가 아직 종료되지 않았습니다. (남은 시간: ${Math.round(Number(timeInfo._timeLeft) / 60)}분)`);
            return;
        }

        // 지원되는 토큰 목록 조회
        const supportedTokens = await factory.getSupportedTokens();
        
        // 토큰 주소와 현재 가격 수집
        const tokenAddresses = [];
        for (const symbol of tokenSymbols) {
            const token = supportedTokens.find(t => t.symbol === symbol);
            if (token) {
                tokenAddresses.push({ symbol, address: token.tokenAddress });
            } else {
                console.error(`❌ ${symbol} 토큰을 찾을 수 없습니다.`);
                return;
            }
        }

        // Binance API에서 현재 가격 조회
        console.log("\n📊 현재 토큰 가격 조회 중...");
        const currentPrices = await createTokenPriceArray(tokenAddresses);
        
        currentPrices.forEach((price, index) => {
            const priceUSD = ethers.formatUnits(price.currentPrice, 18);
            console.log(`   ${tokenAddresses[index].symbol}: $${Number(priceUSD).toLocaleString()}`);
        });

        // 라운드 종료 트랜잭션 전송
        console.log("\n💰 라운드 종료 트랜잭션 전송 중...");
        const tx = await factory.finalizeRound(roundAddress,
            //    currentPrices
            [["0x0000000000000000000000000000000000000001", "81210000000000000000000"],["0x0000000000000000000000000000000000000002", "4597320000000000000000"],       ["0x0000000000000000000000000000000000000003", "205750000000000000000"],["0x0000000000000000000000000000000000000004", "216750000000000000"],["0x0000000000000000000000000000000000000005", "9960000000000"],["0x0000000000000000000000000000000000000006", "120000"]]
        );

        const receipt = await tx.wait();
        
        console.log("✅ 라운드 종료 완료!");
        console.log(`   트랜잭션 해시: ${tx.hash}`);
        
        // 승리 토큰 확인
        const roundStats = await round.getRoundStats();
        if (roundStats.winner !== ethers.ZeroAddress) {
            const winnerToken = supportedTokens.find(t => t.tokenAddress === roundStats.winner);
            console.log(`🏆 승리 토큰: ${winnerToken ? winnerToken.symbol : roundStats.winner}`);
            console.log(`💰 총 상금 풀: ${ethers.formatEther(roundStats.totalPool)} ETH`);
        }
        
    } catch (error) {
        console.error("❌ 라운드 종료 중 오류 발생:", error.message);
        process.exitCode = 1;
    }
}

// 스크립트 실행
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});