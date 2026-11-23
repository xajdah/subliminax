/**
 * Voice clone / TTS integration hook.
 * Production: swap `synthesize` to call your clone API.
 * Local fallback: Web Speech API so the studio is testable immediately.
 */

export interface CloneProfile {
  id: string
  label: string
  provider: 'webspeech' | 'api'
  apiVoiceId?: string
}

export const CLONE_PROFILES: CloneProfile[] = [
  { id: 'local-soft', label: 'Local Soft (Web Speech)', provider: 'webspeech' },
  { id: 'local-clear', label: 'Local Clear (Web Speech)', provider: 'webspeech' },
  { id: 'api-clone-a', label: 'Clone Slot A (API-ready)', provider: 'api', apiVoiceId: '' },
]

function pickVoice(preferClear: boolean): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  if (preferClear) {
    return (
      voices.find((v) => /^en/i.test(v.lang) && /google|microsoft|daniel/i.test(v.name)) ??
      voices.find((v) => /^en/i.test(v.lang)) ??
      voices[0] ??
      null
    )
  }
  return (
    voices.find((v) => /^en/i.test(v.lang) && /samantha|karen|female|soft/i.test(v.name)) ??
    voices.find((v) => /^en/i.test(v.lang)) ??
    voices[0] ??
    null
  )
}

export interface SpeakOptions {
  text: string
  rate: number
  pitch: number
  volume: number
  profileId: string
  onEnd?: () => void
}

export const voiceCloneService = {
  supported:
    typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined',

  profiles: CLONE_PROFILES,

  /** Narrator path — same Web Speech fallback; enforce word cap in UI before calling. */
  speakNarrator(opts: SpeakOptions) {
    this.speak(opts)
  },

  /** Speak with clone profile or Web Speech fallback. */
  speak(opts: SpeakOptions) {
    if (!this.supported || !opts.text.trim()) {
      opts.onEnd?.()
      return
    }
    void window.speechSynthesis.getVoices()
    const profile = CLONE_PROFILES.find((p) => p.id === opts.profileId)
    // API profiles fall back locally until wired
    const u = new SpeechSynthesisUtterance(opts.text)
    const voice = pickVoice(opts.profileId.includes('clear'))
    if (voice) u.voice = voice
    u.rate = Math.max(0.5, Math.min(2, opts.rate))
    u.pitch = Math.max(0.5, Math.min(2, opts.pitch))
    u.volume = Math.max(0, Math.min(1, opts.volume))
    u.onend = () => opts.onEnd?.()
    u.onerror = () => opts.onEnd?.()
    // Placeholder for API: if (profile?.provider === 'api') return fetch(...)
    void profile
    window.speechSynthesis.speak(u)
  },

  cancel() {
    if (this.supported) window.speechSynthesis.cancel()
  },
}
