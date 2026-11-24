/**
 * Sub-awakening lucid cue injector — gradual ramp, warm LPF blend,
 * out-of-head externalizer tail, and instant arousal abort fade.
 */

import { psychoEngine } from './PsychoacousticEngine'
import { dbToGain } from './dsp/util'
import type { LucidCueKind } from '../types/remscribe'

export interface LucidInjectOpts {
  cueKind: LucidCueKind
  whisperPhrase: string
  /** 0.10–0.50 → ceiling gain */
  ceilingPct: number
  durationSec?: number
}

export interface LucidInjectHandle {
  abort: (reason?: string) => void
  completed: Promise<{ outcome: 'completed' | 'aborted'; reason?: string }>
}

function ceilingGain(pct: number): number {
  // 10% → ~−30 dBFS, 50% → ~−12 dBFS; default 25% ≈ −24 dBFS
  const t = Math.min(0.5, Math.max(0.1, pct))
  const db = -30 + ((t - 0.1) / 0.4) * 18
  return dbToGain(db)
}

function makeChimeBuffer(ctx: AudioContext, freq: number, seconds: number): AudioBuffer {
  const sr = ctx.sampleRate
  const len = Math.floor(sr * seconds)
  const buf = ctx.createBuffer(2, len, sr)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      const t = i / sr
      const env = Math.exp(-t * 1.8) * (1 - Math.exp(-t * 40))
      const partial =
        Math.sin(2 * Math.PI * freq * t) * 0.55 +
        Math.sin(2 * Math.PI * freq * 2.01 * t) * 0.22 +
        Math.sin(2 * Math.PI * freq * 3.02 * t) * 0.1
      data[i] = partial * env * (ch === 0 ? 0.95 : 1)
    }
  }
  return buf
}

function makeWhisperBed(ctx: AudioContext, seconds: number): AudioBuffer {
  const sr = ctx.sampleRate
  const len = Math.floor(sr * seconds)
  const buf = ctx.createBuffer(2, len, sr)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    let pink = 0
    for (let i = 0; i < len; i++) {
      const t = i / sr
      const phrase = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.45)
      const syl = 0.4 + 0.6 * Math.max(0, Math.sin(t * Math.PI * 2 * 3.1))
      const env = phrase * syl * Math.min(1, t * 2) * Math.min(1, (seconds - t) * 1.5)
      const white = Math.random() * 2 - 1
      pink = pink * 0.92 + white * 0.08
      const formant =
        Math.sin(t * 2 * Math.PI * (190 + ch * 10)) * 0.12 +
        Math.sin(t * 2 * Math.PI * (410 + ch * 6)) * 0.07
      data[i] = (pink * 0.5 + formant) * env * 0.55
    }
  }
  return buf
}

export class LucidCueInjector {
  private activeAbort: ((reason?: string) => void) | null = null
  private cueing = false

  isCueing() {
    return this.cueing
  }

  /**
   * Inject a dream-blended lucid cue into the psychoacoustic sum bus.
   * Ramp-in 3.5s exponential; warm 2.2 kHz LPF + stereo externalizer tail.
   */
  async inject(opts: LucidInjectOpts): Promise<LucidInjectHandle> {
    if (!psychoEngine.isPlaying()) {
      await psychoEngine.start({ withDemoSources: true })
    }
    const ctx = psychoEngine.getAudioContext()
    const dest = psychoEngine.getCueDestination()
    if (!ctx || !dest) {
      return {
        abort: () => undefined,
        completed: Promise.resolve({ outcome: 'aborted' as const, reason: 'no-audio-graph' }),
      }
    }

    // Tear previous cue
    this.activeAbort?.()

    const duration = opts.durationSec ?? (opts.cueKind === 'whisper' ? 6.5 : 5.5)
    const peak = ceilingGain(opts.ceilingPct)
    const buffer =
      opts.cueKind === 'bowl432'
        ? makeChimeBuffer(ctx, 432, duration)
        : opts.cueKind === 'chime528'
          ? makeChimeBuffer(ctx, 528, duration)
          : makeWhisperBed(ctx, duration)

    const src = ctx.createBufferSource()
    src.buffer = buffer

    const lpf = ctx.createBiquadFilter()
    lpf.type = 'lowpass'
    lpf.frequency.value = 2200
    lpf.Q.value = 0.7

    // Simple out-of-head externalizer: delay + wide stereo
    const splitter = ctx.createChannelSplitter(2)
    const merger = ctx.createChannelMerger(2)
    const delayL = ctx.createDelay(0.05)
    const delayR = ctx.createDelay(0.05)
    delayL.delayTime.value = 0.012
    delayR.delayTime.value = 0.028
    const wetL = ctx.createGain()
    const wetR = ctx.createGain()
    wetL.gain.value = 0.55
    wetR.gain.value = 0.55
    const dry = ctx.createGain()
    dry.gain.value = 0.65

    const gain = ctx.createGain()
    gain.gain.value = 0.0001

    const reverbSend = ctx.createGain()
    reverbSend.gain.value = 0.35
    const delayVerb = ctx.createDelay(0.4)
    delayVerb.delayTime.value = 0.18
    const verbGain = ctx.createGain()
    verbGain.gain.value = 0.22
    const verbLpf = ctx.createBiquadFilter()
    verbLpf.type = 'lowpass'
    verbLpf.frequency.value = 1800

    src.connect(lpf)
    lpf.connect(dry).connect(gain)
    lpf.connect(splitter)
    splitter.connect(delayL, 0)
    splitter.connect(delayR, 1)
    delayL.connect(wetL).connect(merger, 0, 0)
    delayR.connect(wetR).connect(merger, 0, 1)
    merger.connect(gain)
    lpf.connect(reverbSend).connect(delayVerb).connect(verbLpf).connect(verbGain).connect(gain)

    gain.connect(dest)

    // Soft spatial widen while cue plays
    psychoEngine.patch({
      spatial: { externalizer: 0.72, dualPan: 0.45 },
    })

    const t0 = ctx.currentTime
    const rampIn = 3.5
    gain.gain.cancelScheduledValues(t0)
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + rampIn)
    // Hold then gentle decay
    const holdEnd = t0 + Math.max(rampIn + 0.8, duration - 1.2)
    gain.gain.setValueAtTime(peak, holdEnd)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)

    // Optional spoken TTS for whisper cue (browser speech — soft)
    if (opts.cueKind === 'whisper' && opts.whisperPhrase.trim()) {
      try {
        const u = new SpeechSynthesisUtterance(opts.whisperPhrase)
        u.rate = 0.85
        u.pitch = 0.95
        u.volume = Math.min(0.45, opts.ceilingPct + 0.15)
        window.speechSynthesis.cancel()
        window.setTimeout(() => window.speechSynthesis.speak(u), 900)
      } catch {
        /* silent bed only */
      }
    }

    this.cueing = true
    let settled = false
    let resolveDone!: (v: { outcome: 'completed' | 'aborted'; reason?: string }) => void
    const completed = new Promise<{ outcome: 'completed' | 'aborted'; reason?: string }>((res) => {
      resolveDone = res
    })

    const cleanup = () => {
      try {
        src.stop()
        src.disconnect()
        lpf.disconnect()
        gain.disconnect()
      } catch {
        /* noop */
      }
      this.cueing = false
      this.activeAbort = null
    }

    const abort = (reason?: string) => {
      if (settled) return
      settled = true
      try {
        window.speechSynthesis?.cancel()
      } catch {
        /* noop */
      }
      const now = ctx.currentTime
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5)
      window.setTimeout(() => {
        cleanup()
        resolveDone({ outcome: 'aborted', reason })
      }, 1600)
    }

    this.activeAbort = abort

    src.onended = () => {
      if (settled) return
      settled = true
      cleanup()
      resolveDone({ outcome: 'completed' })
    }

    src.start(t0)
    window.setTimeout(() => {
      try {
        src.stop()
      } catch {
        /* already stopped */
      }
    }, (duration + 0.05) * 1000)

    return { abort, completed }
  }

  /** Fade active cue to 0 over 1.5s (arousal abort). */
  abortActive(reason = 'arousal') {
    this.activeAbort?.(reason)
  }
}

export const lucidCueInjector = new LucidCueInjector()

/** Map ceiling % for UI display (~dBFS). */
export function ceilingPctToDb(pct: number): number {
  const t = Math.min(0.5, Math.max(0.1, pct))
  return Math.round((-30 + ((t - 0.1) / 0.4) * 18) * 10) / 10
}
