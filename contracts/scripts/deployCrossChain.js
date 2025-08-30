const { ethers } = require("hardhat");
const { getTokensWithPrices } = require("./priceUtils");

async function main() {
    console.log("CrossChain RoundFactory 컨트랙트 배포를 시작합니다...");
    console.log("(Monad Testnet - CCIP 메시지 수신 전용)");

    // 배포할 계정 확인
    const [deployer] = await ethers.getSigners();
    console.log("배포 계정:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("계정 잔액:", ethers.formatEther(balance), "ETH");

    try {
        // CrossChainRoundFactory 컨트랙트 배포
        console.log("\n📄 CrossChainRoundFactory 컨트랙트 배포 중...");
        const CrossChainRoundFactory = await ethers.getContractFactory("CrossChainRoundFactory");
        const crossChainFactory = await CrossChainRoundFactory.deploy(deployer.address);
        
        await crossChainFactory.waitForDeployment();
        const factoryAddress = await crossChainFactory.getAddress();
        
        console.log("✅ CrossChainRoundFactory 배포 완료!");
        console.log(`   주소: ${factoryAddress}`);
        console.log(`   Owner 주소: ${deployer.address}`);
        console.log(`   역할: CCIP 메시지 수신자`);

        // 기본 토큰들 정의 (실제 토큰 주소를 환경변수에서 가져옴)
        console.log("\n🪙 기본 토큰 추가 중...");

        const defaultTokens = [
            {
                address: process.env.TOKEN_BTC_ADDRESS || "0x0000000000000000000000000000000000000001",
                symbol: "BTC",
                name: "Bitcoin"
            },
            {
                address: process.env.TOKEN_ETH_ADDRESS || "0x0000000000000000000000000000000000000002",
                symbol: "ETH",
                name: "Ethereum"
            },
            {
                address: process.env.TOKEN_SOL_ADDRESS || "0x0000000000000000000000000000000000000003",
                symbol: "SOL",
                name: "Solana"
            },
            {
                address: process.env.TOKEN_DOGE_ADDRESS || "0x0000000000000000000000000000000000000004",
                symbol: "DOGE",
                name: "DogeCoin"
            },
            {
                address: process.env.TOKEN_PEPE_ADDRESS || "0x0000000000000000000000000000000000000005",
                symbol: "PEPE",
                name: "Pepe"
            },
            {
                address: process.env.TOKEN_LINK_ADDRESS || "0x0000000000000000000000000000000000000006",
                symbol: "LINK",
                name: "ChainLink"
            }
        ];

        // Binance API에서 현재 가격을 가져와서 토큰 등록
        console.log("📊 Binance API에서 현재 토큰 가격 조회 중...");
        const tokensWithPrices = await getTokensWithPrices(defaultTokens);

        for (const token of tokensWithPrices) {
            if (token.currentPrice) {
                await crossChainFactory.addSupportedToken(
                    token.address,
                    token.symbol,
                    token.name,
                    token.currentPrice
                );

                const priceUSD = ethers.formatUnits(token.currentPrice, 18);
                console.log(`   ✓ ${token.symbol} (${token.name}) 추가됨`);
                console.log(`     주소: ${token.address}`);
                console.log(`     현재 가격: $${Number(priceUSD).toLocaleString()}`);
            } else {
                console.log(`   ⚠️  ${token.symbol} 가격 조회 실패 - 토큰 등록 건너뜀`);
            }
        }

        // 배포 정보를 JSON 파일로 저장
        const deploymentInfo = {
            network: hre.network.name,
            deployer: deployer.address,
            role: "CCIP Message Receiver",
            contracts: {
                CrossChainRoundFactory: {
                    address: factoryAddress,
                    owner: deployer.address,
                    ccipRouter: "0x5f16e51e3Dcb255480F090157DD01bA962a53E54",
                    monadSelector: "2183018362218727504",
                    ethSepoliaSelector: "16015286601757825753"
                }
            },
            localTokens: [],
            crossChainTokens: [], // CCIP 메시지로 수신될 예정
            timestamp: new Date().toISOString(),
            blockNumber: await ethers.provider.getBlockNumber()
        };

        const fs = require('fs');
        const path = require('path');
        
        const deploymentDir = path.join(__dirname, '../deployments');
        if (!fs.existsSync(deploymentDir)) {
            fs.mkdirSync(deploymentDir, { recursive: true });
        }
        
        const filename = `crosschain_${hre.network.name}_${Date.now()}.json`;
        fs.writeFileSync(
            path.join(deploymentDir, filename),
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log(`\n📄 배포 정보가 저장되었습니다: deployments/${filename}`);

        // 컨트랙트 검증을 위한 정보 출력
        console.log("\n🔍 컨트랙트 검증 정보:");
        console.log(`npx hardhat verify --network ${hre.network.name} ${factoryAddress} ${deployer.address}`);

        console.log("\n🎉 CrossChain RoundFactory 배포가 성공적으로 완료되었습니다!");
        
        console.log("\n📋 다음 단계:");
        console.log("1. 다른 체인(Ethereum Sepolia 등)에서 이 컨트랙트로 CCIP 메시지 전송");
        console.log("2. allowlistSender() 함수로 메시지 송신자 주소 허용");
        console.log("3. 크로스체인 토큰 가격은 CCIP 메시지를 통해 자동 업데이트됨");
        
        console.log("\n💡 CCIP 설정 정보:");
        console.log(`   CCIP Router: 0x5f16e51e3Dcb255480F090157DD01bA962a53E54`);
        console.log(`   Monad Testnet Selector: 2183018362218727504`);
        console.log(`   ETH Sepolia Selector: 16015286601757825753`);

        console.log("\n📨 예상 CCIP 메시지 형식:");
        console.log(`   [{tokenAddress: "0x...", newPrice: "1000000000000000000000"}]`);
        
        console.log("\n🔍 크로스체인 토큰 조회 방법:");
        console.log(`   await factory.getCrossChainTokens()`);
        console.log(`   await factory.getTokenPrice(tokenAddress)`);
        
        console.log("\n⚠️  주의사항:");
        console.log("- CCIP 메시지 수신 시 가스비는 메시지 송신자가 지불");
        console.log("- allowlistedSenders와 allowlistedSourceChains 설정 필수");
        console.log("- 크로스체인 토큰은 로컬 토큰과 함께 라운드에서 사용 가능");
        
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