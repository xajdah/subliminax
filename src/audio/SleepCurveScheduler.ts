/**
 * Adaptive overnight hypnagogic → deep → REM → pre-dawn wake curve.
 * Drives PsychoacousticEngine parameter automation across the session duration.
 */

import { getTrack } from '../data/moodTracks'
import {
  phaseAtProgress,
  stageFromBeatHz,
  type HypnogramSample,
  type SleepCurvePhase,
} from '../types/remscribe'
import { DEFAULT_PSYCHO, type PsychoacousticState } from '../types/psychoacoustic'
import { psychoEngine } from './PsychoacousticEngine'
import { loadMoodAudio } from './moodAudio'
import { lerp } from './dsp/util'

export interface SleepCurveCallbacks {
  onTick?: (info: {
    progress: number
    phase: SleepCurvePhase
    beatHz: number
    lpfHz: number
    remainingMs: number
    elapsedMs: number
  }) => void
  onHypnogram?: (sample: HypnogramSample) => void
  onComplete?: () => void
}

export interface SleepCurveStartOpts {
  /** Calming (or other) mood track id — loops on the music bus overnight */
  musicTrackId?: string | null
}

function remWaveBeat(progressInRem: number, durationMs: number): number {
  // Alternating ~90-minute waves between 2 Hz Delta and 6.5 Hz Theta
  const remSpanMs = durationMs * 0.35 // 50–85%
  const cycleMs = 90 * 60 * 1000
  const cycles = Math.max(1, remSpanMs / cycleMs)
  const phase = (progressInRem * cycles) % 1
  // Smooth cosine: 0 → delta, 0.5 → theta, 1 → delta
  const w = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2)
  return lerp(2, 6.5, w)
}

function beatForProgress(t: number, durationMs: number): number {
  if (t < 0.15) {
    // Descent: 16 Hz Beta → 5 Hz Theta
    return lerp(16, 5, t / 0.15)
  }
  if (t < 0.5) {
    // Deep Delta Core: 1.5–2.5 Hz
    const u = (t - 0.15) / 0.35
    return lerp(2.5, 1.5, Math.sin(u * Math.PI) * 0.5 + 0.5)
  }
  if (t < 0.85) {
    const u = (t - 0.5) / 0.35
    return remWaveBeat(u, durationMs)
  }
  // Pre-dawn ascent: up to 12–15 Hz
  const u = (t - 0.85) / 0.15
  return lerp(4, lerp(12, 15, 0.55), u)
}

function lpfForProgress(t: number): number {
  if (t < 0.15) return lerp(8000, 1200, t / 0.15)
  if (t < 0.5) return 450
  if (t < 0.85) return lerp(450, 1800, (t - 0.5) / 0.35)
  return lerp(450, 12000, (t - 0.85) / 0.15)
}

function morningAmbienceGain(elapsedMs: number, durationMs: number): number {
  const last15 = durationMs - 15 * 60 * 1000
  if (elapsedMs < last15) return 0.08
  const u = (elapsedMs - last15) / (15 * 60 * 1000)
  return lerp(0.08, 0.55, Math.min(1, Math.max(0, u)))
}

export function sleepPresetState(): PsychoacousticState {
  const s = structuredClone(DEFAULT_PSYCHO)
  s.buses = { music: -12, soundscape: -10, frequency: -16, voice: -28 }
  s.soundscapeNoise = 'pink'
  s.frequency = {
    mode: 'binaural',
    carrierHz: 200,
    beatHz: 10,
    solfeggioHz: 432,
  }
  s.breath = {
    breathSync: 0.55,
    breathPattern: '4-7-8',
    breathLock: true,
    envelopeMaskDb: -20,
    ultrasonic: false,
    ultrasonicCarrierHz: 16000,
  }
  s.spatial = {
    ...s.spatial,
    externalizer: 0.25,
    orbitSpeed: 0.04,
    proximity: 0.4,
  }
  s.masterDb = -2
  return s
}

export class SleepCurveScheduler {
  private durationMs = 7 * 3600 * 1000
  private startedAt = 0
  private timer: number | null = null
  private running = false
  private cbs: SleepCurveCallbacks = {}
  private lastHypnoSec = -30
  private musicTrackId: string | null = null

  configure(durationHours: number, cbs?: SleepCurveCallbacks) {
    this.durationMs = Math.max(0.25, durationHours) * 3600 * 1000
    if (cbs) this.cbs = cbs
  }

  getDurationMs() {
    return this.durationMs
  }

  isRunning() {
    return this.running
  }

  async start(cbs?: SleepCurveCallbacks, opts?: SleepCurveStartOpts) {
    if (cbs) this.cbs = cbs
    this.musicTrackId = opts?.musicTrackId ?? null
    this.startedAt = Date.now()
    this.running = true
    this.lastHypnoSec = -30

    const preset = sleepPresetState()
    if (!psychoEngine.isPlaying()) {
      psychoEngine.applyPreset(preset)
      await psychoEngine.start({ withDemoSources: true })
    } else {
      psychoEngine.applyPreset(preset)
    }

    await this.attachMusicBed(this.musicTrackId)

    // Start at ~10 Hz hypnagogic (will descend)
    psychoEngine.updateEntrainment(10, 200)
    psychoEngine.setNoiseColor('pink')
    psychoEngine.setBusLowpassHz('music', 8000)
    psychoEngine.setBusLowpassHz('soundscape', 8000)

    this.tick()
    this.timer = window.setInterval(() => this.tick(), 2000)
  }

  private async attachMusicBed(trackId: string | null) {
    psychoEngine.clearMusicBuffer()
    if (!trackId) return
    const track = getTrack(trackId)
    if (!track?.audioSrc) return
    const ctx = psychoEngine.getAudioContext()
    if (!ctx) return
    try {
      const buffer = await loadMoodAudio(ctx, track.audioSrc)
      if (!this.running) return
      await psychoEngine.injectMusicBuffer(buffer, { loop: true })
    } catch (err) {
      console.warn('[REMscribe] could not load calming bed', trackId, err)
    }
  }

  private tick() {
    if (!this.running) return
    const elapsed = Date.now() - this.startedAt
    const t = Math.min(1, elapsed / this.durationMs)
    const phase = phaseAtProgress(t)
    const beatHz = beatForProgress(t, this.durationMs)
    const lpfHz = lpfForProgress(t)
    const remainingMs = Math.max(0, this.durationMs - elapsed)

    // Phase-specific psycho patches
    if (phase === 'descent') {
      psychoEngine.patch({
        breath: {
          breathSync: 0.6,
          breathPattern: '4-7-8',
          breathLock: true,
        },
        soundscapeNoise: 'pink',
      })
    } else if (phase === 'delta') {
      psychoEngine.patch({
        soundscapeNoise: 'brown',
        buses: { music: -16, soundscape: -8, frequency: -18, voice: -32 },
      })
    } else if (phase === 'rem') {
      psychoEngine.patch({
        soundscapeNoise: 'pink',
        buses: { music: -14, soundscape: -12, frequency: -15, voice: -26 },
      })
    } else {
      const amb = morningAmbienceGain(elapsed, this.durationMs)
      psychoEngine.patch({
        soundscapeNoise: 'pink',
        buses: {
          music: -12 + amb * 4,
          soundscape: -14 + amb * 6,
          frequency: -14,
          voice: -30,
        },
        masterDb: -2 + amb * 2,
      })
    }

    psychoEngine.updateEntrainment(beatHz, phase === 'ascent' ? 220 : 180)
    psychoEngine.setBusLowpassHz('music', lpfHz)
    psychoEngine.setBusLowpassHz('soundscape', lpfHz)

    const relativeSec = elapsed / 1000
    if (relativeSec - this.lastHypnoSec >= 30) {
      this.lastHypnoSec = relativeSec
      this.cbs.onHypnogram?.({
        relativeSec,
        stage: stageFromBeatHz(beatHz, phase),
        beatHz,
      })
    }

    this.cbs.onTick?.({
      progress: t,
      phase,
      beatHz,
      lpfHz,
      remainingMs,
      elapsedMs: elapsed,
    })

    if (t >= 1) {
      this.stop(true)
    }
  }

  stop(completed = false) {
    this.running = false
    if (this.timer != null) {
      window.clearInterval(this.timer)
      this.timer = null
    }
    psychoEngine.clearMusicBuffer()
    this.musicTrackId = null
    if (completed) this.cbs.onComplete?.()
  }

  getElapsedMs() {
    if (!this.startedAt) return 0
    return Date.now() - this.startedAt
  }

  getRemainingMs() {
    return Math.max(0, this.durationMs - this.getElapsedMs())
  }
}

export const sleepCurveScheduler = new SleepCurveScheduler()
