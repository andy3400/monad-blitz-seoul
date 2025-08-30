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
      <div className="min-h-screen flex items-center justify-center overflow-hidden relative">
        <div className="floating-particles"></div>
        <div className="premium-glass p-12 text-center relative z-10">
          <div className="mb-8">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-r-4 border-purple-400 border-l-transparent border-b-transparent mx-auto mb-6"></div>
            <div className="text-2xl font-bold mb-4 text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text">
              Loading Blockchain Data
            </div>
            <p className="text-white/70 text-lg">Fetching latest round information...</p>
          </div>
        </div>
      </div>
    )
  }

  // 현재 활성 라운드가 없는 경우
  if (!currentActiveRound || currentActiveRound === '0x0000000000000000000000000000000000000000') {
    return (
      <div className="min-h-screen overflow-hidden relative">
        <div className="floating-particles"></div>
        
        <nav className="relative z-20 p-6">
          <div className="premium-glass max-w-7xl mx-auto">
            <div className="flex justify-between items-center p-6">
              <h1 className="blitz-logo">MONAD BLITZ</h1>
              <ConnectButton />
            </div>
          </div>
        </nav>

        <main className="relative z-10 flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            {/* 3D Waiting Grid */}
            <div className="isometric-scene mb-12">
              <div className="isometric-container" style={{animation: 'isometric-float 8s ease-in-out infinite'}}>
                {Array.from({ length: 9 }).map((_, index) => (
                  <div key={index} className="isometric-cube opacity-50">
                    <div className="cube-face front"></div>
                    <div className="cube-face back"></div>
                    <div className="cube-face right"></div>
                    <div className="cube-face left"></div>
                    <div className="cube-face top"></div>
                    <div className="cube-face bottom"></div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="premium-glass p-8 max-w-2xl mx-auto">
              <div className="text-4xl font-bold mb-6 text-transparent bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 bg-clip-text">
                ⏳ Waiting for Next Round
              </div>
              <p className="text-xl text-white/80 leading-relaxed">
                No active round currently. Please wait for the next round to begin.
              </p>
            </div>
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
    <div className="min-h-screen overflow-hidden relative">
      <div className="floating-particles"></div>
      
      {/* Header */}
      <nav className="relative z-20 p-6">
        <div className="premium-glass max-w-7xl mx-auto">
          <div className="flex justify-between items-center p-6">
            <div className="flex items-center space-x-6">
              <h1 className="blitz-logo">MONAD BLITZ</h1>
              <span className="text-sm font-semibold text-cyan-300 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 backdrop-blur-sm px-4 py-2 rounded-full border border-cyan-400/30">
                {roundData.roundName}
              </span>
            </div>
            <ConnectButton />
          </div>
        </div>
      </nav>

      {/* Stats Bar */}
      <div className="relative z-15 px-6 mb-8">
        <div className="premium-glass p-6 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <div className="text-sm font-medium text-white/60 uppercase tracking-wider">Prize Pool</div>
              <div className="text-3xl font-bold text-transparent bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text">
                {parseFloat(roundData.totalPool).toFixed(4)} ETH
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-white/60 uppercase tracking-wider">Time Remaining</div>
              <CountdownTimer 
                endTime={roundData.endTime}
                isFinalized={roundData.isFinalized}
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-white/60 uppercase tracking-wider">Active Tokens</div>
              <div className="text-3xl font-bold text-transparent bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 bg-clip-text">
                {gameTokens.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Isometric Game Grid */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6">
        <div className="isometric-scene">
          <div className="isometric-container" style={{animation: 'isometric-float 10s ease-in-out infinite'}}>
            {gridTokens.map((token, index) => (
              <div
                key={index}
                className={`isometric-cube ${
                  token ? '' : 'opacity-30'
                } ${
                  token && userBetMap[token.address.toLowerCase()] 
                    ? 'cube-selected' 
                    : ''
                } ${
                  roundData.winnerToken && token?.symbol === roundData.winnerToken
                    ? 'cube-active'
                    : ''
                }`}
                onClick={() => handleTokenClick(token)}
              >
                {/* Cube Faces */}
                <div className="cube-face front">
                  {token && (
                    <div className="token-content">
                      <div className="token-logo">{token.logo}</div>
                      <div className="token-symbol">{token.symbol}</div>
                      {userBetMap[token.address.toLowerCase()] && (
                        <div className="bet-amount">
                          {parseFloat(userBetMap[token.address.toLowerCase()]).toFixed(3)} ETH
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="cube-face back"></div>
                <div className="cube-face right"></div>
                <div className="cube-face left"></div>
                <div className="cube-face top"></div>
                <div className="cube-face bottom"></div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Instructions */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6 mt-12 mb-8">
        {!isConnected ? (
          <div className="premium-glass p-8">
            <div className="text-2xl font-bold mb-4 text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text">
              🔗 Connect Your Wallet
            </div>
            <p className="text-white/80 text-lg leading-relaxed">
              Connect your wallet and click on any token cube to place your bet
            </p>
          </div>
        ) : roundData.isFinalized ? (
          <div className="premium-glass p-8">
            <div className="text-3xl font-bold mb-6 text-transparent bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 bg-clip-text">
              🎉 Round Complete!
            </div>
            {roundData.winnerToken ? (
              <div className="space-y-4">
                <div className="text-2xl font-bold text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text">
                  {roundData.winnerToken} WINS!
                </div>
                <p className="text-white/80 text-lg">
                  Congratulations to all winners! Prizes have been automatically distributed.
                </p>
              </div>
            ) : (
              <p className="text-white/70 text-lg">Determining winner...</p>
            )}
          </div>
        ) : (
          <div className="premium-glass p-8">
            <div className="text-2xl font-bold mb-4 text-transparent bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 bg-clip-text">
              ⚡ Choose Your Token
            </div>
            <p className="text-white/80 text-lg leading-relaxed">
              Select the token you believe will have the highest price increase during this round
            </p>
          </div>
        )}
      </div>

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