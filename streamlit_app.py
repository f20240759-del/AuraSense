import random
import streamlit as st

st.set_page_config(page_title='AuraSense', layout='wide')

if 'monitoring' not in st.session_state:
    st.session_state.monitoring = False
    st.session_state.metrics = {
        'db': 35,
        'typingJitter': 0,
        'backspaceCount': 0,
        'screenDistance': 0.98,
        'blinkCount': 12,
    }

if 'burnoutScore' not in st.session_state:
    st.session_state.burnoutScore = 0
    st.session_state.alertState = 'GREEN'


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def compute_score(metrics):
    acoustic_score = 100 if metrics['db'] > 68 else (metrics['db'] / 68) * 60
    behavioral_score = clamp((metrics['typingJitter'] / 600) * 70 + metrics['backspaceCount'] * 4, 0, 100)
    visual_score = 100 if metrics['screenDistance'] > 1.25 else 85 if metrics['blinkCount'] < 6 else 25
    total = round(0.5 * visual_score + 0.35 * behavioral_score + 0.15 * acoustic_score)
    normalized = clamp(total, 0, 100)
    alert_state = 'RED' if normalized > 75 else 'AMBER' if normalized > 45 else 'GREEN'
    return normalized, alert_state


def simulate_metrics():
    return {
        'db': random.randint(30, 90),
        'typingJitter': random.randint(5, 180),
        'backspaceCount': random.randint(0, 9),
        'screenDistance': round(random.uniform(0.95, 1.35), 2),
        'blinkCount': random.randint(4, 18),
    }


def update_metrics():
    st.session_state.metrics = simulate_metrics()
    st.session_state.burnoutScore, st.session_state.alertState = compute_score(st.session_state.metrics)


def start_monitoring():
    st.session_state.monitoring = True
    update_metrics()


def stop_monitoring():
    st.session_state.monitoring = False


st.markdown('### AuraSense Streamlit Local Preview')
st.write('A fallback local website mode for AuraSense when web hosting is not available. This preview simulates burnout telemetry and explains how the app works.')

status_color = 'green' if st.session_state.alertState == 'GREEN' else 'orange' if st.session_state.alertState == 'AMBER' else 'red'

col1, col2 = st.columns([1.8, 1.2])
with col1:
    st.subheader('Burnout Threat Index')
    st.metric(label='', value=f"{st.session_state.burnoutScore}%", delta='Live simulated score')
    st.markdown(f"<div style='padding: 10px; border-radius: 12px; background: rgba(0, 0, 0, 0.05); color: {status_color}; font-weight: 700;'>Current state: {st.session_state.alertState}</div>", unsafe_allow_html=True)
    st.write({
        'GREEN': 'Optimal state — keep the current pace and breathe.',
        'AMBER': 'Warning state — reduce strain and reset focus.',
        'RED': 'High risk — take a screen break and realign posture.',
    }[st.session_state.alertState])

    button_col1, button_col2 = st.columns(2)
    with button_col1:
        if st.button('Start Monitoring', disabled=st.session_state.monitoring):
            start_monitoring()
    with button_col2:
        if st.button('Stop Monitoring', disabled=not st.session_state.monitoring):
            stop_monitoring()

    if st.session_state.monitoring:
        if st.button('Refresh Metrics'):
            update_metrics()
        st.success('Monitoring running locally. Press refresh for new simulated values.')
    else:
        st.info('Monitoring is paused. Start to simulate the burnout dashboard locally.')

with col2:
    st.write('---')
    st.subheader('Current Metrics')
    st.write(f"**Acoustic Stress:** {st.session_state.metrics['db']} dB")
    st.write(f"**Typing Jitter:** {st.session_state.metrics['typingJitter']} ms")
    st.write(f"**Backspace Count:** {st.session_state.metrics['backspaceCount']}")
    erg_status = 'Slouching' if st.session_state.metrics['screenDistance'] > 1.2 else 'Optimal'
    st.write(f"**Visual Ergonomics:** {erg_status}")

st.write('---')

with st.expander('How It Works', expanded=True):
    st.write('AuraSense combines three local signals to estimate burnout risk:')
    st.write('- **Acoustic Modality:** Uses microphone/ambient noise simulation to estimate environmental stress.')
    st.write('- **Behavioral Modality:** Simulates typing cadence and backspace patterns to reflect cognitive load.')
    st.write('- **Visual Modality:** Simulates screen distance and blink frequency to model posture and eye strain.')
    st.write('The app blends these streams into a single score in the browser, keeping processing local to your device.')

with st.expander('Burnout Levels', expanded=True):
    st.markdown('### GREEN — Optimal Focus State')
    st.write('You are in a calm and productive mode. Maintain your current habits and take regular breaks to stay balanced.')
    st.markdown('### AMBER — Warning State')
    st.write('Minor stressors are present. Adjust your workspace, reduce noise, and take a short pause.')
    st.markdown('### RED — Critical Burnout State')
    st.write('Stress indicators are high. Step away from the screen, breathe deeply, and reset before returning.')

st.write('---')
st.write('**Run locally:** `streamlit run streamlit_app.py`')
st.write('This is a fallback preview; the full React version is in `src/App.jsx` for browser-native telemetry.')
