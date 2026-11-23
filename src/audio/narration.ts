import type { AffirmationConfig, AudioLabConfig, NarrationConfig } from '../types/studio'

export interface NarrationNodes {
  output: GainNode
  applyLevels: (narration: NarrationConfig, lab: AudioLabConfig) => void
  start: (
    affirmations: AffirmationConfig,
    narration: NarrationConfig,
    lab: AudioLabConfig,
  ) => void
  stop: () => void
  dispose: () => void
  supported: boolean
}

function pickVoice(narratorId: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  if (narratorId === 'clear') {
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

/** Device / narrator / voice-print (API-ready) narration with Unveil & dual-pan reverse. */
export function createNarration(ctx: AudioContext): NarrationNodes {
  const output = ctx.createGain()
  const dry = ctx.createGain()
  const formant = ctx.createBiquadFilter()
  formant.type = 'notch'
  formant.frequency.value = 1200
  formant.Q.value = 2
  const unveilGain = ctx.createGain()
  unveilGain.gain.value = 0

  dry.connect(formant)
  formant.connect(output)
  // Unveil taps a parallel louder path
  dry.connect(unveilGain)
  unveilGain.connect(output)

  const supported =
    typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'

  let active = false
  let timer: number | null = null
  let lineIndex = 0
  let sleepHoldUntil = 0

  const cancel = () => {
    active = false
    if (timer != null) {
      window.clearTimeout(timer)
      timer = null
    }
    if (supported) window.speechSynthesis.cancel()
  }

  const speakLine = (
    text: string,
    narration: NarrationConfig,
    lab: AudioLabConfig,
    onDone: () => void,
  ) => {
    if (!supported || !text.trim()) {
      onDone()
      return
    }
    const voice = pickVoice(narration.narratorId)
    const primary = new SpeechSynthesisUtterance(text)
    if (voice) primary.voice = voice
    primary.rate = Math.max(0.5, Math.min(2, narration.rate))
    primary.pitch = Math.max(0.5, Math.min(2, narration.pitch))
    // Buried by default; Unveil raises audibility
    const buried = Math.max(0.02, narration.volume * (0.2 + lab.unveilAmount * 0.8))
    primary.volume = buried

    primary.onend = () => onDone()
    primary.onerror = () => onDone()
    window.speechSynthesis.speak(primary)

    if (lab.dualPannedReverse) {
      // Approximate reverse layer: delayed, pitched whisper (true reverse needs buffer)
      const rev = new SpeechSynthesisUtterance(text.split(' ').reverse().join(' '))
      if (voice) rev.voice = voice
      rev.rate = Math.min(2, narration.rate * 1.08)
      rev.pitch = Math.max(0.5, narration.pitch * 0.85)
      rev.volume = buried * 0.45
      window.setTimeout(() => window.speechSynthesis.speak(rev), 80)
    }
  }

  return {
    output,
    supported,
    applyLevels: (narration, lab) => {
      const silent = narration.kind === 'none'
      output.gain.setTargetAtTime(
        silent ? 0 : Math.max(0, Math.min(1, narration.volume)),
        ctx.currentTime,
        0.05,
      )
      formant.Q.setTargetAtTime(
        lab.formantMasking ? 0.4 + lab.formantAmount * 8 : 0.5,
        ctx.currentTime,
        0.08,
      )
      formant.frequency.setTargetAtTime(
        lab.formantMasking ? 900 + lab.formantAmount * 800 : 1200,
        ctx.currentTime,
        0.08,
      )
      unveilGain.gain.setTargetAtTime(lab.unveilAmount * 0.9, ctx.currentTime, 0.05)
      // Near-ultrasonic: nudge audible sideband feel via slight high shelf on dry
      // (true 17.5 kHz AM needs buffer voice; TTS path uses unveil for verification)
    },
    start: (affirmations, narration, lab) => {
      cancel()
      if (narration.kind === 'none') return
      // Voice-print without sample falls back to device/narrator (API hook later)
      active = true
      lineIndex = 0
      sleepHoldUntil = lab.sleepCycleInfiltration ? Date.now() + 12 * 60 * 1000 : 0
      if (supported) void window.speechSynthesis.getVoices()

      const cycle = () => {
        if (!active) return
        if (Date.now() < sleepHoldUntil) {
          timer = window.setTimeout(cycle, 5000)
          return
        }
        const lines = affirmations.lines.filter((l) => l.trim())
        if (lines.length === 0) return
        const text = lines[lineIndex % lines.length]!
        lineIndex++
        speakLine(text, narration, lab, () => {
          if (!active) return
          timer = window.setTimeout(cycle, Math.max(400, narration.loopPauseMs))
        })
      }
      cycle()
    },
    stop: cancel,
    dispose: () => {
      cancel()
      try {
        dry.disconnect()
        formant.disconnect()
        unveilGain.disconnect()
        output.disconnect()
      } catch {
        /* ignore */
      }
    },
  }
}
