import { useMemo, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'

const LONG_PRESS_MS = 400

function Bubble({ size = 48, x = 0, y = 0, audioUrl }) {
  const delay = useMemo(() => Math.random() * 2, [])
  const [isListening, setIsListening] = useState(false)
  const longPressTimerRef = useRef(null)
  const audioRef = useRef(null)
  const hadLongPressRef = useRef(false)

  const stopPlayback = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setIsListening(false)
  }, [])

  const handlePressStart = useCallback(() => {
    if (!audioUrl) return
    hadLongPressRef.current = false
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null
      hadLongPressRef.current = true
      setIsListening(true)
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.play().catch(() => {})
    }, LONG_PRESS_MS)
  }, [audioUrl])

  const handlePressEnd = useCallback(() => {
    stopPlayback()
  }, [stopPlayback])

  const handleClick = useCallback((e) => {
    if (hadLongPressRef.current) {
      e.preventDefault()
      e.stopPropagation()
      hadLongPressRef.current = false
    }
  }, [])

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={(e) => {
        e.preventDefault()
        handlePressStart()
      }}
      onTouchEnd={(e) => {
        e.preventDefault()
        handlePressEnd()
      }}
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        boxShadow: isListening
          ? '0 0 28px rgba(255, 255, 255, 0.35)'
          : '0 0 20px rgba(255, 255, 255, 0.2)',
        cursor: audioUrl ? 'pointer' : 'default',
      }}
      animate={{
        y: [0, -6, 0],
        scale: isListening ? 1.1 : 1,
      }}
      transition={{
        y: {
          duration: 4,
          repeat: Infinity,
          repeatType: 'reverse',
          delay,
        },
        scale: { duration: 0.15 },
      }}
    />
  )
}

export default Bubble
