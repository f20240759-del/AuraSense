# AuraSense

AuraSense is a privacy-first, browser-native digital burnout and focus optimizer for remote workers and software engineers. It runs entirely client-side in React + Vite and combines acoustic, behavioral, and ergonomic signals to surface a live Burnout Threat Index without sending any telemetry to the cloud.

## What AuraSense does

- Tracks ambient audio using the Web Audio API
- Monitors typing cadence and backspace-driven frustration behavior
- Simulates visual posture and blink metrics as placeholders for future FaceMesh integration
- Computes a live burnout score and displays GREEN / AMBER / RED warning states
- Keeps all analysis in the browser for local-only safety monitoring

## Key features

- `Audio Analyzer` using microphone input and RMS amplitude mapping
- `Behavioral Tracker` using `keydown` events for typing jitter and error tracking
- `Local Fusion Engine` that combines acoustic, behavioral, and visual metrics
- `Permission-first onboarding` for camera and microphone access
- Built with **React 19** and **Vite** for fast development

## Getting started

```bash
npm install
npm run dev
```

Open the local development URL shown by Vite, then allow microphone and webcam access when prompted.

## Available scripts

- `npm run dev` — start the local development server
- `npm run build` — build the production bundle
- `npm run lint` — run ESLint across the source files
- `npm run preview` — preview the production build

## How it works

The current AuraSense implementation combines three telemetry domains:

1. **Acoustic** — microphone input is analyzed with the Web Audio API to estimate local decibel levels.
2. **Behavioral** — keystroke timing variance and backspace frequency are tracked to detect frustration.
3. **Visual** — eye and posture values are currently simulated as an ergonomics placeholder.

A weighted triage engine calculates the final burnout score and updates the alert state.

## Notes

- The app requires a secure context (`http://localhost` or HTTPS) for media permissions.
- Current visual metrics are simulated, while audio and typing telemetry are live.
- No raw audio or keystroke data is uploaded; all evaluation happens inside the browser.

## Roadmap

- Add MediaPipe FaceMesh integration to enable live eye aspect ratio and posture tracking
- Store session trends locally with IndexedDB for daily wellness insights
- Add guided breathing and posture correction suggestions when the score enters RED mode
