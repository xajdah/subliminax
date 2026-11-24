import type { OrbitMode, SpatialParams } from '../../types/psychoacoustic'
import { clamp, lerp, nyquistClamp, setParam } from './util'

/**
 * 3D Spatial & Localization — externalizer, front/behind, proximity,
 * head orbit, dual-pan Haas / micro-pitch.
 */
export class SpatialProcessor {
  readonly input: GainNode
  readonly output: GainNode

  private ctx: AudioContext
  private dry: GainNode
  private wet: GainNode
  private splitter: ChannelSplitterNode
  private merger: ChannelMergerNode
  private crossL: DelayNode
  private crossR: DelayNode
  private crossLpL: BiquadFilterNode
  private crossLpR: BiquadFilterNode
  private crossGainL: GainNode
  private crossGainR: GainNode
  private taps: { delay: DelayNode; gain: GainNode }[] = []
  private panner: PannerNode
  private pinnaNotch: BiquadFilterNode
  private presence: BiquadFilterNode
  private airAbs: BiquadFilterNode
  private dualDelayL: DelayNode
  private dualDelayR: DelayNode
  private dualGain: GainNode
  private dualDry: GainNode
  private params: SpatialParams
  private raf = 0
  private t0 = 0

  constructor(ctx: AudioContext, initial: SpatialParams) {
    this.ctx = ctx
    this.params = { ...initial }
    this.input = ctx.createGain()
    this.output = ctx.createGain()
    this.dry = ctx.createGain()
    this.wet = ctx.createGain()
    this.splitter = ctx.createChannelSplitter(2)
    this.merger = ctx.createChannelMerger(2)

    // Crossfeed 0.7 ms + 700 Hz head-shadow LPF
    this.crossL = ctx.createDelay(0.05)
    this.crossR = ctx.createDelay(0.05)
    this.crossL.delayTime.value = 0.0007
    this.crossR.delayTime.value = 0.0007
    this.crossLpL = ctx.createBiquadFilter()
    this.crossLpR = ctx.createBiquadFilter()
    this.crossLpL.type = 'lowpass'
    this.crossLpR.type = 'lowpass'
    this.crossLpL.frequency.value = 700
    this.crossLpR.frequency.value = 700
    this.crossGainL = ctx.createGain()
    this.crossGainR = ctx.createGain()

    // Multi-tap early reflections
    for (const ms of [12, 19, 27, 35]) {
      const delay = ctx.createDelay(0.1)
      delay.delayTime.value = ms / 1000
      const gain = ctx.createGain()
      gain.gain.value = 0.12
      this.taps.push({ delay, gain })
    }

    this.panner = ctx.createPanner()
    this.panner.panningModel = 'HRTF'
    this.panner.distanceModel = 'inverse'
    this.panner.refDistance = 1
    this.panner.maxDistance = 40
    this.panner.rolloffFactor = 1
    this.panner.setPosition(0, 0, -1.5)

    this.pinnaNotch = ctx.createBiquadFilter()
    this.pinnaNotch.type = 'peaking'
    this.pinnaNotch.frequency.value = 8000
    this.pinnaNotch.Q.value = 4
    this.pinnaNotch.gain.value = 0

    this.presence = ctx.createBiquadFilter()
    this.presence.type = 'peaking'
    this.presence.frequency.value = 3500
    this.presence.Q.value = 1.2
    this.presence.gain.value = 0

    this.airAbs = ctx.createBiquadFilter()
    this.airAbs.type = 'lowpass'
    this.airAbs.frequency.value = 18000
    this.airAbs.Q.value = 0.7

    this.dualDelayL = ctx.createDelay(0.05)
    this.dualDelayR = ctx.createDelay(0.05)
    this.dualDelayL.delayTime.value = 0
    this.dualDelayR.delayTime.value = 0.018
    this.dualGain = ctx.createGain()
    this.dualDry = ctx.createGain()

    this.wire()
    this.apply(initial)
    this.t0 = ctx.currentTime
    this.tick()
  }

  private wire() {
    // Input → dual-pan split path + main
    this.input.connect(this.dualDry)
    this.input.connect(this.splitter)

    this.splitter.connect(this.crossR, 0) // L → delayed into R
    this.splitter.connect(this.crossL, 1) // R → delayed into L
    this.crossR.connect(this.crossLpR).connect(this.crossGainR)
    this.crossL.connect(this.crossLpL).connect(this.crossGainL)
    this.crossGainL.connect(this.merger, 0, 0)
    this.crossGainR.connect(this.merger, 0, 1)
    this.splitter.connect(this.merger, 0, 0)
    this.splitter.connect(this.merger, 1, 1)

    // Early reflections from mono sum of input
    const tapBus = this.ctx.createGain()
    tapBus.gain.value = 1
    this.input.connect(tapBus)
    for (const t of this.taps) {
      tapBus.connect(t.delay).connect(t.gain).connect(this.wet)
    }

    this.merger.connect(this.dry)
    this.dry.connect(this.pinnaNotch)
    this.wet.connect(this.pinnaNotch)
    this.pinnaNotch.connect(this.presence).connect(this.airAbs).connect(this.panner)

    // Dual pan Haas
    this.input.connect(this.dualDelayL).connect(this.dualGain)
    this.input.connect(this.dualDelayR).connect(this.dualGain)
    this.dualGain.connect(this.panner)
    this.dualDry.connect(this.panner)

    this.panner.connect(this.output)
  }

  apply(p: Partial<SpatialParams>) {
    this.params = { ...this.params, ...p }
    const s = this.params
    const ctx = this.ctx
    const xfeed = lerp(0.15, 0.25, clamp(s.externalizer, 0, 1))
    setParam(this.crossGainL.gain, xfeed * s.externalizer, ctx)
    setParam(this.crossGainR.gain, xfeed * s.externalizer, ctx)
    const wet = clamp(s.externalizer * 0.45 + s.proximity * 0.25, 0, 0.7)
    setParam(this.wet.gain, wet, ctx)
    setParam(this.dry.gain, 1 - wet * 0.35, ctx)

    // Front / behind pinna + presence
    const fb = clamp(s.frontBehind, -1, 1)
    setParam(this.pinnaNotch.gain, fb < 0 ? -5 * Math.abs(fb) : 0, ctx)
    setParam(this.presence.gain, fb > 0 ? 2 * fb : 0, ctx)

    // Proximity → air absorption
    const air = lerp(18000, 2500, clamp(s.proximity, 0, 1))
    setParam(this.airAbs.frequency, nyquistClamp(air, ctx.sampleRate), ctx)
    this.panner.setOrientation(0, 0, fb >= 0 ? -1 : 1)

    // Dual pan
    const d = clamp(s.dualPan, 0, 1)
    setParam(this.dualGain.gain, d * 0.55, ctx)
    setParam(this.dualDry.gain, 1 - d * 0.4, ctx)
    setParam(this.dualDelayR.delayTime, 0.018 * d, ctx)
  }

  private tick = () => {
    if (!this.ctx) return
    const s = this.params
    const now = this.ctx.currentTime - this.t0
    const proxLfo = Math.sin(now * Math.PI * 2 * Math.max(0.01, s.proximityRate))
    const depth = clamp(s.proximity, 0, 1)
    const dist = lerp(1.2, 12, depth) + proxLfo * depth * 2
    this.panner.setPosition(...this.orbitPos(now, dist, s.orbitSpeed, s.orbitMode, s.frontBehind))
    this.raf = requestAnimationFrame(this.tick)
  }

  private orbitPos(
    t: number,
    dist: number,
    speed: number,
    mode: OrbitMode,
    fb: number,
  ): [number, number, number] {
    const w = Math.PI * 2 * clamp(speed, 0, 0.5)
    const a = t * w
    const zSign = fb >= 0 ? -1 : 1
    if (mode === 'figure8') {
      return [Math.sin(a) * dist, Math.sin(a * 2) * dist * 0.35, zSign * Math.cos(a) * dist * 0.6]
    }
    if (mode === 'overCrown') {
      return [Math.sin(a) * dist * 0.7, Math.abs(Math.cos(a)) * dist, zSign * Math.cos(a) * 0.4]
    }
    return [Math.sin(a) * dist, 0.1, zSign * Math.cos(a) * dist]
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    try {
      this.input.disconnect()
      this.output.disconnect()
    } catch {
      /* noop */
    }
  }
}
