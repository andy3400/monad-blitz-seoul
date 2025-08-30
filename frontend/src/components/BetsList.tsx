import React from 'react'
import { formatEther } from 'viem'

interface BetsListProps {
  roundAddress?: string
  supportedTokens?: { tokenAddress: string; symbol: string; name: string }[]
  userBets?: [string[], bigint[]]
  tokenBetAmounts?: [string[], bigint[]]
  totalBetsCount?: number
}

const BetsList: React.FC<BetsListProps> = ({ 
  roundAddress, 
  supportedTokens, 
  userBets,
  tokenBetAmounts,
  totalBetsCount = 0
}) => {
  // 사용 가능한 데이터로 베팅 목록을 구성
  const getBetsList = () => {
    if (!userBets || !supportedTokens) return []
    
    const [tokenAddresses, amounts] = userBets
    return tokenAddresses
      .map((tokenAddress, index) => ({
        tokenAddress,
        amount: amounts[index],
        bettor: 'You', // 현재 사용자의 베팅만 표시
        token: supportedTokens.find(t => 
          t.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
        )
      }))
      .filter(bet => bet.amount > 0)
  }

  const getAllTokenBets = () => {
    if (!tokenBetAmounts || !supportedTokens) return []
    
    const [tokenAddresses, amounts] = tokenBetAmounts
    return tokenAddresses
      .map((tokenAddress, index) => ({
        tokenAddress,
        totalAmount: amounts[index],
        token: supportedTokens.find(t => 
          t.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
        )
      }))
      .filter(bet => bet.totalAmount > 0)
  }

  const myBets = getBetsList()
  const allTokenBets = getAllTokenBets()

  if (!roundAddress) {
    return (
      <div className="premium-glass p-6 h-fit">
        <h3 className="text-xl font-bold mb-4 text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text">
          📊 Round Stats
        </h3>
        <p className="text-white/60 text-center py-8">
          No active round
        </p>
      </div>
    )
  }

  return (
    <div className="premium-glass p-6 h-fit">
      <h3 className="text-xl font-bold mb-6 text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text">
        📊 Round Stats
      </h3>

      {/* Total Bets Info */}
      <div className="mb-6 premium-glass p-4 border border-indigo-400/30">
        <div className="text-center">
          <div className="text-sm text-white/60 mb-2 uppercase tracking-wider font-medium">Total Bets Placed</div>
          <div className="text-3xl font-bold text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text">
            {totalBetsCount}
          </div>
          <div className="text-xs text-white/50 mt-1">individual bets</div>
        </div>
      </div>

      {/* My Bets Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">Your Bets</h4>
          {myBets.length > 0 && (
            <span className="text-xs text-white/60 bg-yellow-500/20 px-2 py-1 rounded-full">
              {myBets.length} active
            </span>
          )}
        </div>
        
        <div className="space-y-3">
          {myBets.length > 0 ? (
            myBets.map((bet, index) => (
              <div key={index} className="premium-glass p-4 border border-yellow-400/30 bg-yellow-400/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {bet.token?.symbol?.[0] || '?'}
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        {bet.token?.symbol || 'Unknown'}
                      </div>
                      <div className="text-xs text-yellow-400">
                        Your bet
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-transparent bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text">
                      {parseFloat(formatEther(bet.amount)).toFixed(4)} ETH
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 border border-white/10 rounded-xl bg-white/5">
              <div className="text-2xl mb-2">🎯</div>
              <p className="text-white/60 text-sm">No bets placed yet</p>
            </div>
          )}
        </div>
      </div>

      {/* All Token Bets Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">Token Pools</h4>
          <span className="text-xs text-white/60 bg-purple-500/20 px-2 py-1 rounded-full">
            {allTokenBets.length} tokens
          </span>
        </div>
        
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {allTokenBets.length > 0 ? (
            allTokenBets
              .sort((a, b) => Number(b.totalAmount - a.totalAmount)) // Sort by total amount desc
              .map((tokenBet, index) => (
                <div key={index} className="premium-glass p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {tokenBet.token?.symbol?.[0] || '?'}
                        </div>
                        {index === 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                            <span className="text-xs">👑</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-white">
                          {tokenBet.token?.symbol || 'Unknown'}
                        </div>
                        <div className="text-xs text-white/60">
                          {index === 0 ? 'Leading' : `#${index + 1} pool`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text">
                        {parseFloat(formatEther(tokenBet.totalAmount)).toFixed(4)} ETH
                      </div>
                      <div className="text-xs text-white/60">
                        Total pool
                      </div>
                    </div>
                  </div>
                </div>
              ))
          ) : (
            <div className="text-center py-6 border border-white/10 rounded-xl bg-white/5">
              <div className="text-2xl mb-2">💰</div>
              <p className="text-white/60 text-sm">No token pools yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BetsList