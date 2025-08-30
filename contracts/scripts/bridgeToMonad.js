const { ethers } = require("hardhat");
const { getTokensWithPrices } = require("./priceUtils");

async function main() {
    console.log("🌉 CrossChain Price Bridge 시작 (Sepolia → Monad)");
    
    // 환경 변수에서 컨트랙트 주소 가져오기
    const PRICE_FEEDER_ADDRESS = process.env.PRICE_FEEDER_ADDRESS;
    const MONAD_FACTORY_ADDRESS = process.env.MONAD_FACTORY_ADDRESS;
    
    if (!PRICE_FEEDER_ADDRESS) {
        console.error("❌ PRICE_FEEDER_ADDRESS 환경 변수가 설정되지 않았습니다.");
        console.log("💡 .env 파일에 PRICE_FEEDER_ADDRESS=0x... 를 추가하세요.");
        process.exit(1);
    }
    
    if (!MONAD_FACTORY_ADDRESS || MONAD_FACTORY_ADDRESS === "0x0000000000000000000000000000000000000000") {
        console.error("❌ MONAD_FACTORY_ADDRESS 환경 변수가 설정되지 않았습니다.");
        console.log("💡 .env 파일에 MONAD_FACTORY_ADDRESS=0x... 를 추가하세요.");
        process.exit(1);
    }

    // 배포할 계정 확인
    const [sender] = await ethers.getSigners();
    console.log("📤 메시지 송신자:", sender.address);
    
    const balance = await ethers.provider.getBalance(sender.address);
    console.log("💰 계정 잔액:", ethers.formatEther(balance), "ETH");

    try {
        // CrossChainPriceFeeder 컨트랙트 연결
        const CrossChainPriceFeeder = await ethers.getContractFactory("CrossChainPriceFeeder");
        const priceFeeder = CrossChainPriceFeeder.attach(PRICE_FEEDER_ADDRESS);
        
        console.log("🔗 PriceFeeder 연결됨:", PRICE_FEEDER_ADDRESS);

        // LINK 잔액 확인
        const linkBalance = await priceFeeder.getLinkBalance();
        console.log("🔗 LINK 잔액:", ethers.formatEther(linkBalance), "LINK");
        
        if (linkBalance === 0n) {
            console.error("❌ LINK 토큰이 부족합니다. CCIP 수수료를 지불할 LINK가 필요합니다.");
            console.log("💡 Sepolia LINK 주소: 0x779877A7B0D9E8603169DdbD7836e478b4624789");
            process.exit(1);
        }

        // 현재 지원되는 토큰 목록 조회
        const supportedTokens = await priceFeeder.getAllTokens();
        console.log(`\n📋 지원 토큰 ${supportedTokens.length}개 발견:`);
        
        const tokenAddresses = [];
        for (let i = 0; i < supportedTokens.length; i++) {
            const token = supportedTokens[i];
            console.log(`   ${i + 1}. ${token.symbol} (${token.name})`);
            console.log(`      주소: ${token.tokenAddress}`);
            console.log(`      현재 가격: $${ethers.formatUnits(token.currentPrice, 18)}`);
            tokenAddresses.push(token.tokenAddress);
        }

        if (tokenAddresses.length === 0) {
            console.error("❌ 전송할 토큰이 없습니다. 먼저 토큰을 추가하세요.");
            process.exit(1);
        }

        // Monad 대상 체인이 설정되어 있는지 확인
        const monadSelector = "2183018362218727504";
        console.log("\n🎯 대상 체인 설정 확인 중...");
        
        try {
            // 대상 컨트랙트 주소가 설정되어 있는지 확인
            await priceFeeder.setDestinationContract(monadSelector, MONAD_FACTORY_ADDRESS, true);
            console.log("✅ Monad 대상 체인 설정 완료");
        } catch (error) {
            console.log("⚠️  대상 체인 설정 중 오류 (이미 설정되었을 수 있음):", error.message);
        }

        // 수수료 추정
        console.log("\n💰 CCIP 전송 수수료 추정 중...");
        const estimatedFees = await priceFeeder.estimateFees(monadSelector, tokenAddresses);
        console.log(`   예상 수수료: ${ethers.formatEther(estimatedFees)} LINK`);
        
        if (linkBalance < estimatedFees) {
            console.error(`❌ LINK 잔액 부족! 필요: ${ethers.formatEther(estimatedFees)} LINK, 보유: ${ethers.formatEther(linkBalance)} LINK`);
            process.exit(1);
        }

        // 1. 먼저 Binance API에서 최신 가격 업데이트
        console.log("\n📊 Binance API에서 최신 가격 업데이트 중...");
        
        const priceSymbols = supportedTokens.map(token => ({
            symbol: token.symbol === "WBTC" ? "BTC" : 
                   token.symbol === "WETH" ? "ETH" :
                   token.symbol === "USDC" ? "USDT" :
                   token.symbol
        }));
        
        const tokensWithPrices = await getTokensWithPrices(priceSymbols);
        const newPrices = [];
        
        for (let i = 0; i < tokensWithPrices.length; i++) {
            if (tokensWithPrices[i].currentPrice) {
                newPrices.push(tokensWithPrices[i].currentPrice);
                const oldPriceFormatted = ethers.formatUnits(supportedTokens[i].currentPrice, 18);
                const newPriceFormatted = ethers.formatUnits(tokensWithPrices[i].currentPrice, 18);
                console.log(`   ${supportedTokens[i].symbol}: $${oldPriceFormatted} → $${newPriceFormatted}`);
            } else {
                // 가격 조회 실패 시 기존 가격 유지
                newPrices.push(supportedTokens[i].currentPrice);
                console.log(`   ${supportedTokens[i].symbol}: 가격 조회 실패, 기존 가격 유지`);
            }
        }

        // 2. 가격 업데이트 및 브로드캐스트 (한 번에 실행)
        console.log("\n🚀 토큰 가격 업데이트 및 Monad로 브로드캐스트 중...");
        
        const tx = await priceFeeder.updateAndBroadcast(tokenAddresses, newPrices);
        console.log("📝 트랜잭션 해시:", tx.hash);
        
        console.log("⏳ 트랜잭션 확인 대기 중...");
        const receipt = await tx.wait();
        
        console.log("✅ 트랜잭션 확인됨!");
        console.log(`   블록 번호: ${receipt.blockNumber}`);
        console.log(`   가스 사용량: ${receipt.gasUsed.toString()}`);

        // 이벤트 로그 분석
        console.log("\n📋 발생한 이벤트들:");
        for (const log of receipt.logs) {
            try {
                const parsedLog = priceFeeder.interface.parseLog(log);
                
                if (parsedLog.name === "TokenPriceUpdated") {
                    const oldPrice = ethers.formatUnits(parsedLog.args.oldPrice, 18);
                    const newPrice = ethers.formatUnits(parsedLog.args.newPrice, 18);
                    console.log(`   📈 가격 업데이트: ${parsedLog.args.tokenAddress}`);
                    console.log(`      $${oldPrice} → $${newPrice}`);
                    
                } else if (parsedLog.name === "PriceMessageSent") {
                    const fees = ethers.formatEther(parsedLog.args.fees);
                    console.log(`   📤 CCIP 메시지 전송됨:`);
                    console.log(`      대상 체인: ${parsedLog.args.chainSelector}`);
                    console.log(`      수신자: ${parsedLog.args.receiver}`);
                    console.log(`      토큰 개수: ${parsedLog.args.tokenCount}`);
                    console.log(`      수수료: ${fees} LINK`);
                }
            } catch (error) {
                // 파싱 실패한 로그는 무시
            }
        }

        // 전송 후 LINK 잔액 확인
        const remainingLink = await priceFeeder.getLinkBalance();
        const usedLink = linkBalance - remainingLink;
        console.log(`\n💰 LINK 사용량: ${ethers.formatEther(usedLink)} LINK`);
        console.log(`💰 남은 LINK: ${ethers.formatEther(remainingLink)} LINK`);

        console.log("\n🎉 크로스체인 데이터 브릿지가 성공적으로 완료되었습니다!");
        
        console.log("\n📋 전송된 데이터:");
        for (let i = 0; i < tokenAddresses.length; i++) {
            const priceUSD = ethers.formatUnits(newPrices[i], 18);
            console.log(`   ${supportedTokens[i].symbol}: $${Number(priceUSD).toLocaleString()}`);
        }
        
        console.log("\n🔍 Monad에서 확인 방법:");
        console.log("1. CrossChainRoundFactory에서 크로스체인 토큰 조회:");
        console.log("   const crossChainTokens = await factory.getCrossChainTokens()");
        console.log("2. 특정 토큰 가격 조회:");
        console.log("   const price = await factory.getTokenPrice(tokenAddress)");
        
        console.log("\n⚠️  참고사항:");
        console.log("- CCIP 메시지는 몇 분 정도 소요될 수 있습니다");
        console.log("- Monad에서 allowlistedSenders 설정이 필요합니다");
        console.log("- 전송된 토큰들은 Monad에서 라운드 생성에 사용 가능합니다");
        
    } catch (error) {
        console.error("❌ 브릿지 실행 중 오류 발생:", error);
        
        if (error.message.includes("Insufficient LINK balance")) {
            console.log("💡 해결책: PriceFeeder 컨트랙트에 LINK 토큰을 전송하세요");
        } else if (error.message.includes("Sender not allowlisted")) {
            console.log("💡 해결책: Monad의 CrossChainRoundFactory에서 이 주소를 allowlistSender에 추가하세요");
        } else if (error.message.includes("Chain not enabled")) {
            console.log("💡 해결책: Monad 체인 selector 설정을 확인하세요");
        }
        
        process.exitCode = 1;
    }
}

// 스크립트 실행
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});