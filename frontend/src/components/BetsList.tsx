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
    <div className="premium-glass backdrop-blur-2xl bg-white/[0.02] p-6 h-fit">
      <h3 className="text-sm font-medium mb-6 text-white/60 uppercase tracking-wider">
        Activity
      </h3>

      {/* Total Bets Info */}
      <div className="mb-6 bg-gradient-to-br from-purple-500/10 to-transparent rounded-2xl p-5 border border-purple-500/20">
        <div className="text-center">
          <div className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Total Bets</div>
          <div className="text-2xl font-bold text-white">
            {totalBetsCount}
          </div>
        </div>
      </div>

      {/* My Bets Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-white">Your Positions</h4>
          {myBets.length > 0 && (
            <span className="text-xs text-white/40">
              {myBets.length} active
            </span>
          )}
        </div>
        
        <div className="space-y-3">
          {myBets.length > 0 ? (
            myBets.map((bet, index) => (
              <div key={index} className="bg-gradient-to-r from-purple-500/10 to-transparent rounded-xl p-4 border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg">
                      {bet.token?.symbol?.[0] || '?'}
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        {bet.token?.symbol || 'Unknown'}
                      </div>
                      <div className="text-xs text-white/40">
                        Your bet
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">
                      {parseFloat(formatEther(bet.amount)).toFixed(4)}
                    </div>
                    <div className="text-xs text-white/40">ETH</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6">
              <p className="text-white/40 text-sm">No positions yet</p>
            </div>
          )}
        </div>
      </div>

      {/* All Token Bets Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-white">Token Pools</h4>
          <span className="text-xs text-white/40">
            {allTokenBets.length} tokens
          </span>
        </div>
        
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {allTokenBets.length > 0 ? (
            allTokenBets
              .sort((a, b) => Number(b.totalAmount - a.totalAmount)) // Sort by total amount desc
              .map((tokenBet, index) => (
                <div key={index} className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center text-white text-sm font-bold border border-white/10">
                          {tokenBet.token?.symbol?.[0] || '?'}
                        </div>
                        {index === 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-[10px] font-bold">1</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-white">
                          {tokenBet.token?.symbol || 'Unknown'}
                        </div>
                        <div className="text-xs text-white/40">
                          {index === 0 ? 'Leading' : `#${index + 1}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">
                        {parseFloat(formatEther(tokenBet.totalAmount)).toFixed(4)}
                      </div>
                      <div className="text-xs text-white/40">Pool</div>
                    </div>
                  </div>
                </div>
              ))
          ) : (
            <div className="text-center py-6">
              <p className="text-white/40 text-sm">No active pools</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BetsList