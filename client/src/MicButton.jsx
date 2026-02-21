import { useState, useRef, useEffect } from 'react'

const COUNTDOWN_SECONDS = 2
const RECORDING_SECONDS = 10

function MicButton() {
  const [state, setState] = useState('idle') // 'idle' | 'countdown' | 'recording'
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleClick = () => {
    if (state !== 'idle') return

    setState('countdown')
    setCountdown(COUNTDOWN_SECONDS)

    let remaining = COUNTDOWN_SECONDS
    const tick = () => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining > 0) {
        timerRef.current = setTimeout(tick, 1000)
      } else {
        setState('recording')
        timerRef.current = setTimeout(() => {
          setState('idle')
        }, RECORDING_SECONDS * 1000)
      }
    }
    timerRef.current = setTimeout(tick, 1000)
  }

  const isActive = state === 'countdown' || state === 'recording'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state !== 'idle'}
      aria-label={state === 'recording' ? 'Recording' : 'Start recording'}
      style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '4rem',
        height: '4rem',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: isActive ? '#4a2a2a' : '#2a2a35',
        color: '#fff',
        cursor: state === 'idle' ? 'pointer' : 'default',
        fontSize: state === 'countdown' ? '1.25rem' : '0.875rem',
        fontWeight: 600,
        zIndex: 2,
      }}
    >
      {state === 'countdown' && countdown}
      {state === 'recording' && '●'}
      {state === 'idle' && '🎤'}
    </button>
  )
}

export default MicButton
