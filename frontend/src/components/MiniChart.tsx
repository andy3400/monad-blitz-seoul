import React, { useEffect, useState } from 'react'

interface MiniChartProps {
  symbol: string
  size?: 'small' | 'medium'
  className?: string
}

const MiniChart: React.FC<MiniChartProps> = ({ 
  symbol, 
  size = 'small',
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false)
  
  // 컴포넌트 마운트 후 애니메이션 시작
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // 가상의 차트 데이터 생성 (실제로는 API에서 가져와야 함)
  const generateMockData = (symbol: string) => {
    const baseValue = 50
    const volatility = getVolatilityBySymbol(symbol)
    const points: number[] = []
    
    let currentValue = baseValue
    for (let i = 0; i < 12; i++) {
      const change = (Math.random() - 0.5) * volatility
      currentValue = Math.max(10, Math.min(90, currentValue + change))
      points.push(currentValue)
    }
    
    return points
  }

  const getVolatilityBySymbol = (symbol: string) => {
    const volatilityMap: Record<string, number> = {
      'BTC': 8,
      'ETH': 10,
      'DOGE': 15,
      'PEPE': 20,
      'SOL': 12,
      'LINK': 10,
    }
    return volatilityMap[symbol] || 10
  }

  const getTrendColor = (data: number[]) => {
    if (data.length < 2) return '#8B92F6'
    const start = data[0]
    const end = data[data.length - 1]
    
    if (end > start * 1.05) return '#10B981' // 상승 - 초록
    if (end < start * 0.95) return '#F59E0B' // 하락 - 주황
    return '#8B92F6' // 횡보 - 보라
  }

  const data = generateMockData(symbol)
  const trendColor = getTrendColor(data)
  
  // SVG path 생성
  const createPath = (points: number[]) => {
    const width = size === 'small' ? 40 : 60
    const height = size === 'small' ? 16 : 24
    
    const xStep = width / (points.length - 1)
    const yScale = height / 80 // 0-100 범위를 height에 맞게 스케일
    
    const pathData = points
      .map((point, index) => {
        const x = index * xStep
        const y = height - (point * yScale) // Y축 뒤집기
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
    
    return pathData
  }

  const width = size === 'small' ? 40 : 60
  const height = size === 'small' ? 16 : 24

  return (
    <div className={`mini-chart ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="mini-chart-svg"
      >
        <defs>
          <linearGradient id={`gradient-${symbol}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={trendColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* 차트 영역 배경 */}
        <path
          d={`${createPath(data)} L ${width} ${height} L 0 ${height} Z`}
          fill={`url(#gradient-${symbol})`}
          className={`chart-area ${isVisible ? 'animate-in' : ''}`}
        />
        
        {/* 차트 라인 */}
        <path
          d={createPath(data)}
          fill="none"
          stroke={trendColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`chart-line ${isVisible ? 'animate-in' : ''}`}
        />
        
        {/* 글로우 효과 */}
        <path
          d={createPath(data)}
          fill="none"
          stroke={trendColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.4"
          filter="blur(1px)"
          className={`chart-glow ${isVisible ? 'animate-in' : ''}`}
        />
      </svg>
    </div>
  )
}

export default MiniChart