/**
 * Focus Shield — ambient distraction + privacy-safe typing cadence sensor.
 * Never stores audio or key characters — timing & spectral energy only.
 */

import { clamp, gainToDb } from './dsp/util'

export type FocusCognitiveState = 'settling' | 'flow' | 'distraction'

export type UltradianSprintMode = 'continuous' | 'pomodoro50' | 'ultradian90'

export interface FocusShieldTelemetry {
  ambientDb: number
  speechIntrusiveness: number
  shieldStrength: number
  state: FocusCognitiveState
  beatHz: number
  micActive: boolean
  tabSwitchesPerMin: number
  typingCadenceMs: number | null
}

export interface FocusShieldMonitorCallbacks {
  onTelemetry?: (t: FocusShieldTelemetry) => void
  onStateChange?: (state: FocusCognitiveState) => void
}

function bandEnergy(
  freq: Float32Array,
  sampleRate: number,
  loHz: number,
  hiHz: number,
): number {
  const binHz = sampleRate / 2 / freq.length
  let sum = 0
  let n = 0
  for (let i = 0; i < freq.length; i++) {
    const hz = i * binHz
    if (hz < loHz || hz > hiHz) continue
    // getFloatFrequencyData is in dB
    const lin = Math.pow(10, freq[i]! / 20)
    sum += lin * lin
    n++
  }
  return n > 0 ? Math.sqrt(sum / n) : 0
}

export class FocusShieldMonitor {
  private stream: MediaStream | null = null
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private raf = 0
  private running = false
  private micActive = false
  private cbs: FocusShieldMonitorCallbacks = {}

  private baselineSpeech = 0.0001
  private ambientDb = -60
  private speechIntrusiveness = 0
  private state: FocusCognitiveState = 'settling'
  private keyTimes: number[] = []
  private tabSwitches: number[] = []
  private lastKeyAt = 0
  private cadenceMs: number | null = null

  private onKeyDown = () => {
    const now = performance.now()
    if (this.lastKeyAt > 0) {
      const gap = now - this.lastKeyAt
      if (gap > 40 && gap < 2000) {
        this.keyTimes.push(gap)
        if (this.keyTimes.length > 24) this.keyTimes.shift()
        this.cadenceMs =
          this.keyTimes.reduce((a, b) => a + b, 0) / this.keyTimes.length
      }
    }
    this.lastKeyAt = now
  }

  private onVisibility = () => {
    if (document.hidden) {
      this.tabSwitches.push(Date.now())
      if (this.tabSwitches.length > 40) this.tabSwitches.shift()
    }
  }

  private onBlur = () => {
    this.tabSwitches.push(Date.now())
    if (this.tabSwitches.length > 40) this.tabSwitches.shift()
  }

  async start(cbs?: FocusShieldMonitorCallbacks) {
    this.stop()
    if (cbs) this.cbs = cbs
    this.running = true

    window.addEventListener('keydown', this.onKeyDown, { passive: true })
    document.addEventListener('visibilitychange', this.onVisibility)
    window.addEventListener('blur', this.onBlur)

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new Ctx()
      if (this.ctx.state === 'suspended') await this.ctx.resume()
      this.source = this.ctx.createMediaStreamSource(this.stream)
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 1024
      this.analyser.smoothingTimeConstant = 0.85
      this.source.connect(this.analyser)
      this.micActive = true
    } catch {
      this.micActive = false
    }

    this.loop()
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
    window.removeEventListener('keydown', this.onKeyDown)
    document.removeEventListener('visibilitychange', this.onVisibility)
    window.removeEventListener('blur', this.onBlur)
    try {
      this.source?.disconnect()
      void this.ctx?.close()
    } catch {
      /* noop */
    }
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.analyser = null
    this.source = null
    this.ctx = null
    this.micActive = false
  }

  isRunning() {
    return this.running
  }

  getTelemetry(beatHz: number, shieldStrength: number): FocusShieldTelemetry {
    return {
      ambientDb: this.ambientDb,
      speechIntrusiveness: this.speechIntrusiveness,
      shieldStrength,
      state: this.state,
      beatHz,
      micActive: this.micActive,
      tabSwitchesPerMin: this.tabSwitchesPerMin(),
      typingCadenceMs: this.cadenceMs,
    }
  }

  private tabSwitchesPerMin() {
    const cutoff = Date.now() - 60_000
    return this.tabSwitches.filter((t) => t >= cutoff).length
  }

  private classify(
    speechIntrude: number,
    switches: number,
  ): FocusCognitiveState {
    if (speechIntrude > 0.55 || switches >= 4) return 'distraction'
    const cadence = this.cadenceMs
    const steady =
      cadence != null &&
      cadence > 80 &&
      cadence < 420 &&
      this.keyTimes.length >= 6 &&
      switches <= 1
    if (steady && speechIntrude < 0.28) return 'flow'
    return 'settling'
  }

  private loop = () => {
    if (!this.running) return

    if (this.analyser && this.ctx) {
      const freq = new Float32Array(this.analyser.frequencyBinCount)
      const time = new Float32Array(this.analyser.fftSize)
      this.analyser.getFloatFrequencyData(freq)
      this.analyser.getFloatTimeDomainData(time)

      let sumSq = 0
      for (let i = 0; i < time.length; i++) sumSq += time[i]! * time[i]!
      const rms = Math.sqrt(sumSq / time.length)
      this.ambientDb = clamp(gainToDb(Math.max(1e-8, rms)), -80, 0)

      const speech = bandEnergy(freq, this.ctx.sampleRate, 300, 3400)
      const broadband = bandEnergy(freq, this.ctx.sampleRate, 80, 8000)
      // Adaptive baseline
      this.baselineSpeech = this.baselineSpeech * 0.995 + speech * 0.005
      const ratio = speech / Math.max(1e-8, this.baselineSpeech)
      const speechShare = broadband > 1e-8 ? speech / broadband : 0
      this.speechIntrusiveness = clamp(
        (ratio - 1.15) * 0.45 + speechShare * 0.55,
        0,
        1,
      )
    } else {
      // Keyboard/mouse-only fallback: treat rapid tab switching as "speech"
      const sw = this.tabSwitchesPerMin()
      this.speechIntrusiveness = clamp(sw / 6, 0, 1)
      this.ambientDb = -55
    }

    const next = this.classify(this.speechIntrusiveness, this.tabSwitchesPerMin())
    if (next !== this.state) {
      this.state = next
      this.cbs.onStateChange?.(next)
    }

    this.cbs.onTelemetry?.(
      this.getTelemetry(0, 0), // controller fills beat/shield on its tick
    )

    this.raf = requestAnimationFrame(this.loop)
  }
}

export const focusShieldMonitor = new FocusShieldMonitor()
