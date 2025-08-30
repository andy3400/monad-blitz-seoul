const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 수동 토큰 가격 업데이트 및 전송");
    
    // 환경 변수에서 설정 가져오기
    const PRICE_FEEDER_ADDRESS = process.env.PRICE_FEEDER_ADDRESS;
    const TOKEN_ADDRESS = process.env.TARGET_TOKEN_ADDRESS;
    const NEW_PRICE = process.env.NEW_PRICE;
    
    if (!PRICE_FEEDER_ADDRESS) {
        console.error("❌ PRICE_FEEDER_ADDRESS 환경 변수가 필요합니다.");
        process.exit(1);
    }

    // 배포할 계정 확인
    const [sender] = await ethers.getSigners();
    console.log("📤 송신자:", sender.address);

    try {
        // CrossChainPriceFeeder 컨트랙트 연결
        const CrossChainPriceFeeder = await ethers.getContractFactory("CrossChainPriceFeeder");
        const priceFeeder = CrossChainPriceFeeder.attach(PRICE_FEEDER_ADDRESS);
        
        console.log("🔗 PriceFeeder 연결됨:", PRICE_FEEDER_ADDRESS);

        // LINK 잔액 확인
        const linkBalance = await priceFeeder.getLinkBalance();
        console.log("🔗 LINK 잔액:", ethers.formatEther(linkBalance), "LINK");

        // 현재 지원되는 토큰 목록 조회
        const supportedTokens = await priceFeeder.getAllTokens();
        console.log(`\n📋 현재 지원 토큰 ${supportedTokens.length}개:`);
        
        for (let i = 0; i < supportedTokens.length; i++) {
            const token = supportedTokens[i];
            const priceUSD = ethers.formatUnits(token.currentPrice, 18);
            console.log(`   ${i + 1}. ${token.symbol} (${token.name})`);
            console.log(`      주소: ${token.tokenAddress}`);
            console.log(`      현재 가격: $${Number(priceUSD).toLocaleString()}`);
            console.log(`      마지막 업데이트: ${new Date(Number(token.lastUpdated) * 1000).toLocaleString()}`);
        }

        // 사용자 입력 처리
        if (TOKEN_ADDRESS && NEW_PRICE) {
            // 환경 변수로 지정된 경우
            const tokenAddresses = [TOKEN_ADDRESS];
            const newPrices = [ethers.parseUnits(NEW_PRICE, 18)];
            
            console.log(`\n🎯 지정된 토큰 업데이트:`);
            console.log(`   토큰 주소: ${TOKEN_ADDRESS}`);
            console.log(`   새로운 가격: $${NEW_PRICE}`);
            
            await updateAndSendTokens(priceFeeder, tokenAddresses, newPrices);
            
        } else {
            // 대화형 모드 (모든 토큰 업데이트)
            console.log("\n🔄 모든 토큰 현재 가격으로 업데이트 및 전송하시겠습니까? (y/n)");
            
            // 환경 변수 AUTO_CONFIRM이 true면 자동 실행
            const autoConfirm = process.env.AUTO_CONFIRM === "true";
            
            if (autoConfirm) {
                console.log("✅ 자동 확인 모드 - 모든 토큰 업데이트 진행");
                
                const tokenAddresses = supportedTokens.map(token => token.tokenAddress);
                const currentPrices = supportedTokens.map(token => token.currentPrice);
                
                await updateAndSendTokens(priceFeeder, tokenAddresses, currentPrices);
            } else {
                console.log("💡 사용 방법:");
                console.log("1. 특정 토큰 업데이트:");
                console.log("   TARGET_TOKEN_ADDRESS=0x... NEW_PRICE=50000 npm run update-and-send");
                console.log("2. 모든 토큰 자동 업데이트:");
                console.log("   AUTO_CONFIRM=true npm run update-and-send");
            }
        }

    } catch (error) {
        console.error("❌ 실행 중 오류 발생:", error);
        process.exitCode = 1;
    }
}

async function updateAndSendTokens(priceFeeder, tokenAddresses, newPrices) {
    try {
        console.log("\n💰 수수료 추정 중...");
        const monadSelector = "2183018362218727504";
        const estimatedFees = await priceFeeder.estimateFees(monadSelector, tokenAddresses);
        console.log(`   예상 수수료: ${ethers.formatEther(estimatedFees)} LINK`);
        
        const linkBalance = await priceFeeder.getLinkBalance();
        if (linkBalance < estimatedFees) {
            console.error(`❌ LINK 잔액 부족! 필요: ${ethers.formatEther(estimatedFees)} LINK`);
            return;
        }

        console.log("🚀 토큰 가격 업데이트 및 전송 중...");
        
        const tx = await priceFeeder.updateAndBroadcast(tokenAddresses, newPrices);
        console.log("📝 트랜잭션 해시:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("✅ 트랜잭션 확인됨! 블록:", receipt.blockNumber);

        // 이벤트 분석
        console.log("\n📋 처리된 업데이트:");
        for (const log of receipt.logs) {
            try {
                const parsedLog = priceFeeder.interface.parseLog(log);
                
                if (parsedLog.name === "PriceMessageSent") {
                    const fees = ethers.formatEther(parsedLog.args.fees);
                    console.log(`   📤 ${parsedLog.args.tokenCount}개 토큰 전송 완료`);
                    console.log(`   💰 사용된 LINK: ${fees}`);
                }
            } catch (error) {
                // 파싱 실패 무시
            }
        }

        console.log("\n🎉 업데이트 및 전송 완료!");
        
    } catch (error) {
        console.error("❌ 업데이트 실패:", error);
        throw error;
    }
}

// 스크립트 실행
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});