const translations = {
  en: {
    title: 'AuraSense',
    subtitle: 'Browser-native burnout & focus monitoring',
    intro: 'A lightweight client-side safety dashboard that tracks local audio, typing behavior, and ergonomic state in real time.',
    start: 'Start Monitoring',
    stop: 'Stop Monitoring',
    burnoutLabel: 'Burnout Threat Index',
    cameraCaptureActive: 'Camera capture active',
    movementSnapshot: 'Movement snapshot',
    showLines: 'Show Lines',
    hideLines: 'Hide Lines',
    explainScore: 'Explain Score',
    settings: 'Settings',
    enableLocalAI: 'Enable Local AI (Ollama)',
    byok: 'Use BYOK Token',
    aiResponsePlaceholder: 'AI explanation will appear here.',
  },
  hi: {
    title: 'ऑरा सेंस',
    subtitle: 'ब्राउज़र-आधारित बर्नआउट और फोकस मॉनिटरिंग',
    intro: 'एक हल्का क्लाइंट-साइड डैशबोर्ड जो स्थानीय ऑडियो, टाइपिंग व्यवहार और एर्गोनोमिक स्थिति को वास्तविक समय में ट्रैक करता है।',
    start: 'मॉनिटरिंग शुरू करें',
    stop: 'मॉनिटरिंग रोकें',
    burnoutLabel: 'बर्नआउट खतरा सूचक',
    cameraCaptureActive: 'कैमरा कैप्चर सक्रिय',
    movementSnapshot: 'गतिविधि स्नैपशॉट',
    showLines: 'लाइन दिखाएँ',
    hideLines: 'लाइन छिपाएँ',
    explainScore: 'स्कोर समझाएँ',
    settings: 'सेटिंग्स',
    enableLocalAI: 'लोकल एआई सक्षम करें (Ollama)',
    byok: 'BYOK टोकन का उपयोग करें',
    aiResponsePlaceholder: 'एआई स्पष्टीकरण यहाँ दिखाई देगा।',
  },
  ta: {
    title: 'ஓரா சென்ஸ்',
    subtitle: 'உலாவி அடிப்படையிலான தனர் பறிப்பு மற்றும் கவனம் கண்காணிப்பு',
    intro: 'உலாவியில் உள்ள ஒலி, தட்டச்சு நடத்தைகள் மற்றும் உடல் நிலையை நேரடியாக கண்காணிக்கும் லைட்-வெயிட் கிளையன்ட் சாதனம்.',
    start: 'கண்காணிப்பு தொடங்கு',
    stop: 'கண்காணிப்பு நிறுத்து',
    burnoutLabel: 'மனச்சோர்வு அபாய குறியீடு',
    cameraCaptureActive: 'கேமரா கைப்பிடி செயல்படுகிறது',
    movementSnapshot: 'சலனம் ஸ்நாப்ஷாட்',
    showLines: 'வரிகளை காண்பி',
    hideLines: 'வரிகளை மறை',
    explainScore: 'மதிப்பை விளக்கவும்',
    settings: 'அமைப்புகள்',
    enableLocalAI: 'இலங்கை AI (Ollama) செயல்படுத்தவும்',
    byok: 'BYOK டோக்கன் பயன்படுத்தు',
    aiResponsePlaceholder: 'AI விளக்கம் இங்கே தோன்றும்.',
  }
}

export function t(lang, key) {
  return (translations[lang] && translations[lang][key]) || (translations.en && translations.en[key]) || key
}

export const availableLangs = ['en', 'hi', 'ta']

export default translations
