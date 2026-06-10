# SpecKit: AuraSense — Multi-Modal Digital Burnout & Focus Optimizer

## 1. Project Overview
AuraSense is a browser-native wellness companion for remote engineers and hybrid knowledge workers. It runs entirely client-side and combines acoustic, behavioral, and ergonomic signals to detect early burnout and guide users toward safe focus states.

## 2. Problem Statement
Remote professionals often endure long screen sessions, noisy environments, and erratic typing behavior without any privacy-safe way to detect early strain. Existing health tools are typically cloud-first, hardware-dependent, or require manual user input, which makes them unsuitable for fast-paced software workflows.

## 3. Solution
AuraSense provides a zero-server, browser-based monitoring layer that evaluates local wellness signals across three dimensions:

- **Acoustic Stress** — local microphone audio is analyzed through the Web Audio API to derive an approximate noise impact score.
- **Behavioral Friction** — keyboard cadence, timing variance, and backspace frequency are tracked to capture cognitive friction and typing stress.
- **Ergonomic Load** — simulated eye blink and screen-distance values represent posture and visual strain until a camera-based engine is added.

The system merges these signals into a normalized **Burnout Threat Index** and displays a transparent alert state: GREEN, AMBER, or RED.

## 4. Current Implementation
### Built today
- React 19 + Vite frontend for fast iteration
- Web Audio API analyzer using microphone input for local sound level estimation
- Typing behavior engine using `keydown` events for jitter and backspace counts
- Placeholder visual metrics engine for blink rate and posture distance
- Fusion engine combining signals into a live burnout score
- Color-coded risk display with contextual alert messaging

### How the triage math works
- `visualScore` is based on screen distance and blink frequency
- `behavioralScore` is based on typing jitter and backspace activity
- `acousticScore` is based on measured audio levels
- Final score uses a weighted mix: `0.50*visual + 0.35*behavioral + 0.15*acoustic`

## 5. Product Scope
### MVP
- Permission prompt for microphone (and optional camera)
- Live burnout score indicator
- Acoustic and typing behavior telemetry
- Local-only analysis in the browser

### Stretch goals
- Add MediaPipe FaceMesh for real posture and blink detection
- Persist trends in IndexedDB for daily self-reflection
- Add guided breaks and ergonomic coaching when the score enters RED

## 6. Success Criteria
- The app launches in a browser and starts telemetry after permissions are granted
- The dashboard updates with a live burnout score and alert state
- Acoustic, behavioral, and ergonomic metrics are visible and meaningful
- No external telemetry is required for core functionality

## 7. Implementation Plan
1. Establish app shell, permissions flow, and dashboard layout
2. Build audio analysis and keyboard telemetry engines
3. Implement the fusion calculation and alert states
4. Polish UI cards, status indicators, and onboarding copy
5. Validate with live input scenarios and refine threshold behavior

## 8. Future Enhancements
- Full camera-based eye aspect ratio and posture tracking
- Local session analytics and trend history
- Adaptive coaching prompts and ergonomic reset guidance
- Desktop companion layer for cross-app focus monitoring
