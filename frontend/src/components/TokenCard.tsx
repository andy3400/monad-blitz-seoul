import React from 'react'
import type { TokenInfo } from '../config/contracts'

interface TokenCardProps {
  token: TokenInfo
  isSelected: boolean
  onClick: () => void
  disabled?: boolean
}

const TokenCard: React.FC<TokenCardProps> = ({ token, isSelected, onClick, disabled = false }) => {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'orange':
        return {
          bg: 'from-orange-500 to-orange-600',
          border: 'border-orange-500',
          text: 'text-orange-400'
        }
      case 'blue':
        return {
          bg: 'from-blue-500 to-blue-600',
          border: 'border-blue-500',
          text: 'text-blue-400'
        }
      case 'purple':
        return {
          bg: 'from-purple-500 to-purple-600',
          border: 'border-purple-500',
          text: 'text-purple-400'
        }
      case 'yellow':
        return {
          bg: 'from-yellow-500 to-yellow-600',
          border: 'border-yellow-500',
          text: 'text-yellow-400'
        }
      default:
        return {
          bg: 'from-gray-500 to-gray-600',
          border: 'border-gray-500',
          text: 'text-gray-400'
        }
    }
  }

  const colorClasses = getColorClasses(token.color)
  const changePercent = token.change ? ((token.change / (token.initialPrice || 1)) * 100).toFixed(2) : null

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        glass-card p-6 transition-all duration-300 relative overflow-hidden group
        ${isSelected 
          ? `bg-gradient-to-r ${colorClasses.bg}/20 ${colorClasses.border} shadow-lg shadow-${token.color}-500/25 scale-105` 
          : 'hover:scale-105'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`text-4xl ${colorClasses.text}`}>
            {token.logo}
          </div>
          {isSelected && (
            <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${colorClasses.bg} flex items-center justify-center`}>
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        
        <div className="text-left">
          <h3 className="text-xl font-bold text-white mb-1">
            {token.symbol}
          </h3>
          <p className="text-sm text-white/70 mb-3">
            {token.name}
          </p>
          
          {token.initialPrice && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">초기 가격</span>
                <span className="text-white font-mono">
                  ${token.initialPrice.toLocaleString()}
                </span>
              </div>
              
              {token.currentPrice && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">현재 가격</span>
                  <span className="text-white font-mono">
                    ${token.currentPrice.toLocaleString()}
                  </span>
                </div>
              )}
              
              {changePercent && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">변동률</span>
                  <span className={`font-mono font-bold ${
                    parseFloat(changePercent) > 0 ? 'text-green-400' : 
                    parseFloat(changePercent) < 0 ? 'text-red-400' : 'text-white'
                  }`}>
                    {parseFloat(changePercent) > 0 ? '+' : ''}{changePercent}%
                  </span>
                </div>
              )}
              
              {token.totalBets && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">총 베팅</span>
                  <span className="text-white font-mono">
                    {token.totalBets} ETH
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Hover effect */}
      <div className={`
        absolute inset-0 bg-gradient-to-r ${colorClasses.bg} opacity-0 
        group-hover:opacity-10 transition-opacity duration-300
      `} />
    </button>
  )
}

export default TokenCard