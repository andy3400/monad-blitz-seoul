import React, {useEffect, useMemo, useState} from 'react'
import {useConnectModal} from '@rainbow-me/rainbowkit'
import {useAccount} from 'wagmi'
import {CustomConnectButton} from './components/CustomConnectButton'
import {formatEther} from 'viem'
import {useRoundFactory} from './hooks/useRoundFactory'
import {useRound} from './hooks/useRound'
import BettingModal from './components/BettingModal'
import BetsList from './components/BetsList'
import CountdownTimer from './components/CountdownTimer'
import MiniChart from './components/MiniChart'
import {CONTRACT_ADDRESSES, type TokenInfo} from './config/contracts'

// Token images
import btcImg from './assets/token/btc.png'
import dogeImg from './assets/token/doge.png'
import ethImg from './assets/token/eth.png'
import linkImg from './assets/token/link.png'
import pepeImg from './assets/token/pepe.png'
import solImg from './assets/token/sol.png'

// Token image mapping
const getTokenImage = (symbol: string) => {
  const tokenImages: Record<string, string> = {
    'BTC': btcImg,
    'DOGE': dogeImg,
    'ETH': ethImg,
    'LINK': linkImg,
    'PEPE': pepeImg,
    'SOL': solImg,
  }
  return tokenImages[symbol.toUpperCase()] || null
}

function App() {
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null)
  const [isBettingModalOpen, setIsBettingModalOpen] = useState(false)

  // Factory 데이터 - 항상 호출
  const { supportedTokens, currentRoundInfo, currentActiveRound, previousRound, isLoading: factoryLoading } = useRoundFactory()

  // Round 데이터 - 항상 호출 (조건은 hook 내부에서 처리)
  const { registeredTokens, roundStats, timeInfo, tokenBetAmounts, userBets, betsCount, isLoading: roundLoading, refetchAll } = useRound(currentActiveRound)

  // Previous Round 데이터 - waiting 상태일 때만 호출
  const { roundStats: previousRoundStats } = useRound(previousRound)

  // 토큰 데이터 매칭 및 순위 계산 - 항상 호출
  const gameTokens = useMemo(() => {
    if (!supportedTokens || !registeredTokens || !tokenBetAmounts) return []

    const tokensWithBets = registeredTokens.map(tokenAddress => {
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
        totalBets: formatEther(totalBets),
        totalBetsWei: totalBets
      }
    })

    // 베팅 금액 기준으로 순위 매기기 (내림차순)
    const sortedByBets = [...tokensWithBets].sort((a, b) => 
      Number(b.totalBetsWei - a.totalBetsWei)
    )

    // 각 토큰에 순위 추가 (베팅이 0이면 순위 없음)
    return tokensWithBets.map(token => {
      const rank = token.totalBetsWei > 0 ? 
        sortedByBets.findIndex(t => t.address === token.address) + 1 : 
        null
      
      return {
        ...token,
        bettingRank: rank && rank <= 3 ? rank : null
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
      
      // 30개에서 8개로 대폭 감소
      for (let i = 0; i < 8; i++) {
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
  if (factoryLoading || roundLoading) {
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
    // 직전 라운드 winner 정보 계산
    const previousWinner = previousRoundStats && previousRoundStats[5] !== '0x0000000000000000000000000000000000000000' ? 
      supportedTokens?.find(token => token.tokenAddress.toLowerCase() === previousRoundStats[5].toLowerCase()) :
      null

    return (
      <div className="min-h-screen overflow-hidden relative">
        <div className="floating-particles"></div>
        
        <nav className="relative z-20 p-6">
          <div className="premium-glass max-w-7xl mx-auto">
            <div className="flex justify-between items-center p-6">
              <h1 className="blitz-logo">nad.bet</h1>
              <CustomConnectButton />
            </div>
          </div>
        </nav>

        <main className="relative z-10 flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            {/* 3D Waiting Grid */}
            <div className="isometric-scene mb-12">
              <div className="isometric-container">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div key={index} className="isometric-cube opacity-50">
                    <div className="cube-face front"></div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="premium-glass p-8 max-w-2xl mx-auto space-y-6">
              <div className="text-4xl font-bold text-white">
                Waiting for next round
              </div>
              
              {/* Previous Round Winner */}
              {previousWinner && (
                <div className="bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-2xl p-6 border border-purple-500/30">
                  <div className="text-lg font-medium text-white/80 mb-3">
                    🏆 Previous Round Winner
                  </div>
                  <div className="flex items-center justify-center space-x-4">
                    <div className="w-16 h-16 flex items-center justify-center">
                      {getTokenImage(previousWinner.symbol) ? (
                        <img 
                          src={getTokenImage(previousWinner.symbol)!} 
                          alt={previousWinner.symbol}
                          className="w-16 h-16 rounded-full object-cover border-2 border-purple-400/50 shadow-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white border-2 border-purple-400/50 shadow-lg">
                          {previousWinner.symbol[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text">
                        {previousWinner.symbol}
                      </div>
                      <div className="text-white/60">
                        {previousWinner.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-white/60 mt-4">
                    Had the highest volatility in the last round
                  </div>
                </div>
              )}
              
              <p className="text-xl text-white/80 leading-relaxed">
                {previousWinner ? 'A new round will begin shortly.' : 'No active round. A new round will begin shortly.'}
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }


  const handleTokenClick = (token: TokenInfo | null) => {
    if (!token || roundData?.isFinalized) return
    
    // 지갑이 연결되지 않은 경우 지갑 연결 모달 열기
    if (!isConnected) {
      openConnectModal?.()
      return
    }
    
    // 지갑이 연결된 경우 베팅 모달 열기
    setSelectedToken(token)
    setIsBettingModalOpen(true)
  }

  const handleBet = async (amount: string) => {
    // 베팅 완료 후 데이터 새로고침
    console.log('Bet completed:', amount, 'MON on', selectedToken?.symbol)
    await refetchAll?.()
  }

  if (!roundData && !roundLoading) {
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
      <nav className="relative z-20 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="premium-glass backdrop-blur-2xl bg-white/[0.02]">
            <div className="flex justify-between items-center px-8 py-5">
              <div className="flex items-center space-x-8">
                <h1 className="blitz-logo">
                  nad.bet
                </h1>
                <div className="hidden md:flex items-center gap-2">
                  <div className="h-6 w-px bg-white/20"></div>
                  <span className="text-sm font-medium text-white/40">Volatility Prediction Market</span>
                </div>
              </div>
              <CustomConnectButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-15 px-4 mb-8">
        <div className="max-w-7xl mx-auto text-center py-8">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Predict the most volatile token.
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Bet on which token will have the highest price movement in the next round.
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="relative z-15 px-4 mb-12">
        <div className="premium-glass p-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-around gap-6">
            <div className="text-center space-y-2">
              <div className="text-sm font-medium text-white/60 uppercase tracking-wider">Prize Pool</div>
              <div className="text-3xl font-bold text-transparent bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text">
                {parseFloat(roundData!.totalPool).toFixed(4)} MON
              </div>
              <div className="text-xs text-white/40 uppercase tracking-wider mt-1">Total Pool</div>
            </div>
            <div className="hidden md:block h-12 w-px bg-white/10"></div>
            <div className="text-center">
              <CountdownTimer 
                endTime={roundData!.endTime}
                isFinalized={roundData!.isFinalized}
              />
              <div className="text-xs text-white/40 uppercase tracking-wider mt-1">Time Remaining</div>
            </div>
            <div className="hidden md:block h-12 w-px bg-white/10"></div>
            <div className="text-center space-y-2">
              <div className="text-sm font-medium text-white/60 uppercase tracking-wider">Tokens</div>
              <div className="text-3xl font-bold text-white">
                {gameTokens.length}
              </div>
              <div className="text-xs text-white/40 uppercase tracking-wider mt-1">Active Tokens</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <main className="relative z-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Side - 3D Isometric Game Grid */}
            <div className="lg:col-span-2 flex flex-col items-center justify-center">
              <div className="isometric-scene">
                <div className="isometric-container">
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
                        roundData!.winnerToken && token?.symbol === roundData!.winnerToken
                          ? 'cube-active'
                          : ''
                      }`}
                      style={{ '--index': index } as React.CSSProperties}
                      onClick={() => handleTokenClick(token)}
                    >
                      {/* Ultra Optimized Cube - Single face for maximum performance */}
                      <div className="cube-face front">
                        {token && (
                          <>
                            {/* Betting Rank Badge */}
                            {token.bettingRank && (
                              <div className={`rank-badge rank-${token.bettingRank}`}>
                                {token.bettingRank}
                              </div>
                            )}
                            
                            <div className="token-content-compact">
                              <div className="token-image-container">
                                {getTokenImage(token.symbol) ? (
                                  <img 
                                    src={getTokenImage(token.symbol)!} 
                                    alt={token.symbol}
                                    className="token-image-small"
                                  />
                                ) : (
                                  <div className="token-logo-fallback-small">{token.symbol[0]}</div>
                                )}
                              </div>
                              <div className="token-info">
                                <MiniChart symbol={token.symbol} size="small" />
                                <div className="token-symbol-compact">{token.symbol}</div>
                                {userBetMap[token.address.toLowerCase()] && (
                                  <div className="bet-amount-compact">
                                    {parseFloat(userBetMap[token.address.toLowerCase()]).toFixed(3)} MON
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side - Betting Statistics */}
            <div className="lg:col-span-1">
              <BetsList
                roundAddress={currentActiveRound}
                supportedTokens={supportedTokens}
                userBets={userBets}
                tokenBetAmounts={tokenBetAmounts}
                totalBetsCount={betsCount ? Number(betsCount) : 0}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Instructions */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6 mt-12 mb-8">
        { roundData!.isFinalized ? (
          <div className="premium-glass p-8">
            <div className="text-3xl font-bold mb-6 text-white">
              Round Complete
            </div>
            {roundData!.winnerToken ? (
              <div className="space-y-4">
                <div className="text-2xl font-bold text-purple-400">
                  {roundData!.winnerToken} had the highest volatility
                </div>
                <p className="text-white/80 text-lg">
                  Winners have been paid automatically.
                </p>
              </div>
            ) : (
              <p className="text-white/70 text-lg">Calculating winner...</p>
            )}
          </div>
        ) : null }
      </div>

      {/* Betting Modal */}
      <BettingModal
        isOpen={isBettingModalOpen}
        onClose={() => setIsBettingModalOpen(false)}
        token={selectedToken}
        onBet={handleBet}
        userCurrentBet={selectedToken ? userBetMap[selectedToken.address.toLowerCase()] : undefined}
        roundAddress={currentActiveRound}
        totalPool={roundData?.totalPool}
      />
    </div>
  )
}

export default App