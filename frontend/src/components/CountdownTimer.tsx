import React, { useState, useEffect } from 'react'

interface CountdownTimerProps {
  endTime: number // timestamp in seconds
  onTimeUp?: () => void
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ endTime, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000)
      const remaining = endTime - now
      return Math.max(0, remaining)
    }

    setTimeLeft(calculateTimeLeft())

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)

      if (remaining === 0) {
        clearInterval(timer)
        onTimeUp?.()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [endTime, onTimeUp])

  const formatTime = (seconds: number) => {
    if (seconds === 0) return { hours: '00', minutes: '00', seconds: '00' }
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: secs.toString().padStart(2, '0')
    }
  }

  const { hours, minutes, seconds } = formatTime(timeLeft)
  const isUrgent = timeLeft < 300 // 5분 미만일 때 urgent
  const isExpired = timeLeft === 0

  return (
    <div className="flex items-center space-x-2">
      <div className={`
        flex items-center space-x-1 font-mono text-2xl font-bold
        ${isExpired ? 'text-red-500' : isUrgent ? 'text-yellow-400 animate-pulse' : 'text-white'}
      `}>
        <div className="glass-card px-3 py-2 rounded-lg">
          {hours}
        </div>
        <span>:</span>
        <div className="glass-card px-3 py-2 rounded-lg">
          {minutes}
        </div>
        <span>:</span>
        <div className="glass-card px-3 py-2 rounded-lg">
          {seconds}
        </div>
      </div>
      
      <div className="flex flex-col text-xs text-white/60">
        <span>시</span>
        <span>분</span>
        <span>초</span>
      </div>
    </div>
  )
}

export default CountdownTimer