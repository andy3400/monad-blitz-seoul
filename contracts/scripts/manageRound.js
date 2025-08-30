const { ethers } = require("hardhat");
const { createTokenPriceArray, getMultipleTokenPrices } = require("./priceUtils");

async function main() {
    // 명령어 인수 파싱
    const args = process.argv.slice(2);
    const command = args[0];
    
    if (!command) {
        console.log("사용법:");
        console.log("npm run round:create <factory_address> <round_name> <duration_seconds> <token_symbols>");
        console.log("npm run round:finalize <factory_address> <round_address> <token_symbols>");
        console.log("npm run round:status <factory_address>");
        return;
    }

    const [deployer] = await ethers.getSigners();
    console.log("실행 계정:", deployer.address);

    try {
        switch (command) {
            case 'create':
                await createRound(args.slice(1));
                break;
            case 'finalize':
                await finalizeRound(args.slice(1));
                break;
            case 'status':
                await getRoundStatus(args.slice(1));
                break;
            default:
                console.error("알 수 없는 명령어:", command);
        }
    } catch (error) {
        console.error("❌ 오류 발생:", error.message);
        process.exitCode = 1;
    }
}

/**
 * 새로운 라운드 생성
 * @param {Array} args - [factory_address, round_name, duration_seconds, token_symbols...]
 */
async function createRound(args) {
    const [factoryAddress, roundName, durationStr, ...tokenSymbols] = args;
    
    if (!factoryAddress || !roundName || !durationStr || tokenSymbols.length === 0) {
        console.error("사용법: create <factory_address> <round_name> <duration_seconds> <token_symbols>");
        console.error("예시: create 0x123... 'Morning Battle' 3600 BTC ETH SOL");
        return;
    }

    const duration = parseInt(durationStr);
    console.log(`🚀 라운드 생성 중...`);
    console.log(`   팩토리 주소: ${factoryAddress}`);
    console.log(`   라운드 이름: ${roundName}`);
    console.log(`   지속 시간: ${duration}초 (${Math.round(duration / 60)}분)`);
    console.log(`   참여 토큰: ${tokenSymbols.join(', ')}`);

    const RoundFactory = await ethers.getContractFactory("RoundFactory");
    const factory = RoundFactory.attach(factoryAddress);

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
}

/**
 * 라운드 종료 및 정산
 * @param {Array} args - [factory_address, round_address, token_symbols...]
 */
async function finalizeRound(args) {
    const [factoryAddress, roundAddress, ...tokenSymbols] = args;
    
    if (!factoryAddress || !roundAddress || tokenSymbols.length === 0) {
        console.error("사용법: finalize <factory_address> <round_address> <token_symbols>");
        console.error("예시: finalize 0x123... 0x456... BTC ETH SOL");
        return;
    }

    console.log(`🏁 라운드 종료 및 정산 중...`);
    console.log(`   팩토리 주소: ${factoryAddress}`);
    console.log(`   라운드 주소: ${roundAddress}`);
    console.log(`   토큰들: ${tokenSymbols.join(', ')}`);

    const RoundFactory = await ethers.getContractFactory("RoundFactory");
    const factory = RoundFactory.attach(factoryAddress);

    const Round = await ethers.getContractFactory("Round");
    const round = Round.attach(roundAddress);

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
    const tx = await factory.finalizeRound(roundAddress, currentPrices);
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
}

/**
 * 현재 라운드 상태 조회
 * @param {Array} args - [factory_address]
 */
async function getRoundStatus(args) {
    const [factoryAddress] = args;
    
    if (!factoryAddress) {
        console.error("사용법: status <factory_address>");
        return;
    }

    console.log("🔍 라운드 상태 조회 중...");
    
    const RoundFactory = await ethers.getContractFactory("RoundFactory");
    const factory = RoundFactory.attach(factoryAddress);

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
}

// 스크립트 실행
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});