import type { AffirmationTrack } from '../types/studio'

export interface SpeechController {
  speak: (track: AffirmationTrack) => void
  speakQueue: (tracks: AffirmationTrack[]) => void
  stop: () => void
  supported: boolean
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  const preferred =
    voices.find((v) => /en(-|_)?(US|GB)?/i.test(v.lang) && /female|samantha|google/i.test(v.name)) ??
    voices.find((v) => /^en/i.test(v.lang)) ??
    voices[0] ??
    null
  return preferred
}

/** Web Speech API wrapper for layered affirmations (browser TTS). */
export function createSpeechController(): SpeechController {
  const supported =
    typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'

  let queueIndex = 0
  let activeTracks: AffirmationTrack[] = []
  let looping = false

  const stop = () => {
    looping = false
    activeTracks = []
    if (supported) window.speechSynthesis.cancel()
  }

  const utterOne = (track: AffirmationTrack, onEnd?: () => void) => {
    if (!supported || track.muted || !track.text.trim()) {
      onEnd?.()
      return
    }
    const u = new SpeechSynthesisUtterance(track.text)
    const voice = pickVoice()
    if (voice) u.voice = voice
    u.rate = Math.max(0.5, Math.min(2, track.rate))
    u.pitch = Math.max(0.5, Math.min(2, track.pitch))
    // Subliminal masking: quieter + slightly faster
    const vol = track.subliminal
      ? Math.max(0.02, track.volume * 0.25)
      : Math.max(0, Math.min(1, track.volume))
    u.volume = vol
    u.onend = () => onEnd?.()
    u.onerror = () => onEnd?.()
    window.speechSynthesis.speak(u)
  }

  const speakNext = () => {
    if (!looping || activeTracks.length === 0) return
    // Skip muted
    let attempts = 0
    while (attempts < activeTracks.length && activeTracks[queueIndex]?.muted) {
      queueIndex = (queueIndex + 1) % activeTracks.length
      attempts++
    }
    const track = activeTracks[queueIndex]
    if (!track || track.muted) return

    utterOne(track, () => {
      if (!looping) return
      if (track.loop || activeTracks.length > 1) {
        queueIndex = (queueIndex + 1) % activeTracks.length
        // Small gap between lines
        window.setTimeout(speakNext, 400)
      } else {
        looping = false
      }
    })
  }

  return {
    supported,
    speak: (track) => {
      stop()
      looping = track.loop
      activeTracks = [track]
      queueIndex = 0
      speakNext()
    },
    speakQueue: (tracks) => {
      stop()
      activeTracks = tracks.filter((t) => t.text.trim())
      if (activeTracks.length === 0) return
      looping = activeTracks.some((t) => t.loop) || activeTracks.length > 1
      queueIndex = 0
      // Warm voices list
      if (supported) void window.speechSynthesis.getVoices()
      speakNext()
    },
    stop,
  }
}
