import React, { useState } from 'react'
import { formatEther } from 'viem'
import type { TokenInfo } from '../config/contracts'

interface BettingModalProps {
  isOpen: boolean
  onClose: () => void
  token: TokenInfo | null
  onBet: (amount: string) => void
  userCurrentBet?: string
}

const BettingModal: React.FC<BettingModalProps> = ({ 
  isOpen, 
  onClose, 
  token, 
  onBet, 
  userCurrentBet 
}) => {
  const [betAmount, setBetAmount] = useState('')

  if (!isOpen || !token) return null

  const handleBet = () => {
    if (betAmount && parseFloat(betAmount) > 0) {
      onBet(betAmount)
      setBetAmount('')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative premium-glass p-8 max-w-lg w-full mx-4 animate-[scale-in_0.2s_ease-out] origin-center">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="text-4xl">{token.logo}</div>
            <div>
              <h3 className="text-2xl font-bold">{token.symbol}</h3>
              <p className="text-white/70">{token.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Token Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="premium-glass p-4 text-center">
            <div className="text-sm text-white/60 mb-1 uppercase tracking-wider font-medium">Initial Price</div>
            <div className="text-lg font-bold text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text">
              ${token.initialPrice ? token.initialPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : 'N/A'}
            </div>
          </div>
          <div className="premium-glass p-4 text-center">
            <div className="text-sm text-white/60 mb-1 uppercase tracking-wider font-medium">Total Bets</div>
            <div className="text-lg font-bold text-transparent bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text">
              {token.totalBets || '0'} ETH
            </div>
          </div>
        </div>

        {/* Current User Bet */}
        {userCurrentBet && parseFloat(userCurrentBet) > 0 && (
          <div className="premium-glass p-4 mb-6 border-2 border-yellow-400/30">
            <div className="text-center">
              <div className="text-sm text-white/70 mb-1 uppercase tracking-wider font-medium">Your Current Bet</div>
              <div className="text-xl font-bold text-transparent bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text">
                {parseFloat(userCurrentBet).toFixed(4)} ETH
              </div>
            </div>
          </div>
        )}

        {/* Betting Form */}
        <div className="space-y-4">
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
              autoFocus
            />
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {['0.01', '0.05', '0.1', '0.5'].map((amount) => (
              <button
                key={amount}
                onClick={() => setBetAmount(amount)}
                className="btn-secondary text-sm py-2"
              >
                {amount}
              </button>
            ))}
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
            {token.totalBets && betAmount && (
              <div className="flex justify-between">
                <span className="text-white/70">예상 배당률</span>
                <span className="text-green-400">
                  {token.totalBets !== '0' ? 
                    (1 / parseFloat(token.totalBets) * (parseFloat(token.totalBets) + parseFloat(betAmount))).toFixed(2) + 'x' : 
                    'N/A'
                  }
                </span>
              </div>
            )}
          </div>

          <button 
            onClick={handleBet}
            disabled={!betAmount || parseFloat(betAmount) <= 0}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {userCurrentBet && parseFloat(userCurrentBet) > 0 ? '추가 베팅' : '베팅하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BettingModal