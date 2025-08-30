import React, { useState, useEffect } from 'react'

interface CountdownTimerProps {
  endTime: number // timestamp in seconds
  isFinalized: boolean
  onTimeUp?: () => void
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ endTime, isFinalized, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    if (isFinalized) {
      setTimeLeft(0)
      return
    }

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
  }, [endTime, isFinalized, onTimeUp])

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
  const isExpired = timeLeft === 0 || isFinalized

  if (isExpired) {
    return (
      <div className="text-2xl font-bold text-white/40">
        Ended
      </div>
    )
  }

  return (
    <div className={`text-3xl font-bold ${isUrgent ? 'text-purple-400 animate-pulse' : 'text-white'}`}>
      {hours !== '00' ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`}
    </div>
  )
}

export default CountdownTimer