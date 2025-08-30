const { ethers } = require("hardhat");

// 주어진 데이터
const roundAddress = "0x16BDb86E307E67b8303AfDC3ce1bf2Fe6bCDFf48";

const tokenAddresses = [
    "0x0000000000000000000000000000000000000001",
    "0x0000000000000000000000000000000000000002", 
    "0x0000000000000000000000000000000000000003",
    "0x0000000000000000000000000000000000000004",
    "0x0000000000000000000000000000000000000005"
];

const prices = [
    "111210000000000000000000",  // $111,210
    "4397320000000000000000",    // $4,397.32
    "205750000000000000000",     // $205.75
    "216750000000000000",        // $0.21675
    "9960000000000"              // $0.00000996
];

async function generateFinalizeParams() {
    console.log("🎯 finalizeRound 함수 파라미터 생성");
    console.log("=".repeat(50));
    
    // Round.TokenPrice[] 구조체 배열 생성
    const currentPrices = [];
    
    for (let i = 0; i < tokenAddresses.length; i++) {
        const tokenPrice = {
            tokenAddress: tokenAddresses[i],
            currentPrice: prices[i]
        };
        currentPrices.push(tokenPrice);
        
        // 가격을 USD로 변환하여 표시
        const priceUSD = ethers.formatUnits(prices[i], 18);
        console.log(`Token ${i + 1}: ${tokenAddresses[i]}`);
        console.log(`   Price: ${prices[i]} wei = $${Number(priceUSD).toLocaleString()}`);
    }
    
    console.log("\n📝 Hardhat 스크립트용 파라미터:");
    console.log("=".repeat(50));
    
    console.log(`const roundAddress = "${roundAddress}";`);
    console.log(`const currentPrices = [`);
    
    for (let i = 0; i < currentPrices.length; i++) {
        const comma = i < currentPrices.length - 1 ? "," : "";
        console.log(`    { tokenAddress: "${currentPrices[i].tokenAddress}", currentPrice: "${currentPrices[i].currentPrice}" }${comma}`);
    }
    console.log(`];`);
    
    console.log("\n🔨 함수 호출 예시:");
    console.log("=".repeat(50));
    console.log(`await crossChainFactory.finalizeRound(roundAddress, currentPrices);`);
    
    console.log("\n📊 ABI 인코딩된 데이터:");
    console.log("=".repeat(50));
    
    // ABI 인코딩
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encodedPrices = abiCoder.encode(
        ["tuple(address,uint256)[]"], 
        [currentPrices.map(tp => [tp.tokenAddress, tp.currentPrice])]
    );
    
    console.log("Encoded currentPrices:", encodedPrices);
    
    console.log("\n💡 Ethers.js 함수 호출:");
    console.log("=".repeat(50));
    console.log(`const tx = await crossChainFactory.finalizeRound(`);
    console.log(`    "${roundAddress}",`);
    console.log(`    [`);
    for (let i = 0; i < currentPrices.length; i++) {
        const comma = i < currentPrices.length - 1 ? "," : "";
        console.log(`        ["${currentPrices[i].tokenAddress}", "${currentPrices[i].currentPrice}"]${comma}`);
    }
    console.log(`    ]`);
    console.log(`);`);
    
    console.log("\n🌐 Web3 호출 (Raw Data):");
    console.log("=".repeat(50));
    console.log(`Method: finalizeRound`);
    console.log(`Param 1 (address): ${roundAddress}`);
    console.log(`Param 2 (TokenPrice[]): `);
    
    for (let i = 0; i < currentPrices.length; i++) {
        console.log(`  [${i}] tokenAddress: ${currentPrices[i].tokenAddress}`);
        console.log(`  [${i}] currentPrice: ${currentPrices[i].currentPrice}`);
    }
    
    console.log("\n✅ 파라미터 생성 완료!");
}

// 스크립트 실행
generateFinalizeParams().catch((error) => {
    console.error("❌ 오류 발생:", error);
});