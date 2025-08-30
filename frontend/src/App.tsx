import React, { useState, useEffect, useMemo } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { formatEther } from 'viem'
import { useRoundFactory } from './hooks/useRoundFactory'
import { useRound } from './hooks/useRound'
import TokenCard from './components/TokenCard'
import RoundStatus from './components/RoundStatus'
import { CONTRACT_ADDRESSES } from './config/contracts'

function App() {
  const { address, isConnected } = useAccount()
  const [selectedToken, setSelectedToken] = useState<string | null>(null)
  const [betAmount, setBetAmount] = useState('')

  // Factory 데이터
  const { supportedTokens, currentRoundInfo, currentActiveRound, isLoading: factoryLoading } = useRoundFactory()

  // Round 데이터
  const { registeredTokens, roundStats, timeInfo, tokenBetAmounts, userBets } = useRound(currentActiveRound)

  useEffect(() => {
    const createParticles = () => {
      const container = document.querySelector('.floating-particles')
      if (!container || container.children.length > 0) return
      
      for (let i = 0; i < 50; i++) {
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
  if (CONTRACT_ADDRESSES.ROUND_FACTORY === '0x0000000000000000000000000000000000000000') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">컨트랙트 주소가 필요합니다</h2>
          <p className="text-white/70">
            RoundFactory 컨트랙트가 배포된 후 CONTRACT_ADDRESSES.ROUND_FACTORY를 업데이트해주세요.
          </p>
        </div>
      </div>
    )
  }

  // 로딩 중
  if (factoryLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
      <div className="min-h-screen relative">
        <div className="floating-particles"></div>
        
        <nav className="relative z-10 p-6">
          <div className="glass-card max-w-7xl mx-auto">
            <div className="flex justify-between items-center p-4">
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-3xl font-bold gradient-text">Monad Blitz</h1>
                  <p className="text-sm text-white/70">토큰 승부 예측 게임</p>
                </div>
              </div>
              <ConnectButton />
            </div>
          </div>
        </nav>

        <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <h2 className="text-6xl font-bold gradient-text mb-6">
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

  // 토큰 데이터 매칭
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
        initialPrice: Number(supportedToken?.currentPrice || 0),
        totalBets: formatEther(totalBets)
      }
    })
  }, [supportedTokens, registeredTokens, tokenBetAmounts])

  // 사용자 베팅 데이터
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

  // 라운드 정보
  const roundData = useMemo(() => {
    if (!roundStats || !timeInfo || !currentRoundInfo) return null

    return {
      roundName: roundStats[0],
      isActive: roundStats[1],
      isFinalized: roundStats[2],
      startTime: Number(timeInfo[0]),
      endTime: Number(timeInfo[1]),
      totalPool: formatEther(roundStats[4]),
      participantCount: Object.keys(userBetMap).length, // 이건 정확하지 않음, 실제로는 컨트랙트에서 제공해야 함
      winnerToken: roundStats[5] !== '0x0000000000000000000000000000000000000000' ? 
        gameTokens.find(token => token.address.toLowerCase() === roundStats[5].toLowerCase())?.symbol : 
        undefined
    }
  }, [roundStats, timeInfo, currentRoundInfo, gameTokens, userBetMap])

  const handleTokenSelect = (tokenAddress: string) => {
    if (roundData?.isFinalized) return
    setSelectedToken(tokenAddress === selectedToken ? null : tokenAddress)
  }

  const selectedTokenInfo = gameTokens.find(t => t.address === selectedToken)
  const userTotalBets = Object.values(userBetMap).reduce((sum, bet) => sum + parseFloat(bet), 0)

  if (!roundData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <p className="text-white/70">라운드 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      <div className="floating-particles"></div>
      
      <nav className="relative z-10 p-6">
        <div className="glass-card max-w-7xl mx-auto">
          <div className="flex justify-between items-center p-4">
            <div className="flex items-center space-x-4">
              <div className="cube-container">
                <div className="cube">
                  <div className="cube-face front"></div>
                  <div className="cube-face back"></div>
                  <div className="cube-face right"></div>
                  <div className="cube-face left"></div>
                  <div className="cube-face top"></div>
                  <div className="cube-face bottom"></div>
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">
                  Monad Blitz
                </h1>
                <p className="text-sm text-white/70">토큰 승부 예측 게임</p>
              </div>
            </div>
            <ConnectButton />
          </div>
        </div>
      </nav>
      
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h2 className="text-6xl font-bold gradient-text mb-6">
            최고 상승률 토큰을 예측하세요
          </h2>
          <p className="text-xl text-white/80 max-w-4xl mx-auto leading-relaxed">
            라운드 기간 동안 가장 높은 상승률을 기록할 토큰을 예측하여 ETH를 베팅하고,
            정확한 예측으로 전체 상금 풀을 분배받는 혁신적인 예측 게임
          </p>
        </div>
        
        {/* Round Status */}
        <div className="mb-12">
          <RoundStatus {...roundData} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-16">
          {/* Token Selection */}
          <div className="lg:col-span-3">
            <div className="glass-card p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-3xl font-bold">토큰 선택</h3>
                <div className="text-sm text-white/60">
                  가장 많이 오를 것 같은 토큰을 선택하세요
                </div>
              </div>
              
              {gameTokens.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/50">등록된 토큰이 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {gameTokens.map((token) => (
                    <TokenCard
                      key={token.address}
                      token={token}
                      isSelected={selectedToken === token.address}
                      onClick={() => handleTokenSelect(token.address)}
                      disabled={roundData.isFinalized}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Betting Panel */}
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="text-xl font-bold mb-6">베팅하기</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    선택된 토큰
                  </label>
                  <div className="glass-card p-4 text-center min-h-[80px] flex items-center justify-center">
                    {selectedTokenInfo ? (
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{selectedTokenInfo.logo}</span>
                        <div>
                          <div className="font-bold">{selectedTokenInfo.symbol}</div>
                          <div className="text-sm text-white/70">{selectedTokenInfo.name}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-white/50">토큰을 선택하세요</div>
                    )}
                  </div>
                </div>
                
                {!isConnected ? (
                  <div className="text-center py-4">
                    <p className="text-white/70 mb-4">지갑을 연결하여 베팅하세요</p>
                    <ConnectButton />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        베팅 금액 (ETH)
                      </label>
                      <input 
                        type="number" 
                        placeholder="0.01"
                        step="0.001"
                        min="0"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={roundData.isFinalized}
                      />
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/70">네트워크 수수료</span>
                        <span className="text-yellow-400">가변</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">게임 수수료</span>
                        <span className="text-green-400">0%</span>
                      </div>
                    </div>
                    
                    <button 
                      className="btn-primary w-full"
                      disabled={!selectedToken || !betAmount || roundData.isFinalized}
                    >
                      {roundData.isFinalized ? '라운드 종료' : '베팅하기'}
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {/* User Bets */}
            {isConnected && (
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold mb-4">내 베팅 현황</h3>
                <div className="space-y-3">
                  {Object.keys(userBetMap).length === 0 ? (
                    <div className="text-center text-white/50 py-4">
                      아직 베팅이 없습니다
                    </div>
                  ) : (
                    <>
                      {Object.entries(userBetMap).map(([tokenAddress, amount]) => {
                        const token = gameTokens.find(t => 
                          t.address.toLowerCase() === tokenAddress.toLowerCase()
                        )
                        return (
                          <div key={tokenAddress} className="flex items-center justify-between glass-card p-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{token?.logo}</span>
                              <span className="font-medium">{token?.symbol}</span>
                            </div>
                            <span className="font-mono">{parseFloat(amount).toFixed(4)} ETH</span>
                          </div>
                        )
                      })}
                      <div className="border-t border-white/20 pt-3 mt-3">
                        <div className="flex justify-between font-bold">
                          <span>총 베팅</span>
                          <span className="text-purple-400">{userTotalBets.toFixed(4)} ETH</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Game Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 text-center">
            <h4 className="text-lg font-semibold mb-2 text-white/70">총 상금 풀</h4>
            <div className="text-3xl font-bold text-green-400">
              {parseFloat(roundData.totalPool).toFixed(4)} ETH
            </div>
            <div className="text-sm text-white/50 mt-1">
              ≈ ${(parseFloat(roundData.totalPool) * 2500).toFixed(0)}
            </div>
          </div>
          <div className="glass-card p-6 text-center">
            <h4 className="text-lg font-semibold mb-2 text-white/70">참여 토큰</h4>
            <div className="text-3xl font-bold text-purple-400">{gameTokens.length}</div>
            <div className="text-sm text-white/50 mt-1">활성 토큰</div>
          </div>
          <div className="glass-card p-6 text-center">
            <h4 className="text-lg font-semibold mb-2 text-white/70">승률</h4>
            <div className="text-3xl font-bold text-yellow-400">
              {gameTokens.length > 0 ? (100 / gameTokens.length).toFixed(1) : '0'}%
            </div>
            <div className="text-sm text-white/50 mt-1">
              {gameTokens.length > 0 ? `1/${gameTokens.length}` : '0/0'} 확률
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App