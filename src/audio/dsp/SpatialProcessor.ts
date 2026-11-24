import type { OrbitMode, SpatialParams } from '../../types/psychoacoustic'
import { clamp, lerp, nyquistClamp, setParam } from './util'

/**
 * 3D Spatial & Localization — each control maps to a distinct cue:
 * - externalizer → crossfeed + soft early reflections (wider / out-of-head)
 * - frontBehind → Z placement + pinna notch (rear) / presence (front)
 * - proximity → distance + air-absorption low-pass (near bright / far dull)
 * - orbitSpeed → HRTF motion path (circular / figure-8 / over-crown)
 * - dualPan → Haas width wet-only (not stacked into the dry path)
 */
export class SpatialProcessor {
  readonly input: GainNode
  readonly output: GainNode

  private ctx: AudioContext
  private dry: GainNode
  private fxBus: GainNode
  private splitter: ChannelSplitterNode
  private merger: ChannelMergerNode
  private crossL: DelayNode
  private crossR: DelayNode
  private crossLpL: BiquadFilterNode
  private crossLpR: BiquadFilterNode
  private crossGainL: GainNode
  private crossGainR: GainNode
  private directL: GainNode
  private directR: GainNode
  private reflectGain: GainNode
  private taps: { delay: DelayNode; gain: GainNode }[] = []
  private panner: PannerNode
  private pinnaNotch: BiquadFilterNode
  private presence: BiquadFilterNode
  private airAbs: BiquadFilterNode
  private haasDelay: DelayNode
  private haasWet: GainNode
  private params: SpatialParams
  private raf = 0
  private t0 = 0

  constructor(ctx: AudioContext, initial: SpatialParams) {
    this.ctx = ctx
    this.params = { ...initial }
    this.input = ctx.createGain()
    this.output = ctx.createGain()
    this.dry = ctx.createGain()
    this.fxBus = ctx.createGain()
    this.splitter = ctx.createChannelSplitter(2)
    this.merger = ctx.createChannelMerger(2)

    this.crossL = ctx.createDelay(0.05)
    this.crossR = ctx.createDelay(0.05)
    this.crossL.delayTime.value = 0.00065
    this.crossR.delayTime.value = 0.00065
    this.crossLpL = ctx.createBiquadFilter()
    this.crossLpR = ctx.createBiquadFilter()
    this.crossLpL.type = 'lowpass'
    this.crossLpR.type = 'lowpass'
    this.crossLpL.frequency.value = 900
    this.crossLpR.frequency.value = 900
    this.crossGainL = ctx.createGain()
    this.crossGainR = ctx.createGain()
    this.directL = ctx.createGain()
    this.directR = ctx.createGain()
    this.directL.gain.value = 1
    this.directR.gain.value = 1

    this.reflectGain = ctx.createGain()
    this.reflectGain.gain.value = 0
    for (const [ms, g] of [
      [14, 0.1],
      [23, 0.07],
      [31, 0.05],
    ] as const) {
      const delay = ctx.createDelay(0.1)
      delay.delayTime.value = ms / 1000
      const gain = ctx.createGain()
      gain.gain.value = g
      this.taps.push({ delay, gain })
    }

    this.panner = ctx.createPanner()
    this.panner.panningModel = 'HRTF'
    this.panner.distanceModel = 'inverse'
    this.panner.refDistance = 1
    this.panner.maxDistance = 50
    this.panner.rolloffFactor = 1.1
    this.panner.coneInnerAngle = 360
    this.panner.coneOuterAngle = 360
    this.panner.setPosition(0, 0, -1.4)

    this.pinnaNotch = ctx.createBiquadFilter()
    this.pinnaNotch.type = 'notch'
    this.pinnaNotch.frequency.value = 7800
    this.pinnaNotch.Q.value = 3.5
    this.pinnaNotch.gain.value = 0

    this.presence = ctx.createBiquadFilter()
    this.presence.type = 'peaking'
    this.presence.frequency.value = 3200
    this.presence.Q.value = 1.1
    this.presence.gain.value = 0

    this.airAbs = ctx.createBiquadFilter()
    this.airAbs.type = 'lowpass'
    this.airAbs.frequency.value = 16000
    this.airAbs.Q.value = 0.707

    this.haasDelay = ctx.createDelay(0.05)
    this.haasDelay.delayTime.value = 0.016
    this.haasWet = ctx.createGain()
    this.haasWet.gain.value = 0

    this.wire()
    this.apply(initial)
    this.t0 = ctx.currentTime
    this.tick()
  }

  private wire() {
    // Dry bypass — always available, level set in apply()
    this.input.connect(this.dry)
    this.dry.connect(this.output)

    // Mono-safe stereo split for crossfeed
    this.input.connect(this.splitter)
    this.splitter.connect(this.directL, 0)
    this.splitter.connect(this.directR, 1)
    this.directL.connect(this.merger, 0, 0)
    this.directR.connect(this.merger, 0, 1)

    // Opposite-ear crossfeed (externalizer)
    this.splitter.connect(this.crossR, 0)
    this.splitter.connect(this.crossL, 1)
    this.crossR.connect(this.crossLpR).connect(this.crossGainR).connect(this.merger, 0, 1)
    this.crossL.connect(this.crossLpL).connect(this.crossGainL).connect(this.merger, 0, 0)

    // Soft early reflections (externalizer wetness)
    for (const t of this.taps) {
      this.input.connect(t.delay).connect(t.gain).connect(this.reflectGain)
    }
    this.reflectGain.connect(this.merger, 0, 0)
    this.reflectGain.connect(this.merger, 0, 1)

    // Localization chain → HRTF panner
    this.merger
      .connect(this.pinnaNotch)
      .connect(this.presence)
      .connect(this.airAbs)
      .connect(this.fxBus)
    this.fxBus.connect(this.panner)
    this.panner.connect(this.output)

    // Haas width — wet only into the opposite side of the merger pre-EQ
    this.input.connect(this.haasDelay).connect(this.haasWet)
    this.haasWet.connect(this.merger, 0, 1)
  }

  apply(p: Partial<SpatialParams>) {
    this.params = { ...this.params, ...p }
    const s = this.params
    const ctx = this.ctx

    const ext = clamp(s.externalizer, 0, 1)
    const prox = clamp(s.proximity, 0, 1)
    const fb = clamp(s.frontBehind, -1, 1)
    const orbit = clamp(s.orbitSpeed, 0, 0.5)
    const dual = clamp(s.dualPan, 0, 1)

    // How much of the signal rides the spatial wet path vs dry
    const wetAmt = clamp(ext * 0.85 + prox * 0.55 + Math.abs(fb) * 0.45 + dual * 0.5 + (orbit > 0.02 ? 0.35 : 0), 0, 1)
    setParam(this.fxBus.gain, wetAmt, ctx)
    setParam(this.dry.gain, 1 - wetAmt * 0.72, ctx)

    // Externalizer → crossfeed depth + reflections
    setParam(this.crossGainL.gain, ext * 0.28, ctx)
    setParam(this.crossGainR.gain, ext * 0.28, ctx)
    setParam(this.reflectGain.gain, ext * 0.22, ctx)

    // Front / behind — clear tonal + orientation cue
    // Behind: notch near pinna region; Front: presence lift
    setParam(this.pinnaNotch.frequency, lerp(7800, 6200, Math.max(0, -fb)), ctx)
    // WebAudio notch uses Q; emulate depth via wet path presence of notch by blending peaking
    // Use presence gain for front, and a second peaking cut for rear via pinnaNotch as peaking
    this.pinnaNotch.type = fb < -0.05 ? 'peaking' : 'peaking'
    setParam(this.pinnaNotch.gain, fb < 0 ? -7 * Math.abs(fb) : 0, ctx)
    setParam(this.presence.gain, fb > 0 ? 3.5 * fb : fb < 0 ? -1.2 * Math.abs(fb) : 0, ctx)

    // Proximity → air absorption (very audible dulling when far)
    const airHz = lerp(15500, 1800, prox)
    setParam(this.airAbs.frequency, nyquistClamp(airHz, ctx.sampleRate), ctx)

    // Haas width — only when dualPan engaged
    setParam(this.haasWet.gain, dual * 0.4, ctx)
    setParam(this.haasDelay.delayTime, lerp(0.008, 0.02, dual), ctx)

    this.panner.setOrientation(0, 0, fb >= 0 ? -1 : 1)
  }

  private tick = () => {
    if (!this.ctx) return
    const s = this.params
    const now = this.ctx.currentTime - this.t0
    const prox = clamp(s.proximity, 0, 1)
    const rate = Math.max(0, s.proximityRate)
    const proxLfo = rate > 0.001 ? Math.sin(now * Math.PI * 2 * rate) * prox * 1.5 : 0
    const dist = lerp(0.9, 14, prox) + proxLfo
    const [x, y, z] = this.orbitPos(
      now,
      dist,
      s.orbitSpeed,
      s.orbitMode,
      s.frontBehind,
    )
    this.panner.setPosition(x, y, z)
    this.raf = requestAnimationFrame(this.tick)
  }

  private orbitPos(
    t: number,
    dist: number,
    speed: number,
    mode: OrbitMode,
    fb: number,
  ): [number, number, number] {
    const zSign = fb >= 0 ? -1 : 1
    const spd = clamp(speed, 0, 0.5)
    // Static placement when orbit is cleared / near zero
    if (spd < 0.015) {
      return [0, 0.05, zSign * dist]
    }
    const a = t * Math.PI * 2 * spd
    if (mode === 'figure8') {
      return [Math.sin(a) * dist, Math.sin(a * 2) * dist * 0.4, zSign * Math.cos(a) * dist * 0.55]
    }
    if (mode === 'overCrown') {
      return [Math.sin(a) * dist * 0.65, Math.abs(Math.cos(a)) * dist * 0.9, zSign * Math.cos(a) * dist * 0.35]
    }
    return [Math.sin(a) * dist, 0.08, zSign * Math.cos(a) * dist]
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
