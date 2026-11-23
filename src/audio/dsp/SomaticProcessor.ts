import type { SomaticParams } from '../../types/psychoacoustic'
import { clamp, dbToGain, nyquistClamp, setParam } from './util'

/**
 * Somatic / body resonance — chest bass, phantom fundamental,
 * 40 Hz cranial pulse, ASMR whisper shelf on voice.
 */
export class SomaticProcessor {
  /** Mix into master after bus sum */
  readonly output: GainNode
  /** Insert on voice path */
  readonly voiceIn: GainNode
  readonly voiceOut: GainNode

  private ctx: AudioContext
  private musicTap: GainNode
  private freqTap: GainNode
  private chestBp: BiquadFilterNode
  private chestGain: GainNode
  private chestShaper: WaveShaperNode
  private phantom80: OscillatorNode
  private phantom120: OscillatorNode
  private phantomGain: GainNode
  private cranial: OscillatorNode
  private cranialGain: GainNode
  private cranialLfo: OscillatorNode
  private cranialDepth: GainNode
  private asmrHi: BiquadFilterNode
  private asmrLo: BiquadFilterNode
  private asmrComp: DynamicsCompressorNode
  private asmrDry: GainNode
  private asmrWet: GainNode

  constructor(ctx: AudioContext, initial: SomaticParams) {
    this.ctx = ctx
    this.output = ctx.createGain()
    this.voiceIn = ctx.createGain()
    this.voiceOut = ctx.createGain()
    this.musicTap = ctx.createGain()
    this.freqTap = ctx.createGain()
    this.musicTap.gain.value = 1
    this.freqTap.gain.value = 1

    // Sub-harmonic chest: 60–120 Hz band → soft clip (octave-down warmth via shaping)
    this.chestBp = ctx.createBiquadFilter()
    this.chestBp.type = 'bandpass'
    this.chestBp.frequency.value = 90
    this.chestBp.Q.value = 1.4
    this.chestGain = ctx.createGain()
    this.chestShaper = ctx.createWaveShaper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(this.chestShaper as { curve: Float32Array | null }).curve = makeSoftClipCurve(2048)
    this.chestShaper.oversample = '2x'

    this.musicTap.connect(this.chestBp)
    this.freqTap.connect(this.chestBp)
    this.chestBp.connect(this.chestShaper).connect(this.chestGain).connect(this.output)

    // Phantom fundamental: 80 + 120 Hz (missing 40 Hz root cues)
    this.phantomGain = ctx.createGain()
    this.phantom80 = ctx.createOscillator()
    this.phantom120 = ctx.createOscillator()
    this.phantom80.type = 'sine'
    this.phantom120.type = 'sine'
    this.phantom80.frequency.value = 80
    this.phantom120.frequency.value = 120
    this.phantom80.connect(this.phantomGain)
    this.phantom120.connect(this.phantomGain)
    this.phantomGain.connect(this.output)
    this.phantom80.start()
    this.phantom120.start()

    // 40 Hz cranial AM by ~0.1 Hz
    this.cranial = ctx.createOscillator()
    this.cranial.type = 'sine'
    this.cranial.frequency.value = 40
    this.cranialGain = ctx.createGain()
    this.cranialGain.gain.value = 0
    this.cranialLfo = ctx.createOscillator()
    this.cranialLfo.frequency.value = 0.1
    this.cranialDepth = ctx.createGain()
    this.cranialDepth.gain.value = 0
    this.cranialLfo.connect(this.cranialDepth).connect(this.cranialGain.gain)
    this.cranial.connect(this.cranialGain).connect(this.output)
    this.cranial.start()
    this.cranialLfo.start()

    // ASMR whisper on voice
    this.asmrHi = ctx.createBiquadFilter()
    this.asmrHi.type = 'highshelf'
    this.asmrHi.frequency.value = 12000
    this.asmrLo = ctx.createBiquadFilter()
    this.asmrLo.type = 'lowshelf'
    this.asmrLo.frequency.value = 150
    this.asmrComp = ctx.createDynamicsCompressor()
    this.asmrComp.threshold.value = -24
    this.asmrComp.knee.value = 6
    this.asmrComp.ratio.value = 8
    this.asmrComp.attack.value = 0.003
    this.asmrComp.release.value = 0.12
    this.asmrDry = ctx.createGain()
    this.asmrWet = ctx.createGain()

    this.voiceIn.connect(this.asmrDry)
    this.voiceIn.connect(this.asmrHi)
    this.asmrHi.connect(this.asmrLo).connect(this.asmrComp).connect(this.asmrWet)
    this.asmrDry.connect(this.voiceOut)
    this.asmrWet.connect(this.voiceOut)

    this.apply(initial)
  }

  /** Tap music / frequency bus post-gain for chest extraction */
  connectTaps(music: AudioNode, frequency: AudioNode) {
    music.connect(this.musicTap)
    frequency.connect(this.freqTap)
  }

  apply(p: SomaticParams) {
    const ctx = this.ctx
    const chest = clamp(p.chestBass, 0, 1)
    setParam(this.chestGain.gain, chest * dbToGain(-18), ctx)

    const phant = clamp(p.phantomFundamental, 0, 1)
    setParam(this.phantomGain.gain, phant * dbToGain(-28), ctx)

    const cran = clamp(p.cranialPulse, 0, 1)
    setParam(this.cranialGain.gain, cran * dbToGain(-26), ctx)
    setParam(this.cranialDepth.gain, cran * dbToGain(-26) * 0.85, ctx)

    const asmr = clamp(p.asmrWhisper, 0, 1)
    setParam(this.asmrHi.gain, 4 * asmr, ctx)
    setParam(this.asmrLo.gain, 3 * asmr, ctx)
    setParam(this.asmrWet.gain, asmr, ctx)
    setParam(this.asmrDry.gain, 1 - asmr * 0.35, ctx)
    setParam(this.asmrHi.frequency, nyquistClamp(12000, ctx.sampleRate), ctx)
  }

  dispose() {
    try {
      this.phantom80.stop()
      this.phantom120.stop()
      this.cranial.stop()
      this.cranialLfo.stop()
    } catch {
      /* noop */
    }
  }
}

function makeSoftClipCurve(n: number): Float32Array {
  const buf = new ArrayBuffer(n * 4)
  const curve = new Float32Array(buf)
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1
    curve[i] = Math.tanh(x * 1.6) * 0.95
  }
  return curve
}
