const { ethers } = require("hardhat");

async function main() {
    console.log("컨트랙트 배포를 시작합니다...");

    // 배포할 계정 확인
    const [deployer] = await ethers.getSigners();
    console.log("배포 계정:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("계정 잔액:", ethers.formatEther(balance), "ETH");

    try {
        // RoundFactory 컨트랙트 배포
        console.log("\n📄 RoundFactory 컨트랙트 배포 중...");
        const RoundFactory = await ethers.getContractFactory("RoundFactory");
        const roundFactory = await RoundFactory.deploy(deployer.address);

        await roundFactory.waitForDeployment();
        const factoryAddress = await roundFactory.getAddress();

        console.log("✅ RoundFactory 배포 완료!");
        console.log("   주소:", factoryAddress);
        console.log("   Owner 주소:", deployer.address);

        // 기본 토큰들을 추가 (예시)
        console.log("\n🪙 기본 토큰 추가 중...");

        // 예시 토큰들 - 실제 배포시에는 실제 토큰 주소로 변경 필요
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
            }
            ,
            {
                address: process.env.TOKEN_PEPE_ADDRESS || "0x0000000000000000000000000000000000000005",
                symbol: "PEPE",
                name: "Pepe"
            }
        ];

        for (const token of defaultTokens) {
            await roundFactory.addSupportedToken(token.address, token.symbol, token.name);
            console.log(`   ✓ ${token.symbol} (${token.name}) 추가됨: ${token.address}`);
        }

        // 배포 정보를 JSON 파일로 저장
        const deploymentInfo = {
            network: hre.network.name,
            deployer: deployer.address,
            contracts: {
                RoundFactory: {
                    address: factoryAddress,
                    owner: deployer.address
                }
            },
            supportedTokens: defaultTokens,
            timestamp: new Date().toISOString(),
            blockNumber: await ethers.provider.getBlockNumber()
        };

        const fs = require('fs');
        const path = require('path');

        const deploymentDir = path.join(__dirname, '../deployments');
        if (!fs.existsSync(deploymentDir)) {
            fs.mkdirSync(deploymentDir, { recursive: true });
        }

        const filename = `${hre.network.name}_${Date.now()}.json`;
        fs.writeFileSync(
            path.join(deploymentDir, filename),
            JSON.stringify(deploymentInfo, null, 2)
        );

        console.log(`\n📄 배포 정보가 저장되었습니다: deployments/${filename}`);

        // 컨트랙트 검증을 위한 정보 출력
        console.log("\n🔍 컨트랙트 검증 정보:");
        console.log("npx hardhat verify --network", hre.network.name, factoryAddress, deployer.address);

        console.log("\n🎉 배포가 성공적으로 완료되었습니다!");
        console.log("\n📋 다음 단계:");
        console.log("1. .env 파일에 실제 토큰 주소들을 설정하세요");
        console.log("2. addSupportedToken 함수를 통해 추가 토큰들을 등록하세요");
        console.log("3. createRound 함수로 새로운 라운드를 생성하세요");

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