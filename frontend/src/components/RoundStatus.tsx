import React from 'react'
import CountdownTimer from './CountdownTimer'

interface RoundStatusProps {
  roundName: string
  isActive: boolean
  isFinalized: boolean
  startTime: number
  endTime: number
  totalPool: string
  participantCount: number
  winnerToken?: string
}

const RoundStatus: React.FC<RoundStatusProps> = ({
  roundName,
  isActive,
  isFinalized,
  endTime,
  totalPool,
  participantCount,
  winnerToken
}) => {
  const getStatusInfo = () => {
    if (isFinalized) {
      return {
        status: 'ENDED',
        color: 'text-red-500',
        bgColor: 'bg-red-500/20 border-red-500/30',
        icon: '🏁'
      }
    } else if (isActive && Date.now() / 1000 < endTime) {
      return {
        status: 'LIVE',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20 border-green-500/30',
        icon: '● '
      }
    } else {
      return {
        status: 'WAITING',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20 border-yellow-500/30',
        icon: '⏳'
      }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="glass-card p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-3xl font-bold text-white">
            {roundName}
          </h2>
          <div className={`px-4 py-2 rounded-full ${statusInfo.bgColor}`}>
            <span className={`${statusInfo.color} font-medium text-sm`}>
              {statusInfo.icon} {statusInfo.status}
            </span>
          </div>
        </div>
        
        {winnerToken && (
          <div className="text-right">
            <div className="text-sm text-white/60">승리 토큰</div>
            <div className="text-xl font-bold text-green-400">
              {winnerToken}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-2">
              {totalPool} MON
            </div>
            <div className="text-sm text-white/60">총 상금 풀</div>
            <div className="text-xs text-white/40 mt-1">
              ≈ ${(parseFloat(totalPool) * 2500).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400 mb-2">
              {participantCount}
            </div>
            <div className="text-sm text-white/60">참여자 수</div>
            <div className="text-xs text-white/40 mt-1">
              활성 베터
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="text-center">
            {isFinalized ? (
              <div>
                <div className="text-2xl font-bold text-red-500 mb-2">
                  종료됨
                </div>
                <div className="text-sm text-white/60">라운드 상태</div>
              </div>
            ) : (
              <div>
                <div className="mb-2">
                  <CountdownTimer
                      isFinalized={isFinalized}
                    endTime={endTime}
                    onTimeUp={() => console.log('Round ended!')}
                  />
                </div>
                <div className="text-sm text-white/60">남은 시간</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isFinalized && winnerToken && (
        <div className="mt-6 glass-card p-4 border border-green-500/30 bg-green-500/10">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl">🏆</span>
            <span className="text-lg text-green-400 font-bold">
              {winnerToken} 토큰이 승리했습니다!
            </span>
            <span className="text-2xl">🏆</span>
          </div>
          <p className="text-center text-white/70 mt-2">
            {winnerToken}에 베팅한 모든 사용자들에게 상금이 자동으로 분배되었습니다.
          </p>
        </div>
      )}
    </div>
  )
}

export default RoundStatus