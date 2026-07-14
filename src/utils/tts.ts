const AUTO_SPEAK_KEY = 'japanese-speaking-auto-tts'

let voiceReady = false

function getVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis.getVoices()
}

function pickJapaneseVoice(): SpeechSynthesisVoice | null {
  const voices = getVoices()
  const japanese = voices.filter((v) => v.lang.toLowerCase().startsWith('ja'))

  return (
    japanese.find((v) => v.lang === 'ja-JP' && v.localService) ??
    japanese.find((v) => v.lang === 'ja-JP') ??
    japanese.find((v) => v.default) ??
    japanese[0] ??
    null
  )
}

function ensureVoicesLoaded(): Promise<SpeechSynthesisVoice | null> {
  return new Promise((resolve) => {
    const voice = pickJapaneseVoice()
    if (voice) {
      voiceReady = true
      resolve(voice)
      return
    }

    const onVoicesChanged = () => {
      const loaded = pickJapaneseVoice()
      if (loaded) {
        voiceReady = true
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
        resolve(loaded)
      }
    }

    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged)
    window.speechSynthesis.getVoices()

    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
      resolve(pickJapaneseVoice())
    }, 500)
  })
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function loadAutoSpeakPreference(): boolean {
  try {
    const raw = localStorage.getItem(AUTO_SPEAK_KEY)
    return raw === null ? true : raw === 'true'
  } catch {
    return true
  }
}

export function saveAutoSpeakPreference(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_SPEAK_KEY, String(enabled))
  } catch {
    // ignore
  }
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return
  window.speechSynthesis.cancel()
}

export async function speakJapanese(text: string): Promise<void> {
  if (!isSpeechSupported() || !text.trim()) return

  stopSpeaking()

  const voice = voiceReady ? pickJapaneseVoice() : await ensureVoicesLoaded()
  const utterance = new SpeechSynthesisUtterance(text.trim())
  utterance.lang = 'ja-JP'
  utterance.rate = 0.92
  utterance.pitch = 1

  if (voice) {
    utterance.voice = voice
  }

  window.speechSynthesis.speak(utterance)
}

export function preloadVoices(): void {
  if (!isSpeechSupported()) return
  ensureVoicesLoaded()
}
