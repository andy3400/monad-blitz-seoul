const axios = require('axios');
const { ethers } = require('hardhat');

// Binance API 베이스 URL
const BINANCE_API_BASE = 'https://api.binance.com/api/v3';

/**
 * Binance API에서 단일 토큰 가격 조회
 * @param {string} symbol - 토큰 심볼 (예: BTC, ETH, SOL)
 * @returns {Promise<string>} - Wei 단위로 변환된 가격 (18자리 소수점)
 */
async function getTokenPrice(symbol) {
    try {
        const response = await axios.get(`${BINANCE_API_BASE}/ticker/price?symbol=${symbol}USDT`);
        const priceUSD = parseFloat(response.data.price);
        
        // USD 가격을 wei 단위로 변환 (18자리 소수점)
        // 예: $65000 -> 65000 * 10^18 wei
        const priceWei = ethers.parseUnits(priceUSD.toFixed(8), 18);
        
        console.log(`${symbol} 가격: $${priceUSD.toLocaleString()} (${priceWei.toString()} wei)`);
        return priceWei;
        
    } catch (error) {
        console.error(`${symbol} 가격 조회 실패:`, error.message);
        throw new Error(`Failed to fetch ${symbol} price from Binance API`);
    }
}

/**
 * 여러 토큰의 가격을 한 번에 조회
 * @param {Array<string>} symbols - 토큰 심볼 배열 (예: ['BTC', 'ETH', 'SOL'])
 * @returns {Promise<Object>} - 심볼을 키로 하고 wei 가격을 값으로 하는 객체
 */
async function getMultipleTokenPrices(symbols) {
    console.log(`📊 ${symbols.join(', ')} 토큰들의 현재 가격을 조회 중...`);
    
    const prices = {};
    
    try {
        // 모든 가격을 병렬로 조회
        const pricePromises = symbols.map(async (symbol) => {
            const price = await getTokenPrice(symbol);
            return { symbol, price };
        });
        
        const results = await Promise.all(pricePromises);
        
        // 결과를 객체로 변환
        results.forEach(({ symbol, price }) => {
            prices[symbol] = price;
        });
        
        console.log('✅ 모든 토큰 가격 조회 완료');
        return prices;
        
    } catch (error) {
        console.error('❌ 토큰 가격 조회 중 오류 발생:', error.message);
        throw error;
    }
}

/**
 * 토큰 정보와 현재 가격을 함께 반환
 * @param {Array<Object>} tokens - 토큰 정보 배열 [{symbol, name, address}, ...]
 * @returns {Promise<Array<Object>>} - 가격 정보가 추가된 토큰 배열
 */
async function getTokensWithPrices(tokens) {
    const symbols = tokens.map(token => token.symbol);
    const prices = await getMultipleTokenPrices(symbols);
    
    return tokens.map(token => ({
        ...token,
        currentPrice: prices[token.symbol]
    }));
}

/**
 * 특정 토큰들의 현재 가격으로 TokenPrice 구조체 배열 생성
 * @param {Array<Object>} tokens - 토큰 정보 배열 [{symbol, address}, ...]
 * @returns {Promise<Array<Object>>} - Solidity TokenPrice 구조체 형식 배열
 */
async function createTokenPriceArray(tokens) {
    const prices = await getMultipleTokenPrices(tokens.map(t => t.symbol));
    
    return tokens.map(token => ({
        tokenAddress: token.address,
        currentPrice: prices[token.symbol]
    }));
}

/**
 * 가격 변화율 계산
 * @param {string} initialPrice - 초기 가격 (wei)
 * @param {string} currentPrice - 현재 가격 (wei)
 * @returns {number} - 변화율 (퍼센트, 소수점 4자리)
 */
function calculatePriceChangePercentage(initialPrice, currentPrice) {
    const initial = ethers.getBigInt(initialPrice);
    const current = ethers.getBigInt(currentPrice);
    
    if (initial === 0n) return 0;
    
    const change = current - initial;
    const percentage = (change * 10000n) / initial; // 0.01% = 1
    
    return Number(percentage) / 100; // 퍼센트로 변환
}

module.exports = {
    getTokenPrice,
    getMultipleTokenPrices,
    getTokensWithPrices,
    createTokenPriceArray,
    calculatePriceChangePercentage
};