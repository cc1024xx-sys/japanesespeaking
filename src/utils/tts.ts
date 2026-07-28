const AUTO_SPEAK_KEY = 'japanese-speaking-auto-tts'
const TTS_API = '/api/tts'

let voiceReady = false
let currentAudio: HTMLAudioElement | null = null
let currentObjectUrl: string | null = null
let speakRequestId = 0
let neuralTtsAvailable: boolean | null = null

function revokeCurrentObjectUrl(): void {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = null
  }
}

function getVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis.getVoices()
}

function scoreJapaneseVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase()
  const lang = voice.lang.toLowerCase()
  let score = 0
  if (lang === 'ja-jp') score += 40
  else if (lang.startsWith('ja')) score += 20
  if (name.includes('nanami') || name.includes('kyoko') || name.includes('otoya')) score += 30
  if (name.includes('premium') || name.includes('enhanced') || name.includes('neural')) score += 25
  if (voice.localService) score += 5
  if (voice.default) score += 2
  return score
}

function pickJapaneseVoice(): SpeechSynthesisVoice | null {
  const voices = getVoices()
  const japanese = voices.filter((v) => v.lang.toLowerCase().startsWith('ja'))
  if (japanese.length === 0) return null

  return japanese.reduce((best, voice) => {
    if (!best) return voice
    return scoreJapaneseVoice(voice) > scoreJapaneseVoice(best) ? voice : best
  }, japanese[0] ?? null)
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
  if (typeof window === 'undefined') return false
  return typeof Audio !== 'undefined' || 'speechSynthesis' in window
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
  speakRequestId += 1

  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }
  revokeCurrentObjectUrl()

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

async function checkNeuralTtsAvailable(): Promise<boolean> {
  if (neuralTtsAvailable !== null) return neuralTtsAvailable

  try {
    const res = await fetch(TTS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'テスト' }),
    })
    neuralTtsAvailable = res.ok
  } catch {
    neuralTtsAvailable = false
  }

  return neuralTtsAvailable
}

async function speakWithNeuralTts(text: string, requestId: number): Promise<boolean> {
  try {
    const res = await fetch(TTS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (!res.ok) {
      neuralTtsAvailable = false
      return false
    }

    neuralTtsAvailable = true
    const blob = await res.blob()
    if (requestId !== speakRequestId) return true

    revokeCurrentObjectUrl()
    const url = URL.createObjectURL(blob)
    currentObjectUrl = url

    const audio = new Audio(url)
    currentAudio = audio
    audio.playbackRate = 1

    await new Promise<void>((resolve, reject) => {
      audio.onended = () => resolve()
      audio.onerror = () => reject(new Error('Audio playback failed'))
      void audio.play().catch(reject)
    })

    return true
  } catch {
    neuralTtsAvailable = false
    return false
  }
}

async function speakWithSystemTts(text: string): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

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

export async function speakJapanese(text: string): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed || !isSpeechSupported()) return

  stopSpeaking()
  const requestId = speakRequestId

  if (neuralTtsAvailable !== false) {
    const ok = await speakWithNeuralTts(trimmed, requestId)
    if (ok && requestId === speakRequestId) return
  }

  if (requestId !== speakRequestId) return
  await speakWithSystemTts(trimmed)
}

export function preloadVoices(): void {
  if (typeof window === 'undefined') return
  if ('speechSynthesis' in window) {
    ensureVoicesLoaded()
  }
  void checkNeuralTtsAvailable()
}
