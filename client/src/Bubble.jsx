import { useMemo } from 'react'
import { motion } from 'framer-motion'

function Bubble({ size = 48, x = 0, y = 0 }) {
  const delay = useMemo(() => Math.random() * 2, [])

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        boxShadow: '0 0 20px rgba(255, 255, 255, 0.2)',
      }}
      animate={{ y: [0, -6, 0] }}
      transition={{
        duration: 4,
        repeat: Infinity,
        repeatType: 'reverse',
        delay,
      }}
    />
  )
}

export default Bubble
