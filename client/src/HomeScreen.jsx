import { useState, useCallback, useRef, useEffect } from 'react'
import MicButton from './MicButton.jsx'
import Bubble from './Bubble.jsx'

function Header() {
  return (
    <header style={{ position: 'absolute', top: 0, left: 0, padding: '1rem', zIndex: 1 }}>
      <span style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600 }}>BUBBLE</span>
    </header>
  )
}

const SAFE_PADDING = 40
const DEFAULT_BUBBLE_SIZE = 32

function getSafeViewport(size = DEFAULT_BUBBLE_SIZE) {
  if (typeof window === 'undefined') return { w: 300, h: 200, padding: SAFE_PADDING }
  return {
    w: window.innerWidth,
    h: window.innerHeight,
    padding: SAFE_PADDING,
    maxX: window.innerWidth - SAFE_PADDING - size,
    minX: SAFE_PADDING,
    maxY: window.innerHeight - SAFE_PADDING - size,
    minY: SAFE_PADDING,
  }
}

function randomSafePosition(size = DEFAULT_BUBBLE_SIZE) {
  const { minX, maxX, minY, maxY } = getSafeViewport(size)
  return {
    x: minX + Math.random() * Math.max(0, maxX - minX),
    y: minY + Math.random() * Math.max(0, maxY - minY),
  }
}

function BubbleCanvas({ bubbles }) {
  const assignedPositionsRef = useRef({})
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
      }}
    >
      {bubbles.map((b) => {
        const size = typeof b.size === 'number' ? b.size : DEFAULT_BUBBLE_SIZE
        let x = b.x
        let y = b.y
        if (typeof x !== 'number' || typeof y !== 'number') {
          if (!assignedPositionsRef.current[b._id]) {
            assignedPositionsRef.current[b._id] = randomSafePosition(size)
          }
          x = assignedPositionsRef.current[b._id].x
          y = assignedPositionsRef.current[b._id].y
        }
        return <Bubble key={b._id} size={size} x={x} y={y} audioUrl={b.audioUrl} />
      })}
    </div>
  )
}

const FEED_URL = 'http://localhost:3000/bubble/feed'

export default function HomeScreen() {
  const [bubbles, setBubbles] = useState([])

  useEffect(() => {
    let cancelled = false
    async function loadFeed() {
      try {
        const res = await fetch(FEED_URL)
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        setBubbles(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setBubbles([])
      }
    }
    loadFeed()
    return () => { cancelled = true }
  }, [])

  const handleBubbleCreated = useCallback((newBubble) => {
    const size = DEFAULT_BUBBLE_SIZE
    const { x, y } = randomSafePosition(size)
    setBubbles((prev) => [{ ...newBubble, size, x, y }, ...prev])
  }, [])

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0B0B0F',
        overflow: 'hidden',
      }}
    >
      <Header />
      <BubbleCanvas bubbles={bubbles} />
      <MicButton onBubbleCreated={handleBubbleCreated} />
    </div>
  )
}
