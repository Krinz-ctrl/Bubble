import { useState, useRef, useCallback, useEffect } from 'react'

const BAR_COUNT = 9
const WAVE_HEIGHT = 32
const WAVE_WIDTH = 80

function WaveformVisualization({ stream }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!stream || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.7
    source.connect(analyser)
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    let rafId = 0

    const draw = () => {
      rafId = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)
      const w = canvasRef.current.width
      const h = canvasRef.current.height
      ctx.fillStyle = 'rgba(11, 11, 15, 0.9)'
      ctx.fillRect(0, 0, w, h)
      const step = Math.floor(dataArray.length / BAR_COUNT)
      const barWidth = Math.max(2, (w / BAR_COUNT) - 2)
      for (let i = 0; i < BAR_COUNT; i++) {
        const value = dataArray[i * step] || 0
        const barHeight = Math.max(2, (value / 255) * (h * 0.9))
        const x = (w / BAR_COUNT) * i + 1
        const y = (h - barHeight) / 2
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.fillRect(x, y, barWidth, barHeight)
      }
    }
    draw()
    return () => {
      cancelAnimationFrame(rafId)
      audioContext.close()
    }
  }, [stream])

  return (
    <canvas
      ref={canvasRef}
      width={WAVE_WIDTH}
      height={WAVE_HEIGHT}
      style={{
        display: 'block',
        borderRadius: 4,
      }}
      aria-hidden
    />
  )
}

function PostRecordOverlay({ recordedBlob, onCancel, onPublish, isPublishing }) {
  if (!recordedBlob) return null
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(11, 11, 15, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          backgroundColor: '#1a1a22',
          borderRadius: 12,
          padding: '1.25rem 1.5rem',
          display: 'flex',
          gap: '0.75rem',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          pointerEvents: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => onCancel()}
          disabled={isPublishing}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: 8,
            border: '1px solid #3a3a45',
            backgroundColor: 'transparent',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: isPublishing ? 'not-allowed' : 'pointer',
            opacity: isPublishing ? 0.6 : 1,
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onPublish(recordedBlob)}
          disabled={isPublishing}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#2a2a35',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: isPublishing ? 'not-allowed' : 'pointer',
            opacity: isPublishing ? 0.6 : 1,
          }}
        >
          {isPublishing ? 'Publishing…' : 'Publish'}
        </button>
      </div>
    </div>
  )
}

const UPLOAD_URL = 'http://localhost:3000/bubble/upload'

function getOrCreateAnonymousId() {
  const key = 'bubble_anonymous_id'
  try {
    let id = localStorage.getItem(key)
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`
      localStorage.setItem(key, id)
    }
    return id
  } catch {
    return `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }
}

function MicButton({ onBubbleCreated, avatar = null }) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordStream, setRecordStream] = useState(null)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [showPostRecordPanel, setShowPostRecordPanel] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState(null)
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const anonymousIdRef = useRef(getOrCreateAnonymousId())

  const handlePublish = useCallback(async (blob) => {
    if (!blob || blob.size === 0) throw new Error('No audio to upload')
    const ext = (blob.type && blob.type.split('/')[1]) ? blob.type.split('/')[1].split(';')[0] : 'webm'
    const formData = new FormData()
    formData.append('audio', blob, `audio.${ext}`)
    formData.append('anonymousId', anonymousIdRef.current)
    if (avatar != null && avatar !== '') formData.append('avatar', avatar)
    const res = await fetch(UPLOAD_URL, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Upload failed: ${res.status}`)
    }
    const data = await res.json()
    const raw = data.bubble != null ? data.bubble : data
    const bubble = raw._id ? raw : { ...raw, _id: raw.id || `local_${Date.now()}` }
    onBubbleCreated?.(bubble)
  }, [avatar, onBubbleCreated])

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state !== 'recording') {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      setRecordStream(null)
      setIsRecording(false)
      return
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      setRecordStream(null)
      setIsRecording(false)
      setRecordedBlob(blob)
      setShowPostRecordPanel(true)
    }
    recorder.stop()
    mediaRecorderRef.current = null
    console.log('Recording Stopped')
  }, [])

  const handlePressStart = async () => {
    if (isRecording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setRecordStream(stream)
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data)
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
      console.log('Recording Started')
    } catch (err) {
      console.error('Could not start recording:', err)
    }
  }

  const handlePressEnd = () => {
    stopRecording()
  }

  const handleCancel = useCallback(() => {
    setRecordedBlob(null)
    setShowPostRecordPanel(false)
    setPublishError(null)
  }, [])

  const handlePublishFromOverlay = useCallback(async (blob) => {
    setPublishError(null)
    setIsPublishing(true)
    try {
      await handlePublish(blob)
      setRecordedBlob(null)
      setShowPostRecordPanel(false)
      setPublishError(null)
    } catch (err) {
      console.error('Publish failed:', err)
      setPublishError(err.message || 'Upload failed')
    } finally {
      setIsPublishing(false)
    }
  }, [handlePublish])

  return (
    <>
      {showPostRecordPanel && (
        <PostRecordOverlay
          recordedBlob={recordedBlob}
          onCancel={handleCancel}
          onPublish={handlePublishFromOverlay}
          isPublishing={isPublishing}
        />
      )}
      {publishError && (
        <div
          style={{
            position: 'fixed',
            bottom: '6rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 101,
            padding: '0.5rem 1rem',
            backgroundColor: '#3a2a2a',
            color: '#ffa0a0',
            borderRadius: 8,
            fontSize: '0.85rem',
          }}
        >
          {publishError}
        </div>
      )}
      <div
      style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column-reverse',
        alignItems: 'center',
      }}
    >
      <div style={{ height: WAVE_HEIGHT + 8, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isRecording && recordStream && (
          <WaveformVisualization stream={recordStream} />
        )}
      </div>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); handlePressStart() }}
        onMouseUp={(e) => { e.preventDefault(); handlePressEnd() }}
        onMouseLeave={handlePressEnd}
        onTouchStart={(e) => {
          e.preventDefault()
          handlePressStart()
        }}
        onTouchEnd={(e) => {
          e.preventDefault()
          handlePressEnd()
        }}
        aria-label={isRecording ? 'Recording' : 'Hold to record'}
        style={{
          width: '4rem',
          height: '4rem',
          borderRadius: '50%',
          border: 'none',
          outline: 'none',
          backgroundColor: isRecording ? '#4a2a2a' : '#2a2a35',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 600,
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {isRecording ? '●' : '🎤'}
      </button>
    </div>
    </>
  )
}

export default MicButton
