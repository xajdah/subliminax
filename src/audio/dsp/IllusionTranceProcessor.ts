import type { IllusionParams } from '../../types/psychoacoustic'
import { clamp, dbToGain, lerp, nyquistClamp, setParam } from './util'

const SHEPARD_HZ = [32, 64, 128, 256, 512, 1024, 2048] as const
const SHEPARD_PEAK_HZ = 180
const SHEPARD_GLIDE_OCT_PER_SEC = 0.04

/**
 * Illusions & Trance — Shepard descent, phase vacuum, phantom word,
 * inner-monologue formants, stochastic resonance, brainwave chirp state.
 */
export class IllusionTranceProcessor {
  readonly output: GainNode
  readonly voiceIn: GainNode
  readonly voiceOut: GainNode

  private ctx: AudioContext
  private params: IllusionParams
  private soundIn: GainNode
  private shepardGain: GainNode
  private shepardOscs: OscillatorNode[] = []
  private shepardAmps: GainNode[] = []
  private shepardPhases = SHEPARD_HZ.map((hz) => Math.log2(hz))
  private vacuumDry: GainNode
  private vacuumWet: GainNode
  private vacuumInvert: GainNode
  private vacuumWidth: GainNode
  private phantomHp: BiquadFilterNode
  private phantomLp: BiquadFilterNode
  private phantomDelayL: DelayNode
  private phantomDelayR: DelayNode
  private phantomPanL: StereoPannerNode
  private phantomPanR: StereoPannerNode
  private phantomGain: GainNode
  private formantDry: GainNode
  private formantWet: GainNode
  private formants: BiquadFilterNode[] = []
  private chestRes: BiquadFilterNode
  private ditherGain: GainNode
  private ditherSrc: AudioBufferSourceNode | null = null
  private raf = 0
  private t0 = 0
  private chirpStart = 0
  private chirpActive = false
  private liveBeatHz = 6
  private affirmationSnapUntil = 0

  constructor(ctx: AudioContext, initial: IllusionParams) {
    this.ctx = ctx
    this.params = { ...initial }
    this.output = ctx.createGain()
    this.voiceIn = ctx.createGain()
    this.voiceOut = ctx.createGain()
    this.soundIn = ctx.createGain()

    // —— Shepard-Risset ——
    this.shepardGain = ctx.createGain()
    this.shepardGain.gain.value = 0
    for (let i = 0; i < SHEPARD_HZ.length; i++) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = SHEPARD_HZ[i]
      const amp = ctx.createGain()
      amp.gain.value = 0
      osc.connect(amp).connect(this.shepardGain)
      osc.start()
      this.shepardOscs.push(osc)
      this.shepardAmps.push(amp)
    }
    this.shepardGain.connect(this.output)

    // —— Phase vacuum (parallel inverted width on music) ——
    this.vacuumDry = ctx.createGain()
    this.vacuumWet = ctx.createGain()
    this.vacuumInvert = ctx.createGain()
    this.vacuumInvert.gain.value = -1
    this.vacuumWidth = ctx.createGain()
    this.vacuumDry.connect(this.output)
    this.vacuumWet.connect(this.vacuumInvert).connect(this.vacuumWidth).connect(this.output)

    // —— Phantom word ghost-loop → soundscape ——
    this.phantomHp = ctx.createBiquadFilter()
    this.phantomHp.type = 'highpass'
    this.phantomHp.frequency.value = 400
    this.phantomLp = ctx.createBiquadFilter()
    this.phantomLp.type = 'lowpass'
    this.phantomLp.frequency.value = 2800
    this.phantomDelayL = ctx.createDelay(0.5)
    this.phantomDelayR = ctx.createDelay(0.5)
    this.phantomDelayL.delayTime.value = 0.145
    this.phantomDelayR.delayTime.value = 0.23
    this.phantomPanL = ctx.createStereoPanner()
    this.phantomPanR = ctx.createStereoPanner()
    this.phantomPanL.pan.value = -1
    this.phantomPanR.pan.value = 1
    this.phantomGain = ctx.createGain()
    this.phantomGain.gain.value = 0
    this.voiceIn.connect(this.phantomHp)
    this.phantomHp.connect(this.phantomLp)
    this.phantomLp.connect(this.phantomDelayL).connect(this.phantomPanL).connect(this.phantomGain)
    this.phantomLp.connect(this.phantomDelayR).connect(this.phantomPanR).connect(this.phantomGain)
    this.phantomGain.connect(this.soundIn)

    // —— Inner-monologue formant shift ——
    this.formantDry = ctx.createGain()
    this.formantWet = ctx.createGain()
    const f1 = ctx.createBiquadFilter()
    f1.type = 'peaking'
    f1.frequency.value = 500
    f1.Q.value = 5
    f1.gain.value = 6
    const f2 = ctx.createBiquadFilter()
    f2.type = 'peaking'
    f2.frequency.value = 1500
    f2.Q.value = 5
    f2.gain.value = 5
    const f3 = ctx.createBiquadFilter()
    f3.type = 'peaking'
    f3.frequency.value = 2500
    f3.Q.value = 4
    f3.gain.value = 4
    this.formants = [f1, f2, f3]
    this.chestRes = ctx.createBiquadFilter()
    this.chestRes.type = 'lowpass'
    this.chestRes.frequency.value = 140
    this.voiceIn.connect(this.formantDry)
    this.voiceIn.connect(f1)
    f1.connect(f2).connect(f3).connect(this.chestRes).connect(this.formantWet)
    this.formantDry.connect(this.voiceOut)
    this.formantWet.connect(this.voiceOut)

    // —— Stochastic dither into voice ——
    this.ditherGain = ctx.createGain()
    this.ditherGain.gain.value = 0
    this.ditherGain.connect(this.voiceOut)
    this.ensureDither()

    this.t0 = ctx.currentTime
    this.apply(initial)
    this.tick()
  }

  /** Music bus tap for phase vacuum */
  connectMusic(music: AudioNode) {
    music.connect(this.vacuumDry)
    music.connect(this.vacuumWet)
  }

  /** Soundscape bus input for phantom-word injection */
  connectSoundscape(soundIn: GainNode) {
    this.soundIn.connect(soundIn)
  }

  /** Call on affirmation phrase start — snaps phase vacuum to +1 briefly */
  triggerAffirmationPhrase() {
    this.affirmationSnapUntil = this.ctx.currentTime + 0.35
  }

  getLiveBeatHz(): number {
    return this.liveBeatHz
  }

  apply(p: IllusionParams) {
    const prevChirp = this.params.chirpDurationMinutes
    this.params = { ...p }
    const ctx = this.ctx
    const shep = clamp(p.shepardIntensity, 0, 1)
    setParam(this.shepardGain.gain, shep * dbToGain(-22), ctx)

    const vac = clamp(p.phaseVacuum, 0, 1)
    setParam(this.vacuumWet.gain, vac * 0.55, ctx)
    setParam(this.vacuumDry.gain, 1 - vac * 0.25, ctx)

    const phant = clamp(p.phantomWord, 0, 1)
    setParam(this.phantomGain.gain, phant * dbToGain(-16), ctx)

    // Formant: -1 internal … +1 external; negative shifts F1–F3 down 12%
    const form = clamp(p.innerVoiceFormant, -1, 1)
    const shift = form < 0 ? 1 - 0.12 * Math.abs(form) : 1 + 0.06 * form
    const bases = [500, 1500, 2500]
    this.formants.forEach((f, i) => {
      setParam(f.frequency, nyquistClamp(bases[i] * shift, ctx.sampleRate), ctx)
    })
    const wet = Math.abs(form) * 0.75
    setParam(this.formantWet.gain, wet, ctx)
    setParam(this.formantDry.gain, 1 - wet * 0.45, ctx)
    setParam(this.chestRes.frequency, form < 0 ? 140 : lerp(140, 400, form), ctx)

    // Stochastic: -45 … -34 dBFS
    const stoch = clamp(p.stochasticBoost, 0, 1)
    const ditherDb = lerp(-45, -34, stoch)
    setParam(this.ditherGain.gain, stoch > 0.001 ? dbToGain(ditherDb) : 0, ctx)

    if (p.chirpDurationMinutes > 0 && (prevChirp <= 0 || !this.chirpActive)) {
      this.chirpStart = ctx.currentTime
      this.chirpActive = true
    }
    if (p.chirpDurationMinutes <= 0) {
      this.chirpActive = false
    }
  }

  private ensureDither() {
    if (this.ditherSrc) return
    const len = this.ctx.sampleRate * 2
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const d = buf.getChannelData(0)
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    src.connect(this.ditherGain)
    src.start()
    this.ditherSrc = src
  }

  /** Gaussian window peaking at 180 Hz (in log-frequency space) */
  private shepardAmp(hz: number): number {
    const x = Math.log2(hz / SHEPARD_PEAK_HZ)
    return Math.exp(-0.5 * (x / 0.85) ** 2)
  }

  private tick = () => {
    const ctx = this.ctx
    const dt = 1 / 60
    const shep = clamp(this.params.shepardIntensity, 0, 1)
    if (shep > 0.001) {
      for (let i = 0; i < this.shepardPhases.length; i++) {
        this.shepardPhases[i] -= SHEPARD_GLIDE_OCT_PER_SEC * dt
        // Wrap into 5-octave spiral window
        while (this.shepardPhases[i] < Math.log2(32)) this.shepardPhases[i] += 5
        const hz = nyquistClamp(2 ** this.shepardPhases[i], ctx.sampleRate)
        this.shepardOscs[i].frequency.setTargetAtTime(hz, ctx.currentTime, 0.03)
        const a = this.shepardAmp(hz) * shep * 0.22
        this.shepardAmps[i].gain.setTargetAtTime(a, ctx.currentTime, 0.05)
      }
    }

    // Phase vacuum correlation: +1 → -1, snap to +1 on affirmation
    const vac = clamp(this.params.phaseVacuum, 0, 1)
    if (vac > 0.001) {
      const t = ctx.currentTime - this.t0
      let corr = Math.cos(t * 0.35) // +1 … -1 slow
      if (ctx.currentTime < this.affirmationSnapUntil) corr = 1
      const wet = vac * lerp(0, 0.65, (1 - corr) * 0.5)
      setParam(this.vacuumWet.gain, wet, ctx, 0.08)
      setParam(this.vacuumWidth.gain, Math.abs(corr), ctx, 0.08)
    }

    // Brainwave chirp: 16 → 10 → 4/1.5 exponential over duration
    if (this.chirpActive && this.params.chirpDurationMinutes > 0) {
      const dur = this.params.chirpDurationMinutes * 60
      const u = clamp((ctx.currentTime - this.chirpStart) / dur, 0, 1)
      const expU = 1 - Math.exp(-3.2 * u)
      const target = this.params.chirpDurationMinutes >= 20 ? 1.5 : 4
      // 16 → 10 early, then → target
      this.liveBeatHz = u < 0.35 ? lerp(16, 10, u / 0.35) : lerp(10, target, (u - 0.35) / 0.65)
      this.liveBeatHz = lerp(16, this.liveBeatHz, expU / Math.max(expU, 0.001))
      // Simpler clean exponential 16→target
      this.liveBeatHz = 16 * Math.pow(target / 16, expU)
      if (u >= 1) this.chirpActive = false
    }

    this.raf = requestAnimationFrame(this.tick)
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    try {
      this.shepardOscs.forEach((o) => o.stop())
      this.ditherSrc?.stop()
    } catch {
      /* noop */
    }
  }
}
