# SpecKit: AuraSense — Multi-Modal Digital Burnout & Focus Optimizer

## 1. Project Name & One-Liner
* **Project Name:** AuraSense
* **Elevator Pitch:** A privacy-first, client-side safety system running entirely within the browser sandbox that fuses computer vision, keystroke dynamics, and acoustic thresholds to track, triage, and mitigate digital eye strain, posture degradation, and cognitive burnout for remote workers in real-time.

## 2. Problem Statement
Digital burnout and physical strain among software engineers and remote workers are treated as passive issues until they cause physical injury (e.g., tension headaches, carpal tunnel, chronic tech-neck, dry-eye syndrome). Existing health solutions are heavily flawed: they either require intrusive wearable hardware (smartwatches), require manual user logging, or compromise privacy by sending raw video/audio feeds to third-party cloud servers. There is an urgent need for an automated, zero-server, privacy-centric application that silently measures multiple behavioral vectors natively inside the browser to catch cognitive exhaustion before it manifests physically.

## 3. Proposed Solution
AuraSense introduces a client-side Multi-Modal Sensor Fusion architecture that functions entirely inside volatile browser memory. It evaluates user wellness across three distinct analytical pillars:

- **Visual Impairment (MediaPipe FaceMesh):** Captures the webcam stream locally to calculate the Eye Aspect Ratio (EAR) to detect eye strain/low blink frequencies. Simultaneously tracks facial bounding boxes to measure screen-to-nose proximity, immediately flagging ergonomic slouching ("tech-neck").
- **Behavioral Impairment (DOM Event Listeners):** Continuously monitors background `keydown` and `mousemove` events to calculate typing cadence variance and cursor acceleration shifts. Erratic mouse movements and highly volatile typing bursts are mathematically mapped to track rising user frustration and cognitive load.
- **Acoustic Stressors (Web Audio API):** Samples local environment sound pressure levels through the browser’s `AnalyserNode`. It extracts root-mean-square (RMS) decibel values to cross-reference persistent environmental noise pollution (above 65dB) without recording any actual spoken speech strings.

**The Fusion Logic:** The system processes these streams through a local weighted state machine. If eye strain is high, posture is collapsed, and typing velocity variance spikes, the app upgrades the user's status to a critical "Burnout Risk Score." This triggers an ambient browser chime and generates a smooth CSS overlay guiding the user through a 20-second physical realignment and breathing protocol.

## 4. Technical Architecture & Stack

| Layer | Technology / Component | Role |
| :--- | :--- | :--- |
| **Frontend UI** | React.js / Next.js & Tailwind CSS | Renders the real-time health telemetry dashboard, alert states, and responsive relaxation menus. |
| **Client Edge Engines** | MediaPipe FaceMesh API | Runs local computer vision tracking for blink rates and posture distance mapping directly on the CPU/GPU. |
| **Telemetry Capture** | Web Audio API & DOM Event Listeners | Non-intrusively tracks local decibel amplitudes, typing cadence variance, and cursor acceleration vectors. |
| **Local Storage** | Browser IndexedDB | Stores local, daily historical trends for user self-reflection without syncing data to external servers. |
| **Analytics Engine** | Client-Side Weighted State Machine | Merges multi-modal telemetry inputs into a unified user burnout risk score every 60 seconds. |

## 5. Scope & Milestones (Hackathon Execution Plan)

### Phase 1: Setup & Canvas Architecture (Hours 0-2)
* Initialize GitLab repository with modular Next.js/Tailwind boilerplate.
* Configure browser media permissions (Webcam and Microphone authorization prompts).
* Establish basic layout components for the main telemetry dashboard.

### Phase 2: Client-Side Telemetry Engines (Hours 2-5)
* Integrate MediaPipe FaceMesh to pull live webcam streams into a hidden HTML5 canvas, extracting EAR (Eye Aspect Ratio) values.
* Implement DOM event listeners to capture `delta-t` spacing between keystrokes and calculate mouse jitter index.
* Mount Web Audio API analyzer to stream decibel thresholds.

### Phase 3: The Fusion & Triage Engine (Hours 5-7)
* Write the JavaScript mathematical state machine to calculate the unified Burnout Risk Score based on weighted metrics.
* Implement local state triggers that update the dashboard UI from Green (Optimal) to Amber (Warning) or Red (Critical) based on score thresholds.

### Phase 4: Interactive Mitigation & Local Storage (Hours 7-9)
* Build the full-screen "Realignment Overlay" that intercepts the screen when Red alerts trigger.
* Connect telemetry logs to a local browser IndexedDB instances to track historical daily performance securely.

### Phase 5: Testing & Validation (Hours 9-12)
* Conduct end-to-end local testing. Simulate slouching, forced staring, and erratic inputs to ensure threshold triggers alert properly.
* Clean up UI transitions and host the application via a static deployment platform (Vercel/Netlify) for the final live judge evaluation.

## 6. Future Enhancements (Post-Hackathon)
* **Custom AI Micro-Models:** Move past rigid weighted math formulas and integrate a local ONNX runtime to classify personalized stress signatures using localized custom-trained models.
* **Cross-Application Tracking:** Build a companion Electron-based desktop application framework to allow tracking metrics to function seamlessly even when the browser window is fully closed or minimized.
* **Smart IoT Room Integrations:** Connect the system via local WebSockets to smart home frameworks (like Home Assistant), allowing room lights to dim or desk positions to shift automatically when burnout metrics surge.