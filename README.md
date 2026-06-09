# AuraSense: Multi-Modal Digital Burnout & Focus Optimizer

AuraSense is a privacy-first, client-side safety system that monitors visual, behavioral, and acoustic signs of digital strain and cognitive burnout to protect remote workers and software engineers in real-time.

## 🚨 The Real-World Problem
Remote workers and software engineers suffer from massive digital burnout. Due to high-intensity screen time, individuals suffer from "tech-neck" (severe posture degradation), acute eye strain, and escalating stress levels without realizing it until physical symptoms or tension headaches manifest. Existing health trackers require external hardware (smartwatches/wearables) and send sensitive data to the cloud. There is no lightweight, zero-server solution that fuses immediate physical and behavioral telemetry directly inside the browser.

## 💡 Our Solution
AuraSense acts as an ambient, edge-computing well-being guardian running entirely within the browser sandbox. It handles multi-modal sensor fusion across three distinct user vectors:

1. **Visual Modality (Computer Vision):** Utilizes client-side FaceMesh tracking to monitor eye-blink frequency (detecting dry eye strains) and calculates user screen proximity to flag slouching.
2. **Behavioral Modality (Input Streams):** Tracks keyboard cadence variance and mouse cursor jitter to mathematically capture escalating frustration and cognitive friction.
3. **Acoustic Modality (Web Audio API):** Samples local room frequency amplitudes to track ambient environmental noise pollution over a 65dB threshold without recording speech strings.

When threshold parameters cross safe limits, the application triggers subtle browser-level UI shifts or a low-frequency ambient chime, guiding the user through a rapid 20-second physical realignment protocol.

## 🛠️ Tech Stack
- **Frontend Architecture:** React.js / Next.js
- **Styling UI:** Tailwind CSS
- **Edge Analytics Engines:** MediaPipe FaceMesh API, Web Audio API
- **Local Data State:** Web IndexedDB (Offline-first / Local Client Cache)

## 📐 System Architecture