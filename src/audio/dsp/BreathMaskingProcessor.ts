import type { BreathMaskParams, BreathPattern } from '../../types/psychoacoustic'
import {
  ULTRASONIC_WORKLET_NAME,
  ensureWorklets,
} from '../worklets/workletSources'
import { clamp, dbToGain, nyquistClamp, setParam } from './util'

/**
 * Breath sync LFO, breath-lock voice gate, dynamic envelope masking,
 * ultrasonic carrier ring-mod (AudioWorklet).
 */
export class BreathMaskingProcessor {
  readonly voiceIn: GainNode
  readonly voiceOut: GainNode

  private ctx: AudioContext
  private musicGain: GainNode | null = null
  private soundGain: GainNode | null = null
  private musicLpf: BiquadFilterNode | null = null
  private soundLpf: BiquadFilterNode | null = null
  private voiceGate: GainNode
  private maskGain: GainNode
  private hp: BiquadFilterNode
  private ultraNode: AudioWorkletNode | null = null
  private ultraBypass: GainNode
  private ultraWet: GainNode
  private params: BreathMaskParams
  private raf = 0
  private t0 = 0
  private musicAnalyser: AnalyserNode | null = null
  private soundAnalyser: AnalyserNode | null = null
  private voiceBaseDb = -32

  constructor(ctx: AudioContext, initial: BreathMaskParams) {
    this.ctx = ctx
    this.params = { ...initial }
    this.voiceIn = ctx.createGain()
    this.voiceOut = ctx.createGain()
    this.voiceGate = ctx.createGain()
    this.maskGain = ctx.createGain()
    this.hp = ctx.createBiquadFilter()
    this.hp.type = 'highpass'
    this.hp.frequency.value = 20
    this.ultraBypass = ctx.createGain()
    this.ultraWet = ctx.createGain()
    this.ultraWet.gain.value = 0
    this.ultraBypass.gain.value = 1

    this.voiceIn.connect(this.hp)
    this.hp.connect(this.voiceGate).connect(this.maskGain)
    this.maskGain.connect(this.ultraBypass).connect(this.voiceOut)
    this.maskGain.connect(this.ultraWet)

    this.t0 = ctx.currentTime
    void this.initUltra()
    this.tick()
  }

  private async initUltra() {
    try {
      await ensureWorklets(this.ctx)
      this.ultraNode = new AudioWorkletNode(this.ctx, ULTRASONIC_WORKLET_NAME)
      this.maskGain.connect(this.ultraNode)
      this.ultraNode.connect(this.ultraWet)
      this.ultraWet.connect(this.voiceOut)
      this.apply(this.params)
    } catch {
      /* worklet optional */
    }
  }

  /** Bind music/soundscape gains + LPFs and analysers for RMS masking */
  bindBuses(opts: {
    musicGain: GainNode
    soundGain: GainNode
    musicLpf: BiquadFilterNode
    soundLpf: BiquadFilterNode
    musicAnalyser: AnalyserNode
    soundAnalyser: AnalyserNode
    voiceBaseDb: number
  }) {
    this.musicGain = opts.musicGain
    this.soundGain = opts.soundGain
    this.musicLpf = opts.musicLpf
    this.soundLpf = opts.soundLpf
    this.musicAnalyser = opts.musicAnalyser
    this.soundAnalyser = opts.soundAnalyser
    this.voiceBaseDb = opts.voiceBaseDb
  }

  apply(p: BreathMaskParams) {
    this.params = { ...p }
    const ctx = this.ctx
    const u = p.ultrasonic
    setParam(this.hp.frequency, u ? 300 : 20, ctx)
    setParam(this.ultraBypass.gain, u ? 0.05 : 1, ctx)
    setParam(this.ultraWet.gain, u ? 1 : 0, ctx)
    if (this.ultraNode) {
      const hz = nyquistClamp(clamp(p.ultrasonicCarrierHz, 14500, 17500), ctx.sampleRate)
      this.ultraNode.port.postMessage({ enabled: u, carrierHz: hz })
    }
  }

  private breathPhase(t: number, pattern: BreathPattern): { phase: number; inhale: boolean } {
    // Normalized 0–1 cycle; inhale first half-ish
    if (pattern === '5-5') {
      const cycle = 10
      const u = (t % cycle) / cycle
      return { phase: u, inhale: u < 0.5 }
    }
    // 4-7-8 → 19s cycle
    const cycle = 19
    const u = (t % cycle) / cycle
    const inhale = u < 4 / 19
    return { phase: u, inhale }
  }

  private rmsDb(a: AnalyserNode | null): number {
    if (!a) return -60
    const buf = new Float32Array(a.fftSize)
    a.getFloatTimeDomainData(buf)
    let s = 0
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]
    const rms = Math.sqrt(s / buf.length)
    if (rms < 1e-8) return -80
    return 20 * Math.log10(rms)
  }

  private tick = () => {
    const ctx = this.ctx
    const p = this.params
    const t = ctx.currentTime - this.t0
    const { phase, inhale } = this.breathPhase(t, p.breathPattern)
    const depth = clamp(p.breathSync, 0, 1)

    // Respiratory LFO on music/soundscape volume + LPF
    const breathEnv = 0.55 + 0.45 * Math.sin(phase * Math.PI * 2)
    const vol = 1 - depth * (1 - breathEnv) * 0.55
    const cut = 18000 - depth * (1 - breathEnv) * 12000
    if (this.musicGain) setParam(this.musicGain.gain, this.musicGain.gain.value * 0 + vol, ctx, 0.08)
    // Don't multiply existing — store base separately; use absolute from engine via re-apply
    // Instead modulate a dedicated breath trim — we use setTarget toward computed absolute:
    // Engine will push base gains; here we apply relative breath factor via dedicated nodes if bound.
    if (this.musicLpf) setParam(this.musicLpf.frequency, nyquistClamp(cut, ctx.sampleRate), ctx, 0.1)
    if (this.soundLpf) setParam(this.soundLpf.frequency, nyquistClamp(cut, ctx.sampleRate), ctx, 0.1)

    // Breath lock: voice peaks on exhale
    let gate = 1
    if (p.breathLock) {
      gate = inhale ? 0.15 : 1
    }
    setParam(this.voiceGate.gain, gate, ctx, 0.08)

    // Dynamic envelope masking — keep voice ΔdB below music+soundscape RMS
    const maskFloor = Math.max(this.rmsDb(this.musicAnalyser), this.rmsDb(this.soundAnalyser))
    const targetVoiceDb = clamp(maskFloor + p.envelopeMaskDb, -60, -6)
    // Soft scale relative to unity path — maskGain is post voice bus trim
    const rel = dbToGain(targetVoiceDb - this.voiceBaseDb)
    setParam(this.maskGain.gain, clamp(rel, 0.05, 2.5), ctx, 0.12)

    this.raf = requestAnimationFrame(this.tick)
  }

  /** Called by engine when breath-modulating absolute bus gains */
  applyBreathBusGains(baseMusic: number, baseSound: number) {
    if (!this.musicGain || !this.soundGain) return
    const ctx = this.ctx
    const p = this.params
    const t = ctx.currentTime - this.t0
    const { phase } = this.breathPhase(t, p.breathPattern)
    const depth = clamp(p.breathSync, 0, 1)
    const breathEnv = 0.55 + 0.45 * Math.sin(phase * Math.PI * 2)
    const factor = 1 - depth * (1 - breathEnv) * 0.55
    setParam(this.musicGain.gain, baseMusic * factor, ctx, 0.1)
    setParam(this.soundGain.gain, baseSound * factor, ctx, 0.1)
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    try {
      this.ultraNode?.disconnect()
    } catch {
      /* noop */
    }
  }
}
