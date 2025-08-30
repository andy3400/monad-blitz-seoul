const { ethers } = require("hardhat");
const { getTokensWithPrices } = require("./priceUtils");

async function main() {
    console.log("CrossChain PriceFeeder 컨트랙트 배포를 시작합니다...");
    console.log("(Ethereum Sepolia - CCIP 메시지 송신 전용)");

    // 배포할 계정 확인
    const [deployer] = await ethers.getSigners();
    console.log("배포 계정:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("계정 잔액:", ethers.formatEther(balance), "ETH");

    try {
        // CrossChainPriceFeeder 컨트랙트 배포
        console.log("\n📄 CrossChainPriceFeeder 컨트랙트 배포 중...");
        const CrossChainPriceFeeder = await ethers.getContractFactory("CrossChainPriceFeeder");
        const priceFeeder = await CrossChainPriceFeeder.deploy();
        
        await priceFeeder.waitForDeployment();
        const feederAddress = await priceFeeder.getAddress();
        
        console.log("✅ CrossChainPriceFeeder 배포 완료!");
        console.log(`   주소: ${feederAddress}`);
        console.log(`   Owner 주소: ${deployer.address}`);
        console.log(`   역할: CCIP 메시지 송신자 (Sepolia → Monad)`);

        // Monad Testnet을 대상 체인으로 설정 (기본값으로 이미 설정됨)
        console.log("\n🔗 대상 체인 설정 중...");
        
        // 나중에 설정할 Monad의 CrossChainRoundFactory 주소 (배포 후 설정 필요)
        const MONAD_FACTORY_ADDRESS = process.env.MONAD_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000";
        
        if (MONAD_FACTORY_ADDRESS !== "0x0000000000000000000000000000000000000000") {
            await priceFeeder.setDestinationContract(
                "2183018362218727504", // Monad Testnet Selector
                MONAD_FACTORY_ADDRESS,
                true
            );
            console.log(`   ✓ Monad Testnet 대상 설정: ${MONAD_FACTORY_ADDRESS}`);
        } else {
            console.log("   ⚠️  MONAD_FACTORY_ADDRESS가 설정되지 않음. 나중에 수동 설정 필요");
        }

        const localTokens = [
            {
                address: process.env.TOKEN_LOCAL_BTC_ADDRESS || "0x0000000000000000000000000000000000000011",
                symbol: "WBTC",
                name: "Wrapped Bitcoin"
            }
        ];

        // Binance API에서 현재 가격을 가져와서 로컬 토큰 등록
        console.log("📊 Binance API에서 현재 토큰 가격 조회 중...");

        // 로컬 토큰용 심볼 매핑 (Binance API에서는 실제 심볼 사용)
        const priceSymbols = localTokens.map(token => ({
            ...token,
            symbol: token.symbol.replace('l', '') // lBTC -> BTC
        }));

        const tokensWithPrices = await getTokensWithPrices(priceSymbols);

        for (let i = 0; i < localTokens.length; i++) {
            const mainToken = localTokens[i];
            const priceToken = tokensWithPrices[i];
            
            if (priceToken.currentPrice) {
                await priceFeeder.addToken(
                    mainToken.address, 
                    mainToken.symbol, 
                    mainToken.name, 
                    priceToken.currentPrice
                );
                
                const priceUSD = ethers.formatUnits(priceToken.currentPrice, 18);
                console.log(`   ✓ ${mainToken.symbol} (${mainToken.name}) 추가됨`);
                console.log(`     주소: ${mainToken.address}`);
                console.log(`     현재 가격: $${Number(priceUSD).toLocaleString()}`);
            } else {
                console.log(`   ⚠️  ${mainToken.symbol} 가격 조회 실패 - 토큰 등록 건너뜀`);
            }
        }

        // 배포 정보를 JSON 파일로 저장
        const deploymentInfo = {
            network: hre.network.name,
            deployer: deployer.address,
            role: "CCIP Message Sender",
            contracts: {
                CrossChainPriceFeeder: {
                    address: feederAddress,
                    owner: deployer.address,
                    ccipRouter: "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59",
                    linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
                    sepoliaSelector: "16015286601757825753",
                    monadSelector: "2183018362218727504"
                }
            },
            supportedTokens: tokensWithPrices.map((token, i) => ({
                address: localTokens[i].address,
                symbol: localTokens[i].symbol,
                name: localTokens[i].name,
                initialPrice: token.currentPrice ? token.currentPrice.toString() : null,
                priceUSD: token.currentPrice ? ethers.formatUnits(token.currentPrice, 18) : null
            })),
            destinationChains: [
                {
                    chainSelector: "2183018362218727504",
                    chainName: "Monad Testnet",
                    contractAddress: MONAD_FACTORY_ADDRESS,
                    enabled: MONAD_FACTORY_ADDRESS !== "0x0000000000000000000000000000000000000000"
                }
            ],
            timestamp: new Date().toISOString(),
            blockNumber: await ethers.provider.getBlockNumber()
        };

        const fs = require('fs');
        const path = require('path');
        
        const deploymentDir = path.join(__dirname, '../deployments');
        if (!fs.existsSync(deploymentDir)) {
            fs.mkdirSync(deploymentDir, { recursive: true });
        }
        
        const filename = `pricefeeder_${hre.network.name}_${Date.now()}.json`;
        fs.writeFileSync(
            path.join(deploymentDir, filename),
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log(`\n📄 배포 정보가 저장되었습니다: deployments/${filename}`);

        // 컨트랙트 검증을 위한 정보 출력
        console.log("\n🔍 컨트랙트 검증 정보:");
        console.log(`npx hardhat verify --network ${hre.network.name} ${feederAddress}`);

        console.log("\n🎉 CrossChain PriceFeeder 배포가 성공적으로 완료되었습니다!");
        
        console.log("\n📋 다음 단계:");
        console.log("1. LINK 토큰을 이 컨트랙트에 전송 (CCIP 수수료 지불용)");
        console.log("2. Monad의 CrossChainRoundFactory 주소 설정:");
        console.log(`   await priceFeeder.setDestinationContract("2183018362218727504", monadFactoryAddress, true)`);
        console.log("3. 토큰 가격 업데이트 및 크로스체인 전송:");
        console.log(`   await priceFeeder.updateAndBroadcast([tokenAddress], [newPrice])`);
        
        console.log("\n💡 CCIP 메시지 전송 예시:");
        console.log(`   // 단일 토큰 전송`);
        console.log(`   await priceFeeder.sendPricesToChain("2183018362218727504", [wbtcAddress])`);
        console.log(`   // 모든 토큰 브로드캐스트`);
        console.log(`   await priceFeeder.broadcastPrices([wbtcAddress, wethAddress])`);
        
        console.log("\n🔍 컨트랙트 상태 조회:");
        console.log(`   const tokens = await priceFeeder.getAllTokens()`);
        console.log(`   const linkBalance = await priceFeeder.getLinkBalance()`);
        console.log(`   const fees = await priceFeeder.estimateFees("2183018362218727504", tokenAddresses)`);
        
        console.log("\n⚠️  주의사항:");
        console.log("- CCIP 메시지 전송 비용은 LINK 토큰으로 지불");
        console.log("- 대상 체인(Monad)에서 이 주소를 allowlistedSenders에 추가 필요");
        console.log("- 토큰 주소는 실제 Ethereum 토큰 컨트랙트 주소 사용");
        console.log("- 가격은 18자리 소수점으로 저장 (wei 단위)");
        
        console.log("\n💰 LINK 토큰 관리:");
        console.log("- LINK 잔액 조회: await priceFeeder.getLinkBalance()");
        console.log("- LINK 출금: await priceFeeder.withdrawLink(amount)");
        console.log("- Sepolia LINK 토큰: 0x779877A7B0D9E8603169DdbD7836e478b4624789");
        
    } catch (error) {
        console.error("❌ 배포 중 오류 발생:", error);
        process.exitCode = 1;
    }
}

// 스크립트 실행
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});