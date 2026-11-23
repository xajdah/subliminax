import type { NeuroIllusionParams } from '../../types/psychoacoustic'
import {
  GRANULAR_WORKLET_NAME,
  ensureWorklets,
} from '../worklets/workletSources'
import { clamp, dbToGain, lerp, nyquistClamp, setParam } from './util'

/**
 * Neuro-Illusions — levitation, whisper corridor, near-ear proximity,
 * temporal interference, polycascade, granular halo, sine speech, bilateral weave.
 */
export class NeuroIllusionProcessor {
  readonly output: GainNode
  readonly voiceIn: GainNode
  readonly voiceOut: GainNode
  readonly musicSend: GainNode

  private ctx: AudioContext
  private params: NeuroIllusionParams
  private panner: PannerNode
  private elevPeak: BiquadFilterNode
  private subHp: BiquadFilterNode
  private tunnelDelayL: DelayNode
  private tunnelDelayR: DelayNode
  private tunnelFbL: GainNode
  private tunnelFbR: GainNode
  private tunnelLp: BiquadFilterNode
  private tunnelGain: GainNode
  private earPan: PannerNode
  private earWarm: BiquadFilterNode
  private earDelay: DelayNode
  private earShadow: BiquadFilterNode
  private earGain: GainNode
  private ti1800: OscillatorNode
  private ti1840: OscillatorNode
  private tiGain: GainNode
  private polyGain: GainNode
  private polyCarriers: OscillatorNode[] = []
  private polyAmps: GainNode[] = []
  private polyLfos: OscillatorNode[] = []
  private granular: AudioWorkletNode | null = null
  private granularGain: GainNode
  private sineDry: GainNode
  private sineWet: GainNode
  private sineBp: BiquadFilterNode[] = []
  private sineShaper: WaveShaperNode
  private biL: GainNode
  private biR: GainNode
  private biMerge: ChannelMergerNode
  private biLfoL: OscillatorNode
  private biLfoR: OscillatorNode
  private biDepthL: GainNode
  private biDepthR: GainNode
  private voiceSplitter: GainNode
  private raf = 0
  private t0 = 0

  constructor(ctx: AudioContext, initial: NeuroIllusionParams) {
    this.ctx = ctx
    this.params = { ...initial }
    this.output = ctx.createGain()
    this.voiceIn = ctx.createGain()
    this.voiceOut = ctx.createGain()
    this.musicSend = ctx.createGain()
    this.voiceSplitter = ctx.createGain()

    // Levitation path (voice → elev filters → panner → out)
    this.elevPeak = ctx.createBiquadFilter()
    this.elevPeak.type = 'peaking'
    this.elevPeak.Q.value = 4
    this.elevPeak.frequency.value = 4000
    this.elevPeak.gain.value = 0
    this.subHp = ctx.createBiquadFilter()
    this.subHp.type = 'highpass'
    this.subHp.frequency.value = 20
    this.panner = ctx.createPanner()
    this.panner.panningModel = 'HRTF'
    this.panner.setPosition(0, 0, -1)

    // Infinity whisper corridor
    this.tunnelLp = ctx.createBiquadFilter()
    this.tunnelLp.type = 'lowpass'
    this.tunnelLp.frequency.value = 4500
    this.tunnelDelayL = ctx.createDelay(1)
    this.tunnelDelayR = ctx.createDelay(1)
    this.tunnelDelayL.delayTime.value = 0.18
    this.tunnelDelayR.delayTime.value = 0.24
    this.tunnelFbL = ctx.createGain()
    this.tunnelFbR = ctx.createGain()
    this.tunnelGain = ctx.createGain()
    this.tunnelGain.gain.value = 0

    // Near-ear whisper
    this.earPan = ctx.createPanner()
    this.earPan.panningModel = 'HRTF'
    this.earPan.setPosition(0.12, 0, -0.2)
    this.earWarm = ctx.createBiquadFilter()
    this.earWarm.type = 'lowshelf'
    this.earWarm.frequency.value = 110
    this.earDelay = ctx.createDelay(0.01)
    this.earDelay.delayTime.value = 0.00068
    this.earShadow = ctx.createBiquadFilter()
    this.earShadow.type = 'lowpass'
    this.earShadow.frequency.value = 900
    this.earGain = ctx.createGain()
    this.earGain.gain.value = 0

    // Temporal interference 1800 + 1840
    this.tiGain = ctx.createGain()
    this.tiGain.gain.value = 0
    this.ti1800 = ctx.createOscillator()
    this.ti1840 = ctx.createOscillator()
    this.ti1800.type = 'sine'
    this.ti1840.type = 'sine'
    this.ti1800.frequency.value = 1800
    this.ti1840.frequency.value = 1840
    this.ti1800.connect(this.tiGain)
    this.ti1840.connect(this.tiGain)
    this.tiGain.connect(this.output)
    this.ti1800.start()
    this.ti1840.start()

    // Harmonic brainwave stack: Δ2@60, Θ6@180, Γ40@540
    this.polyGain = ctx.createGain()
    this.polyGain.gain.value = 0
    const layers: [number, number][] = [
      [60, 2],
      [180, 6],
      [540, 40],
    ]
    for (const [car, beat] of layers) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = car
      const amp = ctx.createGain()
      amp.gain.value = 0
      const lfo = ctx.createOscillator()
      lfo.frequency.value = beat
      const depth = ctx.createGain()
      depth.gain.value = 0
      lfo.connect(depth).connect(amp.gain)
      osc.connect(amp).connect(this.polyGain)
      osc.start()
      lfo.start()
      this.polyCarriers.push(osc)
      this.polyAmps.push(amp)
      this.polyLfos.push(lfo)
    }
    this.polyGain.connect(this.output)

    // Granular halo
    this.granularGain = ctx.createGain()
    this.granularGain.gain.value = 0
    this.granularGain.connect(this.musicSend)

    // Sine-speech skeleton
    this.sineDry = ctx.createGain()
    this.sineWet = ctx.createGain()
    this.sineShaper = ctx.createWaveShaper()
    ;(this.sineShaper as { curve: Float32Array | null }).curve = makeSoftCurve(1024)
    for (const hz of [500, 1500, 2500]) {
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = hz
      bp.Q.value = 18
      this.sineBp.push(bp)
    }

    // Bilateral EMDR weave
    this.biL = ctx.createGain()
    this.biR = ctx.createGain()
    this.biMerge = ctx.createChannelMerger(2)
    this.biLfoL = ctx.createOscillator()
    this.biLfoR = ctx.createOscillator()
    this.biLfoL.frequency.value = 3.5
    this.biLfoR.frequency.value = 3.5
    this.biDepthL = ctx.createGain()
    this.biDepthR = ctx.createGain()
    this.biLfoL.connect(this.biDepthL).connect(this.biL.gain)
    this.biLfoR.connect(this.biDepthR).connect(this.biR.gain)
    // Phase offset ~180° via delayed start offset using ConstantSource bias
    const biasL = ctx.createConstantSource()
    biasL.offset.value = 0.5
    const biasR = ctx.createConstantSource()
    biasR.offset.value = 0.5
    biasL.connect(this.biL.gain)
    biasR.connect(this.biR.gain)
    biasL.start()
    biasR.start()
    this.biLfoL.start()
    this.biLfoR.start(ctx.currentTime + 0.5 / 3.5) // ~180° at 3.5 Hz

    this.wireVoice()
    void this.initGranular()
    this.apply(initial)
    this.t0 = ctx.currentTime
    this.tick()
  }

  private wireVoice() {
    // Main voice chain with levitation / ear / sine / bilateral
    this.voiceIn.connect(this.voiceSplitter)
    this.voiceSplitter.connect(this.subHp)
    this.subHp.connect(this.elevPeak).connect(this.panner).connect(this.voiceOut)

    // Tunnel from voice
    this.voiceSplitter.connect(this.tunnelLp)
    this.tunnelLp.connect(this.tunnelDelayL)
    this.tunnelLp.connect(this.tunnelDelayR)
    this.tunnelDelayL.connect(this.tunnelFbL).connect(this.tunnelDelayR)
    this.tunnelDelayR.connect(this.tunnelFbR).connect(this.tunnelDelayL)
    this.tunnelDelayL.connect(this.tunnelGain)
    this.tunnelDelayR.connect(this.tunnelGain)
    this.tunnelGain.connect(this.output)

    // Near-ear parallel
    this.voiceSplitter.connect(this.earWarm)
    this.earWarm.connect(this.earDelay).connect(this.earShadow).connect(this.earPan)
    this.earPan.connect(this.earGain).connect(this.voiceOut)

    // Sine speech parallel
    this.voiceSplitter.connect(this.sineDry)
    this.sineDry.connect(this.voiceOut)
    let node: AudioNode = this.voiceSplitter
    for (const bp of this.sineBp) {
      node.connect(bp)
      node = bp
    }
    node.connect(this.sineShaper).connect(this.sineWet).connect(this.voiceOut)

    // Bilateral
    this.voiceSplitter.connect(this.biL)
    this.voiceSplitter.connect(this.biR)
    this.biL.connect(this.biMerge, 0, 0)
    this.biR.connect(this.biMerge, 0, 1)
    this.biMerge.connect(this.voiceOut)

    // Granular input from voice
    // connected after worklet ready
  }

  private async initGranular() {
    try {
      await ensureWorklets(this.ctx)
      this.granular = new AudioWorkletNode(this.ctx, GRANULAR_WORKLET_NAME)
      this.voiceSplitter.connect(this.granular)
      this.granular.connect(this.granularGain)
      this.apply(this.params)
    } catch {
      /* worklet optional */
    }
  }

  apply(p: NeuroIllusionParams) {
    this.params = { ...p }
    const ctx = this.ctx
    const lev = clamp(p.levitation, 0, 1)
    this.panner.setPosition(0, lev * 2, -1)
    setParam(this.elevPeak.gain, 4 * lev, ctx)
    setParam(this.elevPeak.frequency, nyquistClamp(lerp(4000, 9500, lev), ctx.sampleRate), ctx)
    setParam(this.subHp.frequency, lerp(20, 110, lev), ctx)

    const tun = clamp(p.tunnelDepth, 0, 1)
    setParam(this.tunnelGain.gain, tun * 0.55, ctx)
    setParam(this.tunnelFbL.gain, tun * 0.68, ctx)
    setParam(this.tunnelFbR.gain, tun * 0.68, ctx)
    setParam(this.tunnelLp.frequency, nyquistClamp(lerp(4500, 1200, tun), ctx.sampleRate), ctx)

    const ear = clamp(p.earWhisper, 0, 1)
    this.earPan.setPosition(0.12 * (ear > 0 ? 1 : 0), 0, -0.2)
    setParam(this.earGain.gain, ear * 0.7, ctx)
    setParam(this.earWarm.gain, 6 * ear, ctx)
    setParam(this.earDelay.delayTime, 0.00068 * ear, ctx)

    const ti = clamp(p.temporalInterference, 0, 1)
    setParam(this.tiGain.gain, ti * dbToGain(-28), ctx)

    const poly = clamp(p.polyCascade, 0, 1)
    setParam(this.polyGain.gain, poly * dbToGain(-24), ctx)
    this.polyAmps.forEach((a) => setParam(a.gain, poly * 0.15, ctx))

    const gran = clamp(p.granularHalo, 0, 1)
    setParam(this.granularGain.gain, gran * dbToGain(-18), ctx)
    this.granular?.port.postMessage({ amount: gran })

    const sine = clamp(p.sineSpeech, 0, 1)
    setParam(this.sineWet.gain, sine, ctx)
    setParam(this.sineDry.gain, 1 - sine * 0.55, ctx)

    const bi = clamp(p.bilateralWeave, 0, 1)
    setParam(this.biDepthL.gain, bi * 0.45, ctx)
    setParam(this.biDepthR.gain, bi * 0.45, ctx)
  }

  private tick = () => {
    // Alternate ear side slowly when ear whisper active
    const ear = clamp(this.params.earWhisper, 0, 1)
    if (ear > 0.01) {
      const t = this.ctx.currentTime - this.t0
      const side = Math.sin(t * 0.35) >= 0 ? 1 : -1
      this.earPan.setPosition(0.12 * side, 0, -0.2)
    }
    this.raf = requestAnimationFrame(this.tick)
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    try {
      this.ti1800.stop()
      this.ti1840.stop()
      this.polyCarriers.forEach((o) => o.stop())
      this.polyLfos.forEach((o) => o.stop())
      this.biLfoL.stop()
      this.biLfoR.stop()
      this.granular?.disconnect()
    } catch {
      /* noop */
    }
  }
}

function makeSoftCurve(n: number): Float32Array {
  const buf = new ArrayBuffer(n * 4)
  const c = new Float32Array(buf)
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1
    c[i] = Math.tanh(x * 2.2)
  }
  return c
}
