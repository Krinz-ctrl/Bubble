import MicButton from './MicButton.jsx'

function Header() {
  return (
    <header style={{ position: 'absolute', top: 0, left: 0, padding: '1rem', zIndex: 1 }}>
      <span style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600 }}>BUBBLE</span>
    </header>
  )
}

function BubbleCanvas() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
      }}
    />
  )
}

export default function HomeScreen() {
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
      <BubbleCanvas />
      <MicButton />
    </div>
  )
}
