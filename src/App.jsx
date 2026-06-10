import { useEffect, useRef, useState } from 'react'
import './App.css'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

export default function App() {
  const [hasPermissions, setHasPermissions] = useState(false)
  const [burnoutScore, setBurnoutScore] = useState(0)
  const [alertState, setAlertState] = useState('GREEN')
  const [errorMessage, setErrorMessage] = useState('')
  const [metrics, setMetrics] = useState({
    ear: 0.28,
    blinkCount: 12,
    screenDistance: 0.98,
    db: 35,
    typingJitter: 0,
    backspaceCount: 0,
  })

  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)
  const keystrokeTimesRef = useRef([])
  const rafRef = useRef(null)
  const visualIntervalRef = useRef(null)

  const initializeEnvironment = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser does not support media devices.')
      }

      await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      setHasPermissions(true)
      setupAudioEngine()
      setErrorMessage('')
    } catch (err) {
      setErrorMessage('Unable to start AuraSense. Please allow microphone/camera access.')
      console.error(err)
    }
  }

  const setupAudioEngine = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const AudioContext = window.AudioContext || window.webkitAudioContext
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)

      const updateAudio = () => {
        if (!analyserRef.current || !dataArrayRef.current) return
        analyserRef.current.getByteFrequencyData(dataArrayRef.current)
        const values = dataArrayRef.current
        let sum = 0
        for (let i = 0; i < values.length; i += 1) {
          sum += values[i] * values[i]
        }
        const rms = Math.sqrt(sum / values.length)
        const score = clamp(Math.round((rms / 255) * 80) + 20, 20, 100)
        setMetrics(prev => ({ ...prev, db: score }))
        rafRef.current = requestAnimationFrame(updateAudio)
      }

      updateAudio()
    } catch (err) {
      console.error('Audio engine failed', err)
      setErrorMessage('Microphone access failed or is not available.')
    }
  }

  useEffect(() => {
    const handleKeyDown = event => {
      const timestamp = performance.now()
      keystrokeTimesRef.current.push(timestamp)
      if (keystrokeTimesRef.current.length > 12) {
        keystrokeTimesRef.current.shift()
      }

      if (event.key === 'Backspace') {
        setMetrics(prev => ({ ...prev, backspaceCount: prev.backspaceCount + 1 }))
      }

      if (keystrokeTimesRef.current.length > 3) {
        const intervals = []
        for (let i = 1; i < keystrokeTimesRef.current.length; i += 1) {
          intervals.push(keystrokeTimesRef.current[i] - keystrokeTimesRef.current[i - 1])
        }
        const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length
        const variance = intervals.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / intervals.length
        setMetrics(prev => ({ ...prev, typingJitter: clamp(Math.round(variance), 0, 1000) }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!hasPermissions) return

    visualIntervalRef.current = window.setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        blinkCount: clamp(prev.blinkCount + (Math.random() > 0.75 ? -3 : 0), 3, 20),
        screenDistance: prev.screenDistance > 1.2 ? 0.98 : clamp(prev.screenDistance + 0.02, 0.95, 1.35),
      }))
    }, 3500)

    return () => {
      if (visualIntervalRef.current) {
        window.clearInterval(visualIntervalRef.current)
      }
    }
  }, [hasPermissions])

  useEffect(() => {
    if (!hasPermissions) return

    const computeScore = () => {
      const acousticScore = metrics.db > 68 ? 100 : (metrics.db / 68) * 60
      const behavioralScore = clamp((metrics.typingJitter / 600) * 70 + metrics.backspaceCount * 4, 0, 100)
      const visualScore = metrics.screenDistance > 1.25 ? 100 : metrics.blinkCount < 6 ? 85 : 25
      const total = Math.round(0.5 * visualScore + 0.35 * behavioralScore + 0.15 * acousticScore)
      const normalized = clamp(total, 0, 100)
      setBurnoutScore(normalized)
      setAlertState(normalized > 75 ? 'RED' : normalized > 45 ? 'AMBER' : 'GREEN')
    }

    computeScore()
  }, [hasPermissions, metrics])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {})
      if (visualIntervalRef.current) window.clearInterval(visualIntervalRef.current)
    }
  }, [])

  const statusLabel = hasPermissions ? 'LOCAL MONITOR ACTIVE' : 'PERMISSIONS REQUIRED'
  const statusColor = alertState === 'RED' ? 'var(--alert-red)' : alertState === 'AMBER' ? 'var(--alert-amber)' : 'var(--alert-green)'

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">AuraSense</p>
          <h1>Browser-native burnout & focus monitoring</h1>
          <p className="intro">
            A lightweight client-side safety dashboard that tracks local audio,
            typing behavior, and ergonomic state in real time.
          </p>
        </div>
        <div className="status-pill" style={{ borderColor: statusColor, color: statusColor }}>
          <span className={`status-dot ${alertState.toLowerCase()}`} />
          {statusLabel}
        </div>
      </header>

      <main className="dashboard-grid">
        <section className="panel intro-panel">
          <div>
            <p className="panel-label">Burnout Threat Index</p>
            <h2>{burnoutScore}%</h2>
            <p className="panel-copy">
              {alertState === 'RED'
                ? 'High risk — take a screen break and realign posture.'
                : alertState === 'AMBER'
                ? 'Warning state — reduce strain and reset focus.'
                : 'Optimal state — keep the current pace and breathe.'}
            </p>
          </div>
          <button className="start-button" onClick={initializeEnvironment}>
            {hasPermissions ? 'Monitoring active' : 'Start local monitoring'}
          </button>
          {errorMessage && <p className="error-text">{errorMessage}</p>}
        </section>

        <section className="panel metrics-panel">
          <div className="metric-card">
            <div>
              <span className="metric-label">Acoustic Stress</span>
              <strong>{metrics.db} dB</strong>
            </div>
            <p>Microphone-based audio pressure estimation.</p>
          </div>
          <div className="metric-card">
            <div>
              <span className="metric-label">Typing Jitter</span>
              <strong>{metrics.typingJitter} ms</strong>
            </div>
            <p>Keyboard cadence variance and burst patterns.</p>
          </div>
          <div className="metric-card">
            <div>
              <span className="metric-label">Backspace Count</span>
              <strong>{metrics.backspaceCount}</strong>
            </div>
            <p>Quick error recovery and frustration indicator.</p>
          </div>
          <div className="metric-card">
            <div>
              <span className="metric-label">Visual Ergonomics</span>
              <strong>{metrics.screenDistance > 1.2 ? 'Slouching' : 'Optimal'}</strong>
            </div>
            <p>Simulated screen-proximity posture and blink state.</p>
          </div>
        </section>
      </main>

      <footer className="footer-card">
        <p>Built with React + Vite — all processing happens in the browser.</p>
      </footer>
    </div>
  )
}
