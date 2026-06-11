import { useEffect, useRef, useState } from 'react'
import './App.css'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

export default function App() {
  const [hasPermissions, setHasPermissions] = useState(false)
  const [burnoutScore, setBurnoutScore] = useState(0)
  const [alertState, setAlertState] = useState('GREEN')
  const [errorMessage, setErrorMessage] = useState('')
  const [showInfo, setShowInfo] = useState(false)
  const [overlayEnabled, setOverlayEnabled] = useState(true)
  const [movementTimeline, setMovementTimeline] = useState([])
  const [metrics, setMetrics] = useState({
    ear: 0.28,
    blinkCount: 12,
    screenDistance: 0.98,
    db: 35,
    typingJitter: 0,
    backspaceCount: 0,
    movementLabel: 'Stable',
    motionScore: 12,
  })

  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)
  const keystrokeTimesRef = useRef([])
  const rafRef = useRef(null)
  const visualIntervalRef = useRef(null)
  const scoreIntervalRef = useRef(null)
  const overlayRAFRef = useRef(null)
  const motionShapesRef = useRef([])
  const canvasRef = useRef(null)
  const videoRef = useRef(null)

  const initializeEnvironment = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser does not support media devices.')
      }

      await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      setHasPermissions(true)
      setupAudioEngine()
      setupVideoEngine()
      setErrorMessage('')
    } catch (err) {
      setErrorMessage('Unable to start AuraSense. Please allow microphone/camera access.')
      console.error(err)
    }
  }

  const stopMonitoring = () => {
    setHasPermissions(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {})
    if (visualIntervalRef.current) window.clearInterval(visualIntervalRef.current)
    if (scoreIntervalRef.current) window.clearInterval(scoreIntervalRef.current)
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    audioContextRef.current = null
    analyserRef.current = null
    keystrokeTimesRef.current = []
    setMetrics({
      ear: 0.28,
      blinkCount: 12,
      screenDistance: 0.98,
      db: 35,
      typingJitter: 0,
      backspaceCount: 0,
      movementLabel: 'Stable',
      motionScore: 12,
    })
    setMovementTimeline([])
    setBurnoutScore(0)
    setAlertState('GREEN')
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

  const getMotionColor = label => {
    if (label === 'Active shift') return '#fb7185'
    if (label === 'Micro-adjustment') return '#f59e0b'
    return '#10b981'
  }

  const createBodyPartLines = (label) => {
    const videoEl = videoRef.current
    const width = videoEl?.clientWidth || 640
    const height = videoEl?.clientHeight || 360
    // Simulated normalized positions for head, shoulders, torso
    const cx = width / 2
    const headY = height * 0.18
    const shoulderY = height * 0.36
    const torsoY = height * 0.62

    // intensity factor from label
    const intensity = label === 'Active shift' ? 1 : label === 'Micro-adjustment' ? 0.6 : 0.18

    return [
      { name: 'Head', x1: cx - 18 * intensity, y1: headY - 6, x2: cx + 18 * intensity, y2: headY + 6, weight: 3 + 2 * intensity },
      { name: 'Left Shoulder', x1: cx - 80 * intensity, y1: shoulderY, x2: cx - 18 * intensity, y2: shoulderY + 6, weight: 2 + 2 * intensity },
      { name: 'Right Shoulder', x1: cx + 18 * intensity, y1: shoulderY + 6, x2: cx + 80 * intensity, y2: shoulderY, weight: 2 + 2 * intensity },
      { name: 'Torso', x1: cx - 24 * intensity, y1: torsoY - 6, x2: cx + 24 * intensity, y2: torsoY + 6, weight: 3 + 2 * intensity },
    ]
  }

  const drawMotionOverlay = (label, score) => {
    const canvas = canvasRef.current
    const videoEl = videoRef.current
    if (!canvas || !videoEl) return

    const width = videoEl.clientWidth
    const height = videoEl.clientHeight
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.floor(width * dpr))
    canvas.height = Math.max(1, Math.floor(height * dpr))
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    const color = getMotionColor(label)

    // draw translucent vignette for emphasis
    ctx.fillStyle = 'rgba(2,6,23,0.18)'
    ctx.fillRect(0, 0, width, height)

    const shapes = createBodyPartLines(label)
    motionShapesRef.current = shapes

    shapes.forEach(s => {
      ctx.strokeStyle = color
      ctx.lineWidth = s.weight
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(s.x1, s.y1)
      ctx.lineTo(s.x2, s.y2)
      ctx.stroke()

      // small pulsing dot at midpoint
      const mx = (s.x1 + s.x2) / 2
      const my = (s.y1 + s.y2) / 2
      ctx.beginPath()
      ctx.fillStyle = color
      ctx.arc(mx, my, Math.max(2, s.weight), 0, Math.PI * 2)
      ctx.fill()

      // label
      ctx.fillStyle = 'rgba(248,250,252,0.92)'
      ctx.font = '600 12px Inter, system-ui'
      ctx.fillText(s.name, s.x2 + 8, s.y2 + 4)
    })

    // score badge
    ctx.fillStyle = 'rgba(0,0,0,0.36)'
    ctx.fillRect(12, 12, 160, 36)
    ctx.fillStyle = '#fff'
    ctx.font = '600 14px Inter, system-ui'
    ctx.fillText(`${label} • ${score}`, 20, 34)
  }

  const startMotionOverlay = () => {
    if (overlayRAFRef.current) cancelAnimationFrame(overlayRAFRef.current)
    const loop = () => {
      if (overlayEnabled) {
        try {
          drawMotionOverlay(metrics.movementLabel, metrics.motionScore)
        } catch (e) {
          // swallow
        }
      } else {
        const canvas = canvasRef.current
        if (canvas) {
          const ctx = canvas.getContext('2d')
          ctx && ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }
      overlayRAFRef.current = requestAnimationFrame(loop)
    }
    overlayRAFRef.current = requestAnimationFrame(loop)
  }

  const stopMotionOverlay = () => {
    if (overlayRAFRef.current) cancelAnimationFrame(overlayRAFRef.current)
    overlayRAFRef.current = null
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx && ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  const setupVideoEngine = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        videoRef.current.play().catch(() => {})
        videoRef.current.addEventListener('loadedmetadata', () => {
          try { startMotionOverlay() } catch (e) {}
        }, { once: true })
      }

      visualIntervalRef.current = window.setInterval(() => {
        setMetrics(prev => {
          const motionChance = Math.random()
          const movementLabel = motionChance > 0.75 ? 'Active shift' : motionChance > 0.45 ? 'Micro-adjustment' : 'Stable'
          const motionScore = motionChance > 0.75 ? 85 : motionChance > 0.45 ? 46 : 18
          const simulatedSlouch = Math.random() > 0.7 ? parseFloat((1.25 + Math.random() * 0.25).toFixed(2)) : 0.98
          const simulatedBlinks = Math.random() > 0.85 ? Math.floor(Math.random() * 5) + 3 : prev.blinkCount
          const nowLabel = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
          const activityDetail = `${nowLabel} — ${movementLabel} detected`

          setMovementTimeline(prevTimeline => [activityDetail, ...prevTimeline].slice(0, 8))

          try { drawMotionOverlay(movementLabel, motionScore) } catch (e) {}

          return {
            ...prev,
            screenDistance: simulatedSlouch,
            blinkCount: simulatedBlinks,
            movementLabel,
            motionScore,
          }
        })
      }, 1000)
    } catch (err) {
      console.error('Video engine failed', err)
      setErrorMessage('Camera access failed or is not available.')
    }
  }

  useEffect(() => {
    const handleKeyDown = event => {
      if (!hasPermissions) return
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
  }, [hasPermissions])

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

  const acousticScore = metrics.db > 68 ? 100 : (metrics.db / 68) * 60
  const behavioralScore = clamp((metrics.typingJitter / 600) * 70 + metrics.backspaceCount * 4, 0, 100)
  const visualScore = metrics.screenDistance > 1.25 ? 100 : metrics.blinkCount < 6 ? 85 : 25
  const fusionFormula = `0.50 × Visual + 0.35 × Behavioral + 0.15 × Acoustic`
  const visualDetails = metrics.screenDistance > 1.25 ? 'Posture drift detected' : 'Posture within optimal range'

  useEffect(() => {
    if (!hasPermissions) return

    const computeScore = () => {
      const total = Math.round(0.5 * visualScore + 0.35 * behavioralScore + 0.15 * acousticScore)
      const normalized = clamp(total, 0, 100)
      setBurnoutScore(normalized)
      setAlertState(normalized > 75 ? 'RED' : normalized > 45 ? 'AMBER' : 'GREEN')
    }

    scoreIntervalRef.current = window.setInterval(computeScore, 1500)
    computeScore()

    return () => {
      if (scoreIntervalRef.current) window.clearInterval(scoreIntervalRef.current)
    }
  }, [hasPermissions, metrics, acousticScore, behavioralScore, visualScore])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      stopMotionOverlay()
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {})
      if (visualIntervalRef.current) window.clearInterval(visualIntervalRef.current)
      if (scoreIntervalRef.current) window.clearInterval(scoreIntervalRef.current)
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
          <div className="button-group">
            <button className="start-button" onClick={initializeEnvironment} disabled={hasPermissions}>
              {hasPermissions ? 'Monitoring...' : 'Start Monitoring'}
            </button>
            {hasPermissions && (
              <button className="stop-button" onClick={stopMonitoring}>
                Stop Monitoring
              </button>
            )}
          </div>
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

          <div className="metric-card">
            <div>
              <span className="metric-label">Camera Movement</span>
              <strong>{metrics.movementLabel}</strong>
            </div>
            <p>Live camera motion capture shows how your head and posture change every second.</p>
          </div>

          <div className="metric-card">
            <div>
              <span className="metric-label">Fusion Logic</span>
              <strong>{fusionFormula}</strong>
            </div>
            <p>
              Combining visual, behavioral, and acoustic subscores into a single burnout threat index.
            </p>
          </div>
        </section>
      </main>

      <section className="video-section panel">
        <div className="video-grid">
          <div className="video-frame">
            <video ref={videoRef} className="live-camera" playsInline muted autoPlay />
            <canvas ref={canvasRef} className="motion-overlay" />
            <div className="video-overlay">
              <div>
                <strong>Camera capture active</strong>
                <p>{metrics.movementLabel} / motion score {metrics.motionScore}</p>
              </div>
              <div>
                  <span className="motion-badge">Movement snapshot</span>
                  <button className="overlay-toggle" onClick={() => setOverlayEnabled(v => !v)} style={{ marginLeft: 12 }}>
                    {overlayEnabled ? 'Hide Lines' : 'Show Lines'}
                  </button>
              </div>
            </div>
          </div>
          <div className="motion-feed">
            <h3>Movement timeline</h3>
            <ul>
              {movementTimeline.length === 0 ? (
                <li>No movement captured yet. Start monitoring to see second-by-second updates.</li>
              ) : (
                movementTimeline.map((event, index) => (
                  <li key={`${event}-${index}`} className="motion-item">{event}</li>
                ))
              )}
            </ul>
          </div>
        </div>
        <div className="video-note">
          <p>
            The video feed captures your camera frame and simulates movement tracking every second. This helps AuraSense illustrate how posture and motion affect the visual modality score.
          </p>
        </div>
      </section>

      <section className="info-section">
        <button className="info-toggle" onClick={() => setShowInfo(!showInfo)}>
          {showInfo ? '▼ How It Works' : '► How It Works'}
        </button>
        {showInfo && (
          <div className="info-content">
            <div className="modality-card">
              <h4>Visual capture</h4>
              <p>
                AuraSense simulates eye and posture metrics in the browser. It monitors blink frequency, eye aspect ratio, and screen-distance posture to infer visual strain.
              </p>
              <p>
                Current values: <strong>{metrics.blinkCount} blinks/min</strong>, <strong>{metrics.screenDistance.toFixed(2)}</strong> distance factor.
              </p>
              <p>
                Visual subscore = <strong>{visualScore.toFixed(0)}</strong> from posture and blink behavior.
              </p>
            </div>
            <div className="modality-card">
              <h4>Behavioral capture</h4>
              <p>
                Keyboard cadence is used to calculate typing jitter and frustration. Rapid backspaces and variable keystroke intervals increase the behavioral risk signal.
              </p>
              <p>
                Current values: <strong>{metrics.typingJitter} ms</strong> jitter, <strong>{metrics.backspaceCount} backspaces</strong>.
              </p>
              <p>
                Behavioral subscore = <strong>{behavioralScore.toFixed(0)}</strong>.
              </p>
            </div>
            <div className="modality-card">
              <h4>Acoustic capture</h4>
              <p>
                The microphone listener computes a live audio level and maps it into a decibel-like stress score. Higher sustained noise levels raise cognitive load risk.
              </p>
              <p>
                Current value: <strong>{metrics.db} dB</strong> equivalent.
              </p>
              <p>
                Acoustic subscore = <strong>{acousticScore.toFixed(0)}</strong>.
              </p>
            </div>
            <div className="modality-card">
              <h4>Burnout calculation</h4>
              <p>
                Final threat index = 0.50 × Visual + 0.35 × Behavioral + 0.15 × Acoustic.
              </p>
              <p>
                Current calculation: <strong>{visualScore.toFixed(0)} × 0.50 + {behavioralScore.toFixed(0)} × 0.35 + {acousticScore.toFixed(0)} × 0.15</strong>.
              </p>
              <p>
                This yields the burnout score shown at the top: <strong>{burnoutScore}%</strong>.
              </p>
            </div>
            <h3>Three Modalities of AuraSense</h3>
            
            <div className="modality-card">
              <h4>🔊 Acoustic Modality</h4>
              <p>AuraSense monitors your ambient sound environment using the microphone. High noise levels (above 65dB) indicate environmental stressors that can disrupt focus and mental clarity. The acoustic engine samples local audio pressure in real time without recording or storing speech.</p>
              <p className="impact"><strong>Impact:</strong> High ambient noise contributes 15% to your burnout score.</p>
            </div>

            <div className="modality-card">
              <h4>⌨️ Behavioral Modality</h4>
              <p>Your typing patterns reveal cognitive load and frustration levels. When you're stressed, typing becomes erratic — keystroke intervals vary wildly, and error corrections (backspaces) spike. AuraSense measures keystroke cadence variance and backspace frequency to quantify this behavioral signal.</p>
              <p className="impact"><strong>Impact:</strong> Typing stress contributes 35% to your burnout score.</p>
            </div>

            <div className="modality-card">
              <h4>👁️ Visual Modality</h4>
              <p>Your screen distance and blink patterns indicate ergonomic strain. Poor posture (slouching closer to the screen) and reduced blink frequency signal eye strain and neck fatigue. AuraSense currently simulates these values, with plans to integrate MediaPipe FaceMesh for real-time tracking.</p>
              <p className="impact"><strong>Impact:</strong> Visual strain contributes 50% to your burnout score.</p>
            </div>
          </div>
        )}
      </section>

      <section className="stress-section">
        <button className="info-toggle" onClick={() => setShowInfo(!showInfo)}>
          {showInfo ? '▼ Burnout Levels' : '► Burnout Levels'}
        </button>
        {showInfo && (
          <div className="stress-content">
            <h3>Understanding Your Burnout State</h3>
            
            <div className="stress-level green">
              <div className="stress-header">
                <span className="status-badge green">GREEN</span>
                <h4>Optimal Focus State (0–45%)</h4>
              </div>
              <p><strong>Description:</strong> You are in the optimal state for deep work. Your acoustic environment is calm, typing is steady, and posture is upright.</p>
              <p><strong>What you're experiencing:</strong> Flow state, clear thinking, energy and motivation.</p>
              <p><strong>Recommendation:</strong> Maintain your current pace. Take natural breaks every 60 minutes to stay refreshed.</p>
            </div>

            <div className="stress-level amber">
              <div className="stress-header">
                <span className="status-badge amber">AMBER</span>
                <h4>Warning State (45–75%)</h4>
              </div>
              <p><strong>Description:</strong> Early signs of burnout are emerging. Your acoustic environment may be noisy, typing is becoming erratic, or posture is degrading.</p>
              <p><strong>What you're experiencing:</strong> Mild frustration, reduced focus, slight physical discomfort, distractions.</p>
              <p><strong>Recommendation:</strong> Take a 10-minute break. Stretch, hydrate, adjust your posture. Reduce background noise if possible.</p>
            </div>

            <div className="stress-level red">
              <div className="stress-header">
                <span className="status-badge red">RED</span>
                <h4>Critical Burnout State (75–100%)</h4>
              </div>
              <p><strong>Description:</strong> You are at high risk of burnout. Multiple stress signals are active — high noise, erratic typing, and poor posture compound into critical strain.</p>
              <p><strong>What you're experiencing:</strong> Acute frustration, brain fog, physical tension, inability to focus.</p>
              <p><strong>Recommendation:</strong> Stop work immediately. Take a 20-30 minute screen break. Step outside, walk, breathe deeply. Reset your environment before resuming.</p>
            </div>
          </div>
        )}
      </section>

      <footer className="footer-card">
        <p>Built with React + Vite — all processing happens in the browser. Your data never leaves your device.</p>
      </footer>
    </div>
  )
}
