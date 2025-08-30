import React, { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { BET_TYPES } from './config/contracts'

function App() {
  const [selectedBet, setSelectedBet] = useState<number | null>(null)
  const [betAmount, setBetAmount] = useState('')
  
  useEffect(() => {
    const createParticles = () => {
      const container = document.querySelector('.floating-particles')
      if (!container) return
      
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
                <p className="text-sm text-white/70">Chainlink 예측 게임</p>
              </div>
            </div>
            <ConnectButton />
          </div>
        </div>
      </nav>
      
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h2 className="text-6xl font-bold gradient-text mb-6">
            미래를 예측하고 상금을 획득하세요
          </h2>
          <p className="text-xl text-white/80 max-w-4xl mx-auto leading-relaxed">
            Chainlink datafeed의 다음 라운드 가격 변동을 예측하여 ETH를 베팅하고,
            정확한 예측으로 상금을 분배받는 혁신적인 온체인 게임
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <div className="lg:col-span-2">
            <div className="glass-card p-8 mb-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-3xl font-bold">현재 라운드</h3>
                <div className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full">
                  <span className="text-green-400 font-medium">● LIVE</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="text-6xl font-mono font-bold text-white mb-4">
                    $65,432.10
                  </div>
                  <div className="text-2xl text-white/70 mb-2">BTC/USD</div>
                  <div className="text-sm text-green-400">
                    +1.24% (24h)
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-white/70">라운드 ID</span>
                    <span className="font-mono">#12847</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">시작 가격</span>
                    <span className="font-mono">$65,221.85</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">변동률</span>
                    <span className="text-green-400 font-mono">+0.32%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">남은 시간</span>
                    <span className="text-yellow-400 font-mono">02:34</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="glass-card p-8">
              <h3 className="text-2xl font-bold mb-6">베팅 옵션 선택</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {BET_TYPES.map((bet) => (
                  <button
                    key={bet.id}
                    className={`prediction-card ${selectedBet === bet.id ? 'selected' : ''}`}
                    onClick={() => setSelectedBet(bet.id)}
                  >
                    <div className="text-center">
                      <div className="text-lg font-bold mb-2">{bet.name}</div>
                      <div className="text-sm text-white/70 mb-2">{bet.percentage}</div>
                      <div className="text-xs text-white/50">
                        {bet.threshold > 0 ? `+${bet.threshold}` : bet.threshold} bps
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="text-xl font-bold mb-4">베팅하기</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    선택된 예측
                  </label>
                  <div className="glass-card p-3 text-center">
                    {selectedBet !== null ? (
                      <div>
                        <div className="font-bold">{BET_TYPES[selectedBet].name}</div>
                        <div className="text-sm text-white/70">
                          {BET_TYPES[selectedBet].percentage}
                        </div>
                      </div>
                    ) : (
                      <div className="text-white/50">옵션을 선택하세요</div>
                    )}
                  </div>
                </div>
                
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
                  />
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/70">수수료</span>
                    <span>0%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">예상 수익률</span>
                    <span className="text-green-400">2.3x</span>
                  </div>
                </div>
                
                <button 
                  className="btn-primary w-full"
                  disabled={selectedBet === null || !betAmount}
                >
                  베팅하기
                </button>
              </div>
            </div>
            
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold mb-4">내 베팅</h3>
              <div className="space-y-3">
                <div className="text-center text-white/50 py-4">
                  아직 베팅이 없습니다
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-card p-6 text-center">
            <h4 className="text-lg font-semibold mb-2 text-white/70">총 상금 풀</h4>
            <div className="text-3xl font-bold text-green-400">12.5 ETH</div>
            <div className="text-sm text-white/50 mt-1">≈ $32,158</div>
          </div>
          <div className="glass-card p-6 text-center">
            <h4 className="text-lg font-semibold mb-2 text-white/70">참여자 수</h4>
            <div className="text-3xl font-bold text-blue-400">247</div>
            <div className="text-sm text-white/50 mt-1">활성 베터</div>
          </div>
          <div className="glass-card p-6 text-center">
            <h4 className="text-lg font-semibold mb-2 text-white/70">평균 베팅</h4>
            <div className="text-3xl font-bold text-purple-400">0.051 ETH</div>
            <div className="text-sm text-white/50 mt-1">≈ $130</div>
          </div>
          <div className="glass-card p-6 text-center">
            <h4 className="text-lg font-semibold mb-2 text-white/70">승률</h4>
            <div className="text-3xl font-bold text-yellow-400">16.7%</div>
            <div className="text-sm text-white/50 mt-1">1/6 확률</div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App