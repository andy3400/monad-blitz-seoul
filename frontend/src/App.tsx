import React, {useEffect, useMemo, useState} from 'react'
import {ConnectButton} from '@rainbow-me/rainbowkit'
import {useAccount} from 'wagmi'
import {formatEther} from 'viem'
import {useRoundFactory} from './hooks/useRoundFactory'
import {useRound} from './hooks/useRound'
import BettingModal from './components/BettingModal'
import CountdownTimer from './components/CountdownTimer'
import {CONTRACT_ADDRESSES, type TokenInfo} from './config/contracts'

function App() {
  const { address, isConnected } = useAccount()
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null)
  const [isBettingModalOpen, setIsBettingModalOpen] = useState(false)

  // Factory 데이터 - 항상 호출
  const { supportedTokens, currentRoundInfo, currentActiveRound, isLoading: factoryLoading } = useRoundFactory()

  // Round 데이터 - 항상 호출 (조건은 hook 내부에서 처리)
  const { registeredTokens, roundStats, timeInfo, tokenBetAmounts, userBets } = useRound(currentActiveRound)

  // 토큰 데이터 매칭 - 항상 호출
  const gameTokens = useMemo(() => {
    if (!supportedTokens || !registeredTokens || !tokenBetAmounts) return []

    return registeredTokens.map(tokenAddress => {
      const supportedToken = supportedTokens.find(token => 
        token.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
      )
      
      const tokenIndex = tokenBetAmounts[0].findIndex(addr => 
        addr.toLowerCase() === tokenAddress.toLowerCase()
      )
      
      const totalBets = tokenIndex >= 0 ? tokenBetAmounts[1][tokenIndex] : BigInt(0)

      return {
        address: tokenAddress,
        symbol: supportedToken?.symbol || 'UNKNOWN',
        name: supportedToken?.name || 'Unknown Token',
        logo: supportedToken?.symbol?.[0] || '?',
        color: 'blue' as const,
        initialPrice: Number(supportedToken?.currentPrice || 0) / 1e18,
        totalBets: formatEther(totalBets)
      }
    })
  }, [supportedTokens, registeredTokens, tokenBetAmounts])

  // 사용자 베팅 데이터 - 항상 호출
  const userBetMap = useMemo(() => {
    if (!userBets) return {}
    
    const betMap: Record<string, string> = {}
    userBets[0].forEach((tokenAddress, index) => {
      if (userBets[1][index] > 0) {
        betMap[tokenAddress.toLowerCase()] = formatEther(userBets[1][index])
      }
    })
    return betMap
  }, [userBets])

  // 라운드 정보 - 항상 호출
  const roundData = useMemo(() => {
    if (!roundStats || !timeInfo || !currentRoundInfo) return null

    return {
      roundName: roundStats[0],
      isActive: roundStats[1],
      isFinalized: roundStats[2],
      startTime: Number(timeInfo[0]),
      endTime: Number(timeInfo[1]),
      totalPool: formatEther(roundStats[4]),
      participantCount: Object.keys(userBetMap).length,
      winnerToken: roundStats[5] !== '0x0000000000000000000000000000000000000000' ? 
        gameTokens.find(token => token.address.toLowerCase() === roundStats[5].toLowerCase())?.symbol : 
        undefined
    }
  }, [roundStats, timeInfo, currentRoundInfo, gameTokens, userBetMap])

  // 그리드 토큰 - 항상 호출 (3x3 그리드, 중앙부터 배치)
  const gridTokens = useMemo(() => {
    const slots = Array(9).fill(null)
    // 3x3 그리드에서 중앙부터 배치하는 순서: [4, 1, 3, 5, 7, 0, 2, 6, 8]
    const centerFirstOrder = [4, 1, 3, 5, 7, 0, 2, 6, 8]
    
    gameTokens.forEach((token, index) => {
      if (index < centerFirstOrder.length) {
        slots[centerFirstOrder[index]] = token
      }
    })
    return slots
  }, [gameTokens])

  useEffect(() => {
    const createParticles = () => {
      const container = document.querySelector('.floating-particles')
      if (!container || container.children.length > 0) return
      
      for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div')
        particle.className = 'particle'
        particle.style.left = Math.random() * 100 + '%'
        particle.style.animationDelay = Math.random() * 6 + 's'
        particle.style.animationDuration = (Math.random() * 3 + 6) + 's'
        container.appendChild(particle)
      }
    }
    
    createParticles()
  }, [])

  // 컨트랙트 주소가 설정되지 않은 경우
  if (!CONTRACT_ADDRESSES.ROUND_FACTORY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="glass-card p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">컨트랙트 주소가 필요합니다</h2>
          <p className="text-white/70">
            RoundFactory 컨트랙트가 배포된 후 VITE_ROUND_FACTORY_ADDRESS를 .env에 설정해주세요.
          </p>
        </div>
      </div>
    )
  }

  // 로딩 중
  if (factoryLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="glass-card p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/70">블록체인에서 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 현재 활성 라운드가 없는 경우
  if (!currentActiveRound || currentActiveRound === '0x0000000000000000000000000000000000000000') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="floating-particles"></div>
        
        <nav className="relative z-10 p-6">
          <div className="glass-card max-w-7xl mx-auto">
            <div className="flex justify-between items-center p-4">
              <h1 className="text-3xl font-bold gradient-text">Monad Blitz</h1>
              <ConnectButton />
            </div>
          </div>
        </nav>

        <main className="relative z-10 flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="logo-container mb-8">
              {/* 3x3 그리드로 9개 타일 */}
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="tile opacity-30"></div>
              ))}
            </div>
            <h2 className="text-4xl font-bold gradient-text mb-4">
              다음 라운드를 기다리는 중...
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              현재 진행 중인 라운드가 없습니다. 새로운 라운드가 시작될 때까지 기다려주세요.
            </p>
          </div>
        </main>
      </div>
    )
  }


  const handleTokenClick = (token: TokenInfo | null) => {
    if (!token || roundData?.isFinalized || !isConnected) return
    setSelectedToken(token)
    setIsBettingModalOpen(true)
  }

  const handleBet = (amount: string) => {
    // TODO: 실제 베팅 트랜잭션 구현
    console.log('Betting', amount, 'ETH on', selectedToken?.symbol)
  }

  if (!roundData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="glass-card p-8 text-center">
          <p className="text-white/70">라운드 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      <div className="floating-particles"></div>
      
      {/* Header */}
      <nav className="relative z-10 p-6">
        <div className="glass-card max-w-7xl mx-auto">
          <div className="flex justify-between items-center p-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold gradient-text">Monad Blitz</h1>
              <span className="text-sm text-purple-300 bg-purple-900/30 px-3 py-1 rounded-full">
                {roundData.roundName}
              </span>
            </div>
            <ConnectButton />
          </div>
        </div>
      </nav>

      {/* Main Game Area */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-140px)] px-6">
        {/* Round Info */}
        <div className="mb-8 glass-card p-6 text-center">
          <div className="flex items-center justify-center space-x-8">
            <div>
              <div className="text-sm text-white/60">총 상금 풀</div>
              <div className="text-2xl font-bold text-green-400">
                {parseFloat(roundData.totalPool).toFixed(4)} ETH
              </div>
            </div>
            <div>
              <div className="text-sm text-white/60">남은 시간</div>
              <CountdownTimer 
                endTime={roundData.endTime}
                isFinalized={roundData.isFinalized}
              />
            </div>
            <div>
              <div className="text-sm text-white/60">참여 토큰</div>
              <div className="text-2xl font-bold text-purple-400">
                {gameTokens.length}
              </div>
            </div>
          </div>
        </div>

        {/* Token Grid */}
        <div className="logo-container mb-8">
          {gridTokens.map((token, index) => (
            <div
              key={index}
              className={`tile ${
                token 
                  ? 'cursor-pointer hover:scale-110 transition-transform duration-300' 
                  : 'opacity-20'
              } ${
                token && userBetMap[token.address.toLowerCase()] 
                  ? 'border-purple-400 bg-purple-500/30 shadow-purple-500/50' 
                  : ''
              } ${
                roundData.winnerToken && token?.symbol === roundData.winnerToken
                  ? 'winner'
                  : ''
              }`}
              onClick={() => handleTokenClick(token)}
            >
              {token && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <div className="text-2xl font-bold mb-1">{token.logo}</div>
                  <div className="text-xs">{token.symbol}</div>
                  {userBetMap[token.address.toLowerCase()] && (
                    <div className="text-xs text-purple-300 mt-1">
                      {parseFloat(userBetMap[token.address.toLowerCase()]).toFixed(3)}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="text-center max-w-2xl">
          {!isConnected ? (
            <p className="text-white/70 text-lg">
              지갑을 연결하고 토큰을 클릭하여 베팅하세요
            </p>
          ) : roundData.isFinalized ? (
            <div className="glass-card p-6">
              <h3 className="text-xl font-bold text-green-400 mb-2">
                🎉 라운드 종료!
              </h3>
              {roundData.winnerToken ? (
                <p className="text-white/70">
                  <span className="text-green-400 font-bold">{roundData.winnerToken}</span>
                  이 승리했습니다! 승자들에게 상금이 자동 분배되었습니다.
                </p>
              ) : (
                <p className="text-white/70">승리 토큰을 확인하는 중...</p>
              )}
            </div>
          ) : (
            <p className="text-white/70 text-lg">
              가장 높은 상승률을 기록할 것 같은 토큰을 클릭하여 베팅하세요
            </p>
          )}
        </div>
      </main>

      {/* Betting Modal */}
      <BettingModal
        isOpen={isBettingModalOpen}
        onClose={() => setIsBettingModalOpen(false)}
        token={selectedToken}
        onBet={handleBet}
        userCurrentBet={selectedToken ? userBetMap[selectedToken.address.toLowerCase()] : undefined}
      />
    </div>
  )
}

export default App