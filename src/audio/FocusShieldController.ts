/**
 * Dynamic psychoacoustic forcefield — adaptive masking, Alpha→40 Hz Gamma,
 * voice under-mask floor, and optional ultradian sprint cycles.
 */

import { psychoEngine } from './PsychoacousticEngine'
import {
  focusShieldMonitor,
  type FocusCognitiveState,
  type FocusShieldTelemetry,
  type UltradianSprintMode,
} from './FocusShieldMonitor'
import { clamp, lerp } from './dsp/util'

const TAU = 0.4 // 400ms non-startling envelopes

export interface FocusShieldTuners {
  maskingSensitivity: number // 0–1
  gammaIntensity: number // 0–1
  sprintMode: UltradianSprintMode
}

export interface FocusShieldStatus extends FocusShieldTelemetry {
  active: boolean
  phase: 'focus' | 'decompress'
  sprintRemainingSec: number | null
  voiceMaskDeltaDb: number
}

type Listener = (s: FocusShieldStatus) => void

const DEFAULT_TUNERS: FocusShieldTuners = {
  maskingSensitivity: 0.65,
  gammaIntensity: 0.7,
  sprintMode: 'continuous',
}

export class FocusShieldController {
  private active = false
  private tuners: FocusShieldTuners = { ...DEFAULT_TUNERS }
  private state: FocusCognitiveState = 'settling'
  private beatHz = 12
  private shieldStrength = 0
  private baseSoundscapeDb = -12
  private phase: 'focus' | 'decompress' = 'focus'
  private sprintStartedAt = 0
  private timer: number | null = null
  private listeners = new Set<Listener>()
  private lastAmbientDb = -50
  private speechIntrude = 0
  private micActive = false

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.getStatus())
    return () => {
      this.listeners.delete(fn)
    }
  }

  private emit() {
    const s = this.getStatus()
    this.listeners.forEach((fn) => fn(s))
  }

  getStatus(): FocusShieldStatus {
    const telem = focusShieldMonitor.getTelemetry(this.beatHz, this.shieldStrength)
    return {
      ...telem,
      ambientDb: this.lastAmbientDb || telem.ambientDb,
      speechIntrusiveness: this.speechIntrude || telem.speechIntrusiveness,
      micActive: this.micActive || telem.micActive,
      state: this.state,
      beatHz: this.beatHz,
      shieldStrength: this.shieldStrength,
      active: this.active,
      phase: this.phase,
      sprintRemainingSec: this.sprintRemaining(),
      voiceMaskDeltaDb: -20,
    }
  }

  getTuners() {
    return { ...this.tuners }
  }

  setTuners(partial: Partial<FocusShieldTuners>) {
    this.tuners = { ...this.tuners, ...partial }
    if (partial.sprintMode && this.active) {
      this.sprintStartedAt = Date.now()
      this.phase = 'focus'
    }
    this.emit()
  }

  isActive() {
    return this.active
  }

  async enable() {
    if (this.active) return
    this.active = true
    this.phase = 'focus'
    this.sprintStartedAt = Date.now()
    this.beatHz = 12

    if (!psychoEngine.isPlaying()) {
      await psychoEngine.start({ withDemoSources: true })
    }
    const st = psychoEngine.getState()
    this.baseSoundscapeDb = st.buses.soundscape

    // Entry: Alpha calm + pink bed
    psychoEngine.patch({
      frequency: { mode: 'binaural', carrierHz: 200, beatHz: 12, solfeggioHz: 528 },
      soundscapeNoise: 'pink',
      breath: { breathSync: 0.2, breathPattern: '5-5', breathLock: false },
      neuro: { temporalInterference: 0 },
    })
    psychoEngine.updateEntrainment(12, 200, TAU)
    psychoEngine.setBusDb('soundscape', this.baseSoundscapeDb, TAU)
    psychoEngine.setBusDb('frequency', -16, TAU)

    await focusShieldMonitor.start({
      onStateChange: (s) => {
        this.state = s
      },
      onTelemetry: (t) => {
        this.lastAmbientDb = t.ambientDb
        this.speechIntrude = t.speechIntrusiveness
        this.micActive = t.micActive
        if (t.state) this.state = t.state
      },
    })

    this.timer = window.setInterval(() => this.tick(), 400)
    this.emit()
  }

  disable() {
    this.active = false
    if (this.timer != null) {
      window.clearInterval(this.timer)
      this.timer = null
    }
    focusShieldMonitor.stop()
    // Soft restore
    psychoEngine.setBusDb('soundscape', this.baseSoundscapeDb, TAU)
    psychoEngine.patch({ neuro: { temporalInterference: 0 } })
    this.shieldStrength = 0
    this.emit()
  }

  private sprintRemaining(): number | null {
    if (!this.active || this.tuners.sprintMode === 'continuous') return null
    const focusMs =
      this.tuners.sprintMode === 'pomodoro50' ? 50 * 60_000 : 90 * 60_000
    const breakMs =
      this.tuners.sprintMode === 'pomodoro50' ? 10 * 60_000 : 15 * 60_000
    const cycle = focusMs + breakMs
    const elapsed = (Date.now() - this.sprintStartedAt) % cycle
    if (elapsed < focusMs) return Math.ceil((focusMs - elapsed) / 1000)
    return Math.ceil((cycle - elapsed) / 1000)
  }

  private updateSprintPhase() {
    if (this.tuners.sprintMode === 'continuous') {
      this.phase = 'focus'
      return
    }
    const focusMs =
      this.tuners.sprintMode === 'pomodoro50' ? 50 * 60_000 : 90 * 60_000
    const breakMs =
      this.tuners.sprintMode === 'pomodoro50' ? 10 * 60_000 : 15 * 60_000
    const cycle = focusMs + breakMs
    const elapsed = (Date.now() - this.sprintStartedAt) % cycle
    this.phase = elapsed < focusMs ? 'focus' : 'decompress'
  }

  private tick() {
    if (!this.active) return
    this.updateSprintPhase()

    const sens = this.tuners.maskingSensitivity
    const speech = this.speechIntrude
    const distractionBoost =
      this.state === 'distraction' ? 1 : this.state === 'settling' ? 0.35 : 0.15

    // Adaptive Spectral Masking Wall: +2…+10 dB on soundscape from speech intrusion
    const maskLift = lerp(2, 10, clamp(speech * sens + distractionBoost * 0.25, 0, 1))
    const targetSoundscape = clamp(this.baseSoundscapeDb + maskLift * sens, -24, -2)
    psychoEngine.setBusDb('soundscape', targetSoundscape, TAU)

    // Pink→Brown when speech is loud
    psychoEngine.setNoiseColor(speech > 0.45 ? 'brown' : 'pink')
    // Vocal-formant masking notch proxy via soundscape LPF around speech band edge
    psychoEngine.setBusLowpassHz('soundscape', speech > 0.4 ? 4500 : 12000, TAU)

    // Alpha → 40 Hz Gamma (or decompress to 8 Hz Alpha)
    let targetBeat = 12
    if (this.phase === 'decompress') {
      targetBeat = 8
      psychoEngine.patch({
        breath: { breathSync: 0.55, breathPattern: '4-7-8', breathLock: true },
        neuro: { temporalInterference: 0 },
      })
    } else if (this.state === 'flow' || this.state === 'distraction') {
      targetBeat = lerp(20, 40, this.tuners.gammaIntensity)
      const shimmer = this.tuners.gammaIntensity * (this.state === 'distraction' ? 0.55 : 0.35)
      psychoEngine.patch({
        breath: { breathSync: 0.15, breathLock: false },
        neuro: { temporalInterference: shimmer },
        frequency: { mode: 'binaural', carrierHz: 1800, beatHz: targetBeat },
      })
      // Temporal interference carriers ~1800 / 1840 via binaural carrier + beat
      psychoEngine.updateEntrainment(targetBeat, 1800, TAU)
    } else {
      targetBeat = 12
      psychoEngine.patch({
        neuro: { temporalInterference: 0 },
        frequency: { mode: 'binaural', carrierHz: 200, beatHz: 12 },
      })
      psychoEngine.updateEntrainment(12, 200, TAU)
    }

    if (this.phase === 'decompress') {
      psychoEngine.updateEntrainment(8, 200, TAU)
    }

    this.beatHz = targetBeat

    // Voice bus: keep −20 dB under adaptive noise floor (masking delta)
    const noiseFloor = targetSoundscape
    const voiceDb = clamp(noiseFloor - 20, -48, -18)
    psychoEngine.setBusDb('voice', voiceDb, TAU)

    // Shield strength 0–100
    this.shieldStrength = Math.round(
      clamp(
        speech * 55 * sens +
          (this.state === 'distraction' ? 30 : this.state === 'flow' ? 15 : 8) +
          (this.phase === 'decompress' ? -10 : 0),
        0,
        100,
      ),
    )

    this.emit()
  }
}

export const focusShieldController = new FocusShieldController()
