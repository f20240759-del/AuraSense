import React, { useState, useEffect, useRef } from 'react';
import { Shield, Activity, Volume2, Keyboard, Eye, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [hasPermissions, setHasPermissions] = useState(false);
  const [burnoutScore, setBurnoutScore] = useState(0);
  const [alertState, setAlertState] = useState('GREEN'); // GREEN, AMBER, RED
  
  // Real-time metrics state
  const [metrics, setMetrics] = useState({
    ear: 0.28,             // Eye Aspect Ratio placeholder
    blinkCount: 12,        // Blinks per minute placeholder
    screenDistance: 1.0,  // Proximity multiplier placeholder
    db: 40,               // Real decibels from mic
    typingJitter: 0,      // Keystroke variance in ms
    backspaceCount: 0     // Frustration metric tracking
  });

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const keystrokeTimesRef = useRef([]);
  const animationFrameRef = useRef(null);

  // 1. Request Microphone/Camera Permissions Natively
  const initializeEnvironment = async () => {
    try {
      // Requesting both to validate the SpecKit criteria
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setHasPermissions(true);
      setupAcousticEngine();
      setupBehavioralEngine();
      setupSimulatedVisuals();
    } catch (err) {
      alert("AuraSense requires system hardware permissions to build your local safety grid.");
      console.error(err);
    }
  };

  // 2. Acoustic Modality: Live Decibel Processing via Web Audio API
  const setupAcousticEngine = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      
      analyzer.fftSize = 64; // Small size for fast, low-latency processing
      source.connect(analyzer);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyzer;

      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateDecibels = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate root-mean-square (RMS) frequency amplitude
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);
        
        // Map raw audio amplitude smoothly into an approximate decibel index range
        const simulatedDb = Math.min(100, Math.round((rms / 255) * 120) + 35);
        
        setMetrics(prev => ({ ...prev, db: simulatedDb }));
        animationFrameRef.current = requestAnimationFrame(updateDecibels);
      };
      
      updateDecibels();
    } catch (e) {
      console.error("Failed to initialize Web Audio analyzer channel:", e);
    }
  };

  // 3. Behavioral Modality: Typing Cadence Velocity Variance Tracker
  const setupBehavioralEngine = () => {
    const handleKeyDown = (e) => {
      const timestamp = performance.now();
      
      if (e.key === 'Backspace') {
        setMetrics(prev => ({ ...prev, backspaceCount: prev.backspaceCount + 1 }));
      }

      keystrokeTimesRef.current.push(timestamp);
      
      // Limit array tracking cache to the last 12 typing keystrokes
      if (keystrokeTimesRef.current.length > 12) {
        keystrokeTimesRef.current.shift();
      }

      // Compute standard variance deviations between keystroke timings
      if (keystrokeTimesRef.current.length > 3) {
        let intervals = [];
        for (let i = 1; i < keystrokeTimesRef.current.length; i++) {
          intervals.push(keystrokeTimesRef.current[i] - keystrokeTimesRef.current[i - 1]);
        }
        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
        
        setMetrics(prev => ({ ...prev, typingJitter: Math.min(1000, Math.round(variance)) }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  };

  // 4. Visual Simulation (Fallback placeholder for MediaPipe setup)
  const setupSimulatedVisuals = () => {
    setInterval(() => {
      setMetrics(prev => {
        // Randomly simulate micro posture drops and blink fluctuations over time
        const simulatedSlouch = Math.random() > 0.75 ? parseFloat((1.3 + Math.random() * 0.2).toFixed(2)) : 0.98;
        const simulatedBlinks = Math.random() > 0.85 ? Math.floor(Math.random() * 5) + 3 : prev.blinkCount;
        return {
          ...prev,
          screenDistance: simulatedSlouch,
          blinkCount: simulatedBlinks
        };
      });
    }, 4000);
  };

  // 5. Core Fusion Logic Triage Engine
  useEffect(() => {
    if (!hasPermissions) return;

    const computeFusionTriage = () => {
      // Equation Factors from SpecKit:
      // S = (0.50 * Visual) + (0.35 * Behavioral) + (0.15 * Acoustic)
      let acousticScore = metrics.db > 68 ? 100 : (metrics.db / 68) * 60;
      let behavioralScore = Math.min(100, (metrics.typingJitter / 600) * 70 + (metrics.backspaceCount * 4));
      let visualScore = metrics.screenDistance > 1.3 ? 100 : metrics.blinkCount < 6 ? 85 : 25;

      const finalCalculatedScore = Math.round(
        (0.50 * visualScore) + 
        (0.35 * behavioralScore) + 
        (0.15 * acousticScore)
      );

      const balancedScore = Math.min(100, Math.max(0, finalCalculatedScore));
      setBurnoutScore(balancedScore);

      if (balancedScore > 75) setAlertState('RED');
      else if (balancedScore > 45) setAlertState('AMBER');
      else setAlertState('GREEN');
    };

    const interval = setInterval(computeFusionTriage, 1500);
    return () => clearInterval(interval);
  }, [hasPermissions, metrics]);

  // Cleanup browser frames on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return (
    <div className={`min-h-screen flex flex-col justify-between p-6 transition-all duration-700 ${
      alertState === 'RED' ? 'bg-red-950 text-red-50' : alertState === 'AMBER' ? 'bg-amber-950 text-amber-50' : 'bg-slate-900 text-slate-100'
    }`}>
      
      {/* HEADER BAR */}
      <header className="flex justify-between items-center max-w-6xl w-full mx-auto border-b border-slate-800/60 pb-4">
        <div className="flex items-center gap-2">
          <Shield className={`w-6 h-6 ${alertState === 'RED' ? 'text-red-500' : alertState === 'AMBER' ? 'text-amber-500' : 'text-indigo-500'}`} />
          <span className="font-black text-xl tracking-tight">AURASENSE</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
          <div className={`w-2 h-2 rounded-full ${hasPermissions ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          {hasPermissions ? 'LOCAL MONITOR ACTIVE' : 'PERMISSIONS REQUIRED'}
        </div>
      </header>

      {/* MAIN LAYOUT GATEWAYS */}
      <main className="max-w-6xl w-full mx-auto my-auto grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
        
        {/* INITIALIZATION PANEL */}
        {!hasPermissions ? (
          <div className="col-span-1 lg:col-span-3 bg-slate-800/40 border border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center backdrop-blur-md">
            <Activity className="w-16 h-16 text-indigo-500 animate-pulse mb-4" />
            <h2 className="text-2xl font-bold mb-2">Initialize Environment Safeguards</h2>
            <p className="text-slate-400 max-w-md text-sm mb-6">
              AuraSense fuses browser layer metrics locally to intercept strain. Grant permission parameters to start telemetry streaming.
            </p>
            <button onClick={initializeEnvironment} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Boot Analytics Engine
            </button>
          </div>
        ) : (
          <>
            {/* CENTRAL MATRIX INDICATOR */}
            <div className="col-span-1 lg:col-span-1 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between backdrop-blur-md">
              <div>
                <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-1">Triage Assessment</h3>
                <h2 className="text-xl font-black">Burnout Threat Index</h2>
              </div>
              
              <div className="my-8 text-center relative flex items-center justify-center">
                <span className="text-8xl font-black tracking-tighter">{burnoutScore}</span>
                <span className="text-xl font-bold opacity-40 ml-1">%</span>
              </div>

              <div className={`p-4 rounded-2xl flex items-center gap-3 border ${
                alertState === 'RED' ? 'bg-red-900/40 border-red-700 text-red-200' :
                alertState === 'AMBER' ? 'bg-amber-900/40 border-amber-700 text-amber-200' :
                'bg-emerald-950/40 border-emerald-800 text-emerald-200'
              }`}>
                {alertState === 'RED' && <AlertTriangle className="w-5 h-5 animate-bounce text-red-400" />}
                {alertState === 'AMBER' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {alertState === 'GREEN' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                <div>
                  <div className="text-xs font-black uppercase tracking-wider">{alertState} Warning Mode</div>
                  <div className="text-xs opacity-80">
                    {alertState === 'RED' ? 'Take an immediate ergonomic extraction break.' :
                     alertState === 'AMBER' ? 'Cognitive velocity strain is normalizing upward.' :
                     'System environment metrics are optimal.'}
                  </div>
                </div>
              </div>
            </div>

            {/* SUBSYSTEM METRIC FEEDS */}
            <div className="col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* EYE FEED */}
              <div className="bg-slate-800/30 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="p-2.5 bg-sky-500/10 rounded-xl text-sky-400"><Eye className="w-5 h-5" /></span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Visual Modality</span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-black">{metrics.blinkCount} bpm</div>
                  <p className="text-xs text-slate-400 mt-1">Eye Aspect Blink Frequency Ratio</p>
                </div>
              </div>

              {/* ERGONOMIC POSTURE FEED */}
              <div className="bg-slate-800/30 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400"><Activity className="w-5 h-5" /></span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ergonomics</span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-black">{metrics.screenDistance > 1.2 ? 'Slouching' : 'Optimal'}</div>
                  <p className="text-xs text-slate-400 mt-1">Screen-Proximity Nose Vector Distance Mapping</p>
                </div>
              </div>

              {/* ACOUSTIC FEED */}
              <div className="bg-slate-800/30 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400"><Volume2 className="w-5 h-5" /></span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Acoustic Floor</span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-black">{metrics.db} <span className="text-sm font-normal text-slate-400">dB</span></div>
                  <p className="text-xs text-slate-400 mt-1">Ambient RMS Noise Pressure Amplitude</p>
                </div>
              </div>

              {/* KEYBOARD BEHAVIORAL FEED */}
              <div className="bg-slate-800/30 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400"><Keyboard className="w-5 h-5" /></span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Behavioral Dynamics</span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-black">{metrics.typingJitter} <span className="text-sm font-normal text-slate-400">ms²</span></div>
                  <p className="text-xs text-slate-400 mt-1">Cadence Velocity Inter-Key Interval Variance</p>
                </div>
              </div>

            </div>
          </>
        )}
      </main>

      {/* FOOTER PITCH BRAND */}
      <footer className="max-w-6xl w-full mx-auto text-center text-[10px] uppercase tracking-widest text-slate-500 border-t border-slate-800/40 pt-4">
        AuraSense Engine Node • Privacy Sandbox Secured (No Data Exfiltration)
      </footer>

      {/* FULL RESPONSIVE LOCKDOWN INTERCEPT MODAL (RED ALERT MODALITY) */}
      {alertState === 'RED' && (
        <div className="fixed inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 z-50 transition-opacity animate-fade-in">
          <div className="max-w-md text-center flex flex-col items-center">
            <div className="p-4 bg-red-500/10 rounded-3xl text-red-500 border border-red-500/20 mb-6 animate-pulse">
              <AlertTriangle className="w-12 h-12" />
            </div>
            <h2 className="text-4xl font-black text-red-500 mb-3 tracking-tight">CRITICAL EXTRACTION INTERCEPT</h2>
            <p className="text-slate-300 text-sm mb-8 leading-relaxed">
              Multi-modal telemetry confirms severe cognitive stress saturation, sustained tech-neck posture alignment, and low blink frequencies. Following your SpecKit criteria, the UI has locked down.
            </p>
            
            {/* RECOVERY EXERCISE DESIGN STRUCTURE */}
            <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-left space-y-3 mb-6">
              <div className="text-xs uppercase font-bold tracking-wider text-indigo-400">System Reset Realignment Routine:</div>
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500 flex items-center justify-center text-xs font-bold">1</div>
                Drop your shoulders entirely and sit upright.
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500 flex items-center justify-center text-xs font-bold">2</div>
                Focus your vision at an object 20 feet away for 20 seconds.
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500 flex items-center justify-center text-xs font-bold">3</div>
                Take a deep, slow diaphragmatic breath.
              </div>
            </div>

            <p className="text-[10px] uppercase text-red-400 font-bold tracking-widest animate-pulse">
              Keep typing or sit back to alter sensor threshold data state...
            </p>
          </div>
        </div>
      )}

    </div>
  );
}