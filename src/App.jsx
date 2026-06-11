import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Camera,
  Cpu,
  Eye,
  Info,
  KeyRound,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  Volume2,
} from 'lucide-react'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const initialMetrics = {
  db: 28,
  blinkCount: 12,
  screenDistance: 1.05,
  typingJitter: 22,
  backspaceCount: 0,
  movementLabel: 'Stable',
  motionScore: 18,
  eyeAspect: 0.28,
  headAngle: 2,
  faceConfidence: 0.94,
}

export default function App() {
  const [hasAccess, setHasAccess] = useState(false)
  const [monitoring, setMonitoring] = useState(false)
  const [fallbackMode, setFallbackMode] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [burnoutScore, setBurnoutScore] = useState(0)
  const [alertState, setAlertState] = useState('green')
  const [overlayEnabled, setOverlayEnabled] = useState(true)
  const [showInfo, setShowInfo] = useState(false)
  const [showSettings, setShowSettings] = useState(true)
  const [aiSettings, setAiSettings] = useState({
    localInference: true,
    byokMode: false,
    keepKeysLocal: true,
  })
  const [metrics, setMetrics] = useState(initialMetrics)
  const [timeline, setTimeline] = useState([])
  const [captureLabel, setCaptureLabel] = useState('Awaiting live feed')

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const wrapperRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)
  const audioLoopRef = useRef(null)
  const motionTimerRef = useRef(null)
  const overlayLoopRef = useRef(null)
  const keystrokeTimesRef = useRef([])
  const videoStreamRef = useRef(null)
  const overlayEnabledRef = useRef(overlayEnabled)

  useEffect(() => {
    overlayEnabledRef.current = overlayEnabled
  }, [overlayEnabled])

  const scoreBreakdown = useMemo(() => {
    const visualScore = clamp(44 + (1.15 - metrics.screenDistance) * 90 + (12 - metrics.blinkCount) * 2.8, 0, 100)
    const behavioralScore = clamp(metrics.typingJitter * 0.72 + metrics.backspaceCount * 3.4, 0, 100)
    const acousticScore = clamp((metrics.db - 24) * 1.15, 0, 100)
    const combined = clamp(Math.round(visualScore * 0.5 + behavioralScore * 0.35 + acousticScore * 0.15), 0, 100)

    return {
      visualScore,
      behavioralScore,
      acousticScore,
      combined,
    }
  }, [metrics])

  useEffect(() => {
    setBurnoutScore(scoreBreakdown.combined)
    setAlertState(scoreBreakdown.combined > 75 ? 'red' : scoreBreakdown.combined > 50 ? 'amber' : 'green')
  }, [scoreBreakdown])

  const resetState = () => {
    if (overlayLoopRef.current) cancelAnimationFrame(overlayLoopRef.current)
    if (audioLoopRef.current) cancelAnimationFrame(audioLoopRef.current)
    if (motionTimerRef.current) window.clearInterval(motionTimerRef.current)
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
      analyserRef.current = null
      dataArrayRef.current = null
    }

    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop())
      videoStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setHasAccess(false)
    setMonitoring(false)
    setFallbackMode(false)
    setErrorMessage('')
    setCaptureLabel('Awaiting live feed')
    setMetrics(initialMetrics)
    setTimeline([])
    setBurnoutScore(0)
    setAlertState('green')
  }

  const drawOverlay = () => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return

    const rect = wrapper.getBoundingClientRect()
    const width = Math.max(1, Math.floor(rect.width))
    const height = Math.max(1, Math.floor(rect.height))
    const dpr = window.devicePixelRatio || 1

    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    if (!overlayEnabledRef.current) return

    ctx.fillStyle = 'rgba(3, 7, 23, 0.28)'
    ctx.fillRect(0, 0, width, height)

    const base = alertState === 'red' ? '#fb7185' : alertState === 'amber' ? '#fbbf24' : '#34d399'
    const nodeColor = fallbackMode ? '#60a5fa' : base

    const nodes = [
      { x: width * 0.22, y: height * 0.32, label: 'Face', color: '#60a5fa' },
      { x: width * 0.42, y: height * 0.62, label: 'Eye', color: '#22c55e' },
      { x: width * 0.7, y: height * 0.34, label: 'Head tilt', color: '#f59e0b' },
    ]

    nodes.forEach(node => {
      ctx.strokeStyle = node.color
      ctx.lineWidth = 2.3
      ctx.setLineDash([6, 14])
      ctx.beginPath()
      ctx.ellipse(node.x, node.y, 82, 48, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = node.color
      ctx.font = '600 12px Inter, system-ui'
      ctx.fillText(node.label.toUpperCase(), node.x - 36, node.y - 62)
    })

    ctx.strokeStyle = nodeColor
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(width * 0.22, height * 0.32)
    ctx.lineTo(width * 0.42, height * 0.62)
    ctx.lineTo(width * 0.7, height * 0.34)
    ctx.stroke()

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
    ctx.fillRect(18, 18, 172, 38)
    ctx.fillStyle = '#f8fafc'
    ctx.font = '600 13px Inter, system-ui'
    ctx.fillText(`${metrics.movementLabel} · ${metrics.motionScore}`, 28, 40)

    if (fallbackMode) {
      ctx.fillStyle = 'rgba(249, 115, 22, 0.92)'
      ctx.fillRect(width - 232, 18, 214, 38)
      ctx.fillStyle = '#020617'
      ctx.fillText('SIMULATED MODE', width - 212, 40)
    }
  }

  const startOverlayLoop = () => {
    if (overlayLoopRef.current) cancelAnimationFrame(overlayLoopRef.current)
    const loop = () => {
      drawOverlay()
      overlayLoopRef.current = requestAnimationFrame(loop)
    }
    overlayLoopRef.current = requestAnimationFrame(loop)
  }

  const startAudioSimulation = () => {
    if (audioLoopRef.current) cancelAnimationFrame(audioLoopRef.current)
    const loop = () => {
      setMetrics(prev => ({
        ...prev,
        db: clamp(prev.db + (Math.random() - 0.5) * 6, 28, 82),
      }))
      audioLoopRef.current = requestAnimationFrame(loop)
    }
    audioLoopRef.current = requestAnimationFrame(loop)
  }

  const startAudioEngine = async stream => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)

      audioCtxRef.current = audioContext
      analyserRef.current = analyser
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)

      const tick = () => {
        if (!analyserRef.current || !dataArrayRef.current) return
        analyserRef.current.getByteFrequencyData(dataArrayRef.current)
        const values = dataArrayRef.current
        let sum = 0
        for (let i = 0; i < values.length; i += 1) sum += values[i] * values[i]
        const rms = Math.sqrt(sum / values.length)
        const score = clamp(Math.round((rms / 255) * 80) + 20, 20, 100)
        setMetrics(prev => ({ ...prev, db: score }))
        audioLoopRef.current = requestAnimationFrame(tick)
      }

      tick()
    } catch (error) {
      console.error('Audio engine failed', error)
      startAudioSimulation()
    }
  }

  const startMotionEngine = liveMode => {
    if (motionTimerRef.current) window.clearInterval(motionTimerRef.current)
    motionTimerRef.current = window.setInterval(() => {
      setMetrics(prev => {
        const motionChance = Math.random()
        const movementLabel = motionChance > 0.8 ? 'Active shift' : motionChance > 0.5 ? 'Micro-adjustment' : 'Stable'
        const motionScore = motionChance > 0.8 ? 88 : motionChance > 0.5 ? 52 : 20
        const nextDistance = clamp(prev.screenDistance + (Math.random() - 0.5) * 0.08, 0.92, 1.32)
        const nextBlink = clamp(prev.blinkCount + (Math.random() > 0.7 ? -2 : Math.random() > 0.7 ? 2 : 0), 4, 20)
        const nextEye = clamp(prev.eyeAspect + (Math.random() - 0.5) * 0.04, 0.18, 0.42)
        const nextHead = clamp(prev.headAngle + (Math.random() - 0.5) * 6, -12, 18)
        const nextFaceConfidence = clamp(prev.faceConfidence + (Math.random() - 0.5) * 0.03, 0.78, 0.99)
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        const event = `${timestamp} • ${movementLabel} detected`

        setTimeline(prevTimeline => [event, ...prevTimeline].slice(0, 6))

        return {
          ...prev,
          movementLabel,
          motionScore,
          screenDistance: nextDistance,
          blinkCount: nextBlink,
          eyeAspect: parseFloat(nextEye.toFixed(2)),
          headAngle: Math.round(nextHead),
          faceConfidence: parseFloat(nextFaceConfidence.toFixed(2)),
        }
      })
    }, 1200)

    if (!liveMode && !audioLoopRef.current) {
      startAudioSimulation()
    }
  }

  const launchMonitoring = async () => {
    await resetState()

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Your browser does not support secure media capture. Running local fallback engine.')
      setMonitoring(true)
      setFallbackMode(true)
      setCaptureLabel('Simulated experience')
      startMotionEngine(false)
      startOverlayLoop()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true })
      videoStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        await videoRef.current.play().catch(() => {})
      }
      setHasAccess(true)
      setMonitoring(true)
      setFallbackMode(false)
      setErrorMessage('')
      setCaptureLabel('Live local capture')
      startMotionEngine(true)
      await startAudioEngine(stream)
      startOverlayLoop()
    } catch (error) {
      console.warn('Live capture refused, enabling fallback engine.', error)
      setMonitoring(true)
      setHasAccess(false)
      setFallbackMode(true)
      setErrorMessage('Camera / mic permission blocked. Running secure fallback simulation.')
      setCaptureLabel('Secure mock feed')
      startMotionEngine(false)
      startOverlayLoop()
    }
  }

  useEffect(() => {
    const handleKeyDown = event => {
      if (!monitoring) return
      const timestamp = performance.now()
      keystrokeTimesRef.current.push(timestamp)
      if (keystrokeTimesRef.current.length > 12) keystrokeTimesRef.current.shift()

      if (event.key === 'Backspace') {
        setMetrics(prev => ({ ...prev, backspaceCount: prev.backspaceCount + 1 }))
      }

      if (keystrokeTimesRef.current.length > 3) {
        const intervals = keystrokeTimesRef.current.slice(1).map((time, index) => time - keystrokeTimesRef.current[index])
        const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length
        const variance = intervals.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / intervals.length
        setMetrics(prev => ({ ...prev, typingJitter: clamp(Math.round(variance), 0, 1000) }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [monitoring])

  useEffect(() => {
    return () => {
      resetState()
    }
  }, [])

  const statusLabel = monitoring
    ? fallbackMode
      ? 'SIMULATED SENSOR ENGINE'
      : 'LIVE LOCAL MONITORING'
    : 'READY TO LAUNCH'

  const statusTone = alertState === 'red' ? 'bg-rose-500/15 text-rose-200 ring-rose-500/30' :
    alertState === 'amber' ? 'bg-amber-500/15 text-amber-200 ring-amber-500/30' :
    'bg-emerald-500/15 text-emerald-200 ring-emerald-500/30'

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100 px-4 py-6 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-slate-900/90 to-transparent opacity-90" />
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="relative z-10 flex flex-col gap-6 rounded-[2rem] border border-slate-700/60 bg-slate-950/95 px-6 py-7 shadow-glow backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-3 rounded-full bg-slate-800/80 px-4 py-2 text-sm text-slate-300 ring-1 ring-slate-500/20">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              AuraSense 2.0 • privacy-first burnout intelligence
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Cyberpunk wellbeing dashboard</p>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Live multimodal burnout & focus intelligence
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                A fully client-side experience that blends camera overlays, keyboard telemetry,
                microphone scoring, and local AI settings — all without leaving the browser.
              </p>
            </div>
          </div>

          <div className={`inline-flex items-center gap-3 rounded-3xl border px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] ${statusTone}`}> 
            <ShieldCheck className="h-4 w-4" />
            {statusLabel}
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="space-y-6 rounded-[2rem] border border-slate-700/60 bg-slate-950/90 p-6 shadow-glow backdrop-blur-xl">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-cyan-300/90">Threat Index</p>
                <h2 className="mt-2 text-5xl font-semibold text-white sm:text-6xl">{burnoutScore}%</h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
                  {alertState === 'red'
                    ? 'Critical risk. Pause your session, reset your posture, and let your body recover.'
                    : alertState === 'amber'
                    ? 'Rising strain. Slow down, breathe, and reduce noise to regain control.'
                    : 'Healthy focus state. Keep the momentum and take intentional micro-breaks.'}
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-slate-700/90 bg-slate-900/95 p-4 text-right shadow-xl shadow-slate-950/20">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Sensor mode</p>
                <p className="mt-3 text-lg font-semibold text-white">{fallbackMode ? 'Fallback' : hasAccess ? 'Live' : 'Idle'}</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">{captureLabel}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-[1.75rem] border border-slate-700/70 bg-slate-900/95 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Visual</p>
                <div className="mt-4 flex items-center gap-3 text-white">
                  <Eye className="h-6 w-6 text-cyan-300" />
                  <div>
                    <p className="text-3xl font-semibold">{Math.round(scoreBreakdown.visualScore)}%</p>
                    <p className="text-sm text-slate-400">Posture + blink analysis</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.75rem] border border-slate-700/70 bg-slate-900/95 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Behavior</p>
                <div className="mt-4 flex items-center gap-3 text-white">
                  <Activity className="h-6 w-6 text-emerald-300" />
                  <div>
                    <p className="text-3xl font-semibold">{Math.round(scoreBreakdown.behavioralScore)}%</p>
                    <p className="text-sm text-slate-400">Typing cadence risk</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.75rem] border border-slate-700/70 bg-slate-900/95 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Acoustic</p>
                <div className="mt-4 flex items-center gap-3 text-white">
                  <Volume2 className="h-6 w-6 text-amber-300" />
                  <div>
                    <p className="text-3xl font-semibold">{Math.round(scoreBreakdown.acousticScore)}%</p>
                    <p className="text-sm text-slate-400">Noise load estimate</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.75rem] border border-slate-700/70 bg-slate-900/95 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Fusion logic</p>
                <p className="mt-4 text-sm leading-7 text-slate-300">{`0.50 × Visual + 0.35 × Behavioral + 0.15 × Acoustic`}</p>
              </div>
              <div className="rounded-[1.75rem] border border-slate-700/70 bg-slate-900/95 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Alert pattern</p>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  {alertState === 'red'
                    ? 'High strain across all sensors.'
                    : alertState === 'amber'
                    ? 'Moderate signal accumulation detected.'
                    : 'Stable performance and ergonomics.'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={launchMonitoring}
                className="inline-flex items-center justify-center gap-2 rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                <Camera className="h-4 w-4" />
                {monitoring ? 'Restart session' : 'Start monitoring'}
              </button>
              <button
                onClick={resetState}
                className="inline-flex items-center justify-center gap-2 rounded-3xl border border-slate-700/80 bg-slate-900/95 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
              >
                <AlertTriangle className="h-4 w-4 text-amber-300" />
                Reset session
              </button>
            </div>
          </article>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-700/60 bg-slate-950/90 p-6 shadow-glow backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/90">Privacy controls</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Local AI & BYOK</h3>
                </div>
                <ShieldCheck className="h-7 w-7 text-emerald-300" />
              </div>

              <div className="mt-5 space-y-4">
                <button
                  type="button"
                  onClick={() => setShowSettings(open => !open)}
                  className="flex w-full items-center justify-between rounded-3xl border border-slate-700/80 bg-slate-900/95 px-4 py-3 text-sm text-slate-200 transition hover:border-slate-500"
                >
                  <span className="inline-flex items-center gap-2 text-slate-100">
                    <Cpu className="h-4 w-4 text-cyan-300" />
                    AI inference preferences
                  </span>
                  <span>{showSettings ? 'Hide' : 'Show'}</span>
                </button>

                {showSettings && (
                  <div className="space-y-3 rounded-3xl border border-slate-700/60 bg-slate-900/95 p-4">
                    <label className="flex items-center justify-between gap-3 text-sm text-slate-200">
                      <span>Local inference only</span>
                      <button
                        type="button"
                        onClick={() => setAiSettings(prev => ({ ...prev, localInference: !prev.localInference }))}
                        className="inline-flex h-9 w-14 items-center rounded-full bg-slate-800 p-1 transition"
                      >
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-950 transition ${aiSettings.localInference ? 'translate-x-6' : 'translate-x-0'}`}>
                          {aiSettings.localInference ? <ToggleLeft className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        </span>
                      </button>
                    </label>
                    <label className="flex items-center justify-between gap-3 text-sm text-slate-200">
                      <span>Bring your own key (BYOK)</span>
                      <button
                        type="button"
                        onClick={() => setAiSettings(prev => ({ ...prev, byokMode: !prev.byokMode }))}
                        className="inline-flex h-9 w-14 items-center rounded-full bg-slate-800 p-1 transition"
                      >
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-950 transition ${aiSettings.byokMode ? 'translate-x-6' : 'translate-x-0'}`}>
                          <KeyRound className="h-4 w-4" />
                        </span>
                      </button>
                    </label>
                    <label className="flex items-center justify-between gap-3 text-sm text-slate-200">
                      <span>Keep keys local</span>
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">{aiSettings.keepKeysLocal ? 'Enabled' : 'Disabled'}</span>
                    </label>
                  </div>
                )}

                <div className="rounded-3xl bg-slate-900/95 p-4 text-sm leading-6 text-slate-300 ring-1 ring-slate-700/60">
                  <p className="font-semibold text-white">Privacy note</p>
                  <p className="mt-2">All processing is client-side only. No video, audio, or keystroke metadata leaves this browser session.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-700/60 bg-slate-950/90 p-6 shadow-glow backdrop-blur-xl">
              <div className="flex items-center gap-3 text-sm uppercase tracking-[0.28em] text-slate-500">
                <Camera className="h-4 w-4 text-cyan-300" />
                Vision overlay status
              </div>
              <div className="mt-4 space-y-4">
                <div className="rounded-3xl bg-slate-900/95 p-4 text-sm text-slate-300">
                  <p className="text-slate-300">{captureLabel}</p>
                  <p className="mt-2 text-xs text-slate-500">{monitoring ? (fallbackMode ? 'Mock fallback is active.' : 'Live camera overlay is rendering.') : 'Start monitoring to show live overlays.'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOverlayEnabled(enabled => !enabled)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-slate-800/95 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  <Eye className="h-4 w-4 text-cyan-300" />
                  {overlayEnabled ? 'Disable overlay' : 'Enable overlay'}
                </button>
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_0.85fr]">
          <article className="overflow-hidden rounded-[2rem] border border-slate-700/60 bg-slate-950/90 shadow-glow backdrop-blur-xl">
            <div className="relative h-[420px] min-h-[24rem]" ref={wrapperRef}>
              <div className="absolute inset-0 overflow-hidden rounded-[2rem] bg-slate-900/90">
                {fallbackMode ? (
                  <div className="absolute inset-0 animate-gradient-slow bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(232,121,249,0.12),transparent_26%)]" />
                ) : (
                  <video
                    ref={videoRef}
                    className="absolute inset-0 h-full w-full object-cover"
                    playsInline
                    muted
                    autoPlay
                  />
                )}
                <canvas ref={canvasRef} className="absolute inset-0 h-full w-full mix-blend-screen" />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 to-transparent px-6 py-4 text-slate-200">
                <p className="text-sm font-medium">{fallbackMode ? 'Secure simulation engine active' : 'Live camera overlay rendering'}</p>
              </div>
            </div>
          </article>

          <article className="space-y-4 rounded-[2rem] border border-slate-700/60 bg-slate-950/90 p-6 shadow-glow backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/90">Signal feed</p>
                <h3 className="text-2xl font-semibold text-white">Motion + posture</h3>
              </div>
              <button
                type="button"
                onClick={() => setOverlayEnabled(enabled => !enabled)}
                className="rounded-3xl border border-slate-700/80 bg-slate-900/95 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
              >
                {overlayEnabled ? 'Hide overlays' : 'Show overlays'}
              </button>
            </div>

            <div className="grid gap-4">
              <div className="rounded-3xl border border-slate-700/70 bg-slate-900/95 p-4">
                <p className="text-sm text-slate-400">Live trend</p>
                <p className="mt-2 text-xl font-semibold text-white">{metrics.movementLabel}</p>
                <p className="mt-1 text-sm text-slate-500">Score {metrics.motionScore}</p>
              </div>
              <div className="rounded-3xl border border-slate-700/70 bg-slate-900/95 p-4">
                <p className="text-sm text-slate-400">Facial confidence</p>
                <p className="mt-2 text-xl font-semibold text-white">{Math.round(metrics.faceConfidence * 100)}%</p>
              </div>
              <div className="rounded-3xl border border-slate-700/70 bg-slate-900/95 p-4">
                <p className="text-sm text-slate-400">Head angle</p>
                <p className="mt-2 text-xl font-semibold text-white">{metrics.headAngle}°</p>
              </div>
              <div className="rounded-3xl border border-slate-700/70 bg-slate-900/95 p-4">
                <p className="text-sm text-slate-400">Eye aspect ratio</p>
                <p className="mt-2 text-xl font-semibold text-white">{metrics.eyeAspect.toFixed(2)}</p>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-[2rem] border border-slate-700/60 bg-slate-950/90 p-6 shadow-glow backdrop-blur-xl">
            <div className="flex items-center gap-3 text-sm uppercase tracking-[0.3em] text-slate-500">
              <Info className="h-4 w-4 text-slate-300" />
              How it works
            </div>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
              <p>
                AuraSense blends local sensor telemetry with simulated visual intelligence. It draws camera-friendly overlays in-browser, estimates ergonomic risk, and fuses it into a single burnout index.
              </p>
              <p>
                Local AI settings keep model behavior on-device. When permissions are unavailable, the mock fallback engine preserves the experience and protects privacy.
              </p>
              <p>
                The dashboard supports signal fusion across three modalities: visual posture, typing behavior, and ambient audio pressure.
              </p>
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-700/60 bg-slate-950/90 p-6 shadow-glow backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/90">Integration ready</p>
                <h3 className="mt-1 text-2xl font-semibold text-white">Deployment & fallback</h3>
              </div>
              <Sparkles className="h-6 w-6 text-emerald-300" />
            </div>
            <div className="mt-6 grid gap-4">
              <div className="rounded-3xl border border-slate-700/70 bg-slate-900/95 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">Mock fallback</span>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">Enabled</span>
                </div>
                <p className="mt-3 text-sm text-slate-300">The app stays usable even when hardware permission is blocked. Core metrics remain visible and privacy is preserved.</p>
              </div>
              <div className="rounded-3xl border border-slate-700/70 bg-slate-900/95 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">BYOK readiness</span>
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">Ready</span>
                </div>
                <p className="mt-3 text-sm text-slate-300">Keep your own encryption keys local and use private AI settings without sending secrets to external services.</p>
              </div>
            </div>
          </article>
        </section>

        <footer className="rounded-[2rem] border border-slate-700/60 bg-slate-950/90 p-6 text-sm text-slate-400 shadow-glow backdrop-blur-xl">
          Built with React + Vite. All telemetry processing remains in the browser, and no user data is stored by AuraSense.
        </footer>
      </div>
    </div>
  )
}
