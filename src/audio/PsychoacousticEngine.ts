import {
  DEFAULT_PSYCHO,
  type FrequencyGenParams,
  type NoiseColor,
  type PsychoacousticState,
} from '../types/psychoacoustic'
import { BreathMaskingProcessor } from './dsp/BreathMaskingProcessor'
import { IllusionTranceProcessor } from './dsp/IllusionTranceProcessor'
import { NeuroIllusionProcessor } from './dsp/NeuroIllusionProcessor'
import { SomaticProcessor } from './dsp/SomaticProcessor'
import { SpatialProcessor } from './dsp/SpatialProcessor'
import { clamp, dbToGain, nyquistClamp, setParam } from './dsp/util'
import {
  NOISE_WORKLET_NAME,
  ensureWorklets,
} from './worklets/workletSources'

export type BusId = 'music' | 'soundscape' | 'frequency' | 'voice'

export interface BusAnalysers {
  music: AnalyserNode
  soundscape: AnalyserNode
  frequency: AnalyserNode
  voice: AnalyserNode
}

type Listener = (s: PsychoacousticState) => void

interface Bus {
  input: GainNode
  gain: GainNode
  lpf: BiquadFilterNode
  analyser: AnalyserNode
  out: GainNode
}

/**
 * Zero-clipping 4-bus Psychoacoustic DSP Engine.
 * Music / Soundscape / Frequency / Voice → brickwall compressor → destination.
 */
export class PsychoacousticEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private limiter: DynamicsCompressorNode | null = null
  private sum: GainNode | null = null
  private buses: Record<BusId, Bus> | null = null
  private state: PsychoacousticState = structuredClone(DEFAULT_PSYCHO)
  private listeners = new Set<Listener>()
  private playing = false

  private spatial: SpatialProcessor | null = null
  private somatic: SomaticProcessor | null = null
  private breath: BreathMaskingProcessor | null = null
  private illusions: IllusionTranceProcessor | null = null
  private neuro: NeuroIllusionProcessor | null = null

  private noiseNode: AudioWorkletNode | null = null
  private musicOsc: OscillatorNode | null = null
  private musicGain: GainNode | null = null
  private freqOscL: OscillatorNode | null = null
  private freqOscR: OscillatorNode | null = null
  private freqGain: GainNode | null = null
  private freqMerger: ChannelMergerNode | null = null
  private isoGain: GainNode | null = null
  private isoLfo: OscillatorNode | null = null
  private voiceOsc: OscillatorNode | null = null
  private voiceGain: GainNode | null = null
  private savedBuses: PsychoacousticState['buses'] | null = null
  private raf = 0

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.getState())
    return () => this.listeners.delete(fn)
  }

  private emit() {
    const s = this.getState()
    this.listeners.forEach((l) => l(s))
  }

  getState(): PsychoacousticState {
    return {
      ...this.state,
      liveBeatHz: this.illusions?.getLiveBeatHz() ?? this.state.frequency.beatHz,
    }
  }

  getAnalysers(): BusAnalysers | null {
    if (!this.buses) return null
    return {
      music: this.buses.music.analyser,
      soundscape: this.buses.soundscape.analyser,
      frequency: this.buses.frequency.analyser,
      voice: this.buses.voice.analyser,
    }
  }

  isPlaying() {
    return this.playing
  }

  private ensureCtx(): AudioContext {
    if (this.ctx) return this.ctx
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new Ctx()
    return this.ctx
  }

  private makeBus(ctx: AudioContext, db: number): Bus {
    const input = ctx.createGain()
    const gain = ctx.createGain()
    gain.gain.value = dbToGain(db)
    const lpf = ctx.createBiquadFilter()
    lpf.type = 'lowpass'
    lpf.frequency.value = nyquistClamp(18000, ctx.sampleRate)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.75
    const out = ctx.createGain()
    input.connect(gain).connect(lpf).connect(analyser).connect(out)
    return { input, gain, lpf, analyser, out }
  }

  async start() {
    const ctx = this.ensureCtx()
    if (ctx.state === 'suspended') await ctx.resume()
    if (this.playing) return
    await ensureWorklets(ctx)

    this.sum = ctx.createGain()
    this.limiter = ctx.createDynamicsCompressor()
    this.limiter.threshold.value = -1
    this.limiter.knee.value = 0
    this.limiter.ratio.value = 20
    this.limiter.attack.value = 0.001
    this.limiter.release.value = 0.05
    this.master = ctx.createGain()
    this.master.gain.value = dbToGain(this.state.masterDb)

    this.buses = {
      music: this.makeBus(ctx, this.state.buses.music),
      soundscape: this.makeBus(ctx, this.state.buses.soundscape),
      frequency: this.makeBus(ctx, this.state.buses.frequency),
      voice: this.makeBus(ctx, this.state.buses.voice),
    }

    this.spatial = new SpatialProcessor(ctx, this.state.spatial)
    this.somatic = new SomaticProcessor(ctx, this.state.somatic)
    this.breath = new BreathMaskingProcessor(ctx, this.state.breath)
    this.illusions = new IllusionTranceProcessor(ctx, this.state.illusions)
    this.neuro = new NeuroIllusionProcessor(ctx, this.state.neuro)

    // Voice path: bus → illusions formant/dither → neuro → breath → spatial → sum
    this.buses.voice.out.connect(this.illusions.voiceIn)
    this.illusions.voiceOut.connect(this.neuro.voiceIn)
    this.neuro.voiceOut.connect(this.breath.voiceIn)
    this.breath.voiceOut.connect(this.spatial.input)
    this.spatial.output.connect(this.sum)

    // Music / soundscape / frequency → sum (+ somatic taps)
    this.buses.music.out.connect(this.sum)
    this.buses.soundscape.out.connect(this.sum)
    this.buses.frequency.out.connect(this.sum)
    this.somatic.connectTaps(this.buses.music.out, this.buses.frequency.out)
    this.somatic.output.connect(this.sum)
    this.illusions.connectMusic(this.buses.music.out)
    this.illusions.connectSoundscape(this.buses.soundscape.input)
    this.illusions.output.connect(this.sum)
    this.neuro.output.connect(this.sum)
    this.neuro.musicSend.connect(this.buses.music.input)

    this.breath.bindBuses({
      musicGain: this.buses.music.gain,
      soundGain: this.buses.soundscape.gain,
      musicLpf: this.buses.music.lpf,
      soundLpf: this.buses.soundscape.lpf,
      musicAnalyser: this.buses.music.analyser,
      soundAnalyser: this.buses.soundscape.analyser,
      voiceBaseDb: this.state.buses.voice,
    })

    this.sum.connect(this.limiter).connect(this.master).connect(ctx.destination)

    await this.startDemoSources()
    this.applyAll()
    this.playing = true
    this.loop()
    this.emit()
  }

  private async startDemoSources() {
    const ctx = this.ctx!
    const b = this.buses!

    // Music: soft pad tone
    this.musicGain = ctx.createGain()
    this.musicGain.gain.value = 0.2
    this.musicOsc = ctx.createOscillator()
    this.musicOsc.type = 'triangle'
    this.musicOsc.frequency.value = 110
    this.musicOsc.connect(this.musicGain).connect(b.music.input)
    this.musicOsc.start()

    // Soundscape: noise worklet
    try {
      this.noiseNode = new AudioWorkletNode(ctx, NOISE_WORKLET_NAME)
      this.noiseNode.port.postMessage({ color: this.state.soundscapeNoise })
      const ng = ctx.createGain()
      ng.gain.value = 0.25
      this.noiseNode.connect(ng).connect(b.soundscape.input)
    } catch {
      /* fallback silent */
    }

    // Frequency entrainment
    this.rebuildFrequency(this.state.frequency)

    // Voice: soft carrier (stands in for affirmations in studio demo)
    this.voiceGain = ctx.createGain()
    this.voiceGain.gain.value = 0.15
    this.voiceOsc = ctx.createOscillator()
    this.voiceOsc.type = 'sine'
    this.voiceOsc.frequency.value = 220
    this.voiceOsc.connect(this.voiceGain).connect(b.voice.input)
    this.voiceOsc.start()
  }

  private rebuildFrequency(f: FrequencyGenParams) {
    const ctx = this.ctx
    const b = this.buses
    if (!ctx || !b) return
    this.stopFreqNodes()
    if (f.mode === 'off') return

    this.freqGain = ctx.createGain()
    this.freqGain.gain.value = 0.2
    const beat =
      this.state.illusions.chirpDurationMinutes > 0
        ? this.illusions?.getLiveBeatHz() ?? f.beatHz
        : f.beatHz

    if (f.mode === 'binaural') {
      this.freqMerger = ctx.createChannelMerger(2)
      this.freqOscL = ctx.createOscillator()
      this.freqOscR = ctx.createOscillator()
      this.freqOscL.frequency.value = nyquistClamp(f.carrierHz, ctx.sampleRate)
      this.freqOscR.frequency.value = nyquistClamp(f.carrierHz + beat, ctx.sampleRate)
      this.freqOscL.connect(this.freqMerger, 0, 0)
      this.freqOscR.connect(this.freqMerger, 0, 1)
      this.freqMerger.connect(this.freqGain).connect(b.frequency.input)
      this.freqOscL.start()
      this.freqOscR.start()
    } else if (f.mode === 'monaural' || f.mode === 'solfeggio') {
      const hz = f.mode === 'solfeggio' ? f.solfeggioHz : f.carrierHz
      this.freqOscL = ctx.createOscillator()
      this.freqOscL.frequency.value = nyquistClamp(hz, ctx.sampleRate)
      this.freqOscL.connect(this.freqGain).connect(b.frequency.input)
      this.freqOscL.start()
    } else if (f.mode === 'isochronic') {
      this.freqOscL = ctx.createOscillator()
      this.freqOscL.frequency.value = nyquistClamp(f.carrierHz, ctx.sampleRate)
      this.isoGain = ctx.createGain()
      this.isoGain.gain.value = 0
      this.isoLfo = ctx.createOscillator()
      this.isoLfo.frequency.value = Math.max(0.5, beat)
      const depth = ctx.createGain()
      depth.gain.value = 0.5
      const bias = ctx.createConstantSource()
      bias.offset.value = 0.5
      bias.start()
      this.isoLfo.connect(depth).connect(this.isoGain.gain)
      bias.connect(this.isoGain.gain)
      this.freqOscL.connect(this.isoGain).connect(this.freqGain).connect(b.frequency.input)
      this.freqOscL.start()
      this.isoLfo.start()
    }
  }

  private stopFreqNodes() {
    try {
      this.freqOscL?.stop()
      this.freqOscR?.stop()
      this.isoLfo?.stop()
    } catch {
      /* noop */
    }
    this.freqOscL = this.freqOscR = this.isoLfo = null
    this.freqGain = this.isoGain = this.freqMerger = null
  }

  private loop = () => {
    if (!this.playing || !this.buses || !this.breath) return
    const music = dbToGain(this.state.buses.music)
    const sound = dbToGain(this.state.buses.soundscape)
    this.breath.applyBreathBusGains(
      this.state.isolateVoice ? 0.0001 : music,
      this.state.isolateVoice ? 0.0001 : sound,
    )
    // Chirp updates beat
    if (this.state.illusions.chirpDurationMinutes > 0 && this.illusions) {
      const hz = this.illusions.getLiveBeatHz()
      if (this.freqOscR && this.state.frequency.mode === 'binaural') {
        setParam(
          this.freqOscR.frequency,
          nyquistClamp(this.state.frequency.carrierHz + hz, this.ctx!.sampleRate),
          this.ctx!,
        )
      }
      if (this.isoLfo && this.state.frequency.mode === 'isochronic') {
        setParam(this.isoLfo.frequency, Math.max(0.5, hz), this.ctx!)
      }
    }
    this.emit()
    this.raf = requestAnimationFrame(this.loop)
  }

  stop() {
    this.playing = false
    cancelAnimationFrame(this.raf)
    this.spatial?.dispose()
    this.somatic?.dispose()
    this.breath?.dispose()
    this.illusions?.dispose()
    this.neuro?.dispose()
    this.spatial = this.somatic = this.breath = this.illusions = this.neuro = null
    try {
      this.musicOsc?.stop()
      this.voiceOsc?.stop()
      this.stopFreqNodes()
      this.noiseNode?.disconnect()
      this.ctx?.close()
    } catch {
      /* noop */
    }
    this.ctx = null
    this.buses = null
    this.master = this.limiter = this.sum = null
    this.emit()
  }

  patch(partial: DeepPartial<PsychoacousticState>) {
    this.state = mergeDeep(this.state as unknown as Rec, partial as unknown as DeepPartial<Rec>) as unknown as PsychoacousticState
    if (this.playing) this.applyAll()
    this.emit()
  }

  setBusDb(bus: BusId, db: number) {
    this.state.buses[bus] = clamp(db, -60, 0)
    if (this.buses && this.ctx) {
      setParam(this.buses[bus].gain.gain, dbToGain(this.state.buses[bus]), this.ctx)
    }
    this.emit()
  }

  setNoiseColor(color: NoiseColor) {
    this.state.soundscapeNoise = color
    this.noiseNode?.port.postMessage({ color })
    this.emit()
  }

  /** Instant X-Ray audition */
  setIsolateVoice(on: boolean) {
    if (on && !this.state.isolateVoice) {
      this.savedBuses = { ...this.state.buses }
      this.state.isolateVoice = true
      this.state.checkMasking = false
      this.applyBusAudition()
    } else if (!on && this.state.isolateVoice) {
      this.state.isolateVoice = false
      if (this.savedBuses) this.state.buses = { ...this.savedBuses }
      this.savedBuses = null
      this.applyBusAudition()
    }
    this.emit()
  }

  setCheckMasking(on: boolean) {
    if (on && !this.state.checkMasking) {
      this.savedBuses = this.savedBuses ?? { ...this.state.buses }
      this.state.checkMasking = true
      this.state.isolateVoice = false
      this.applyBusAudition()
    } else if (!on && this.state.checkMasking) {
      this.state.checkMasking = false
      if (this.savedBuses) this.state.buses = { ...this.savedBuses }
      this.savedBuses = null
      this.applyBusAudition()
    }
    this.emit()
  }

  private applyBusAudition() {
    if (!this.buses || !this.ctx) return
    const ctx = this.ctx
    if (this.state.isolateVoice) {
      setParam(this.buses.music.gain.gain, 0.0001, ctx)
      setParam(this.buses.soundscape.gain.gain, 0.0001, ctx)
      setParam(this.buses.frequency.gain.gain, 0.0001, ctx)
      setParam(this.buses.voice.gain.gain, dbToGain(0), ctx)
    } else if (this.state.checkMasking) {
      setParam(this.buses.music.gain.gain, dbToGain(this.state.buses.music), ctx)
      setParam(this.buses.soundscape.gain.gain, dbToGain(this.state.buses.soundscape), ctx)
      setParam(this.buses.frequency.gain.gain, dbToGain(this.state.buses.frequency), ctx)
      setParam(this.buses.voice.gain.gain, 0.0001, ctx)
    } else {
      ;(['music', 'soundscape', 'frequency', 'voice'] as BusId[]).forEach((id) => {
        setParam(this.buses![id].gain.gain, dbToGain(this.state.buses[id]), ctx)
      })
    }
  }

  triggerAffirmation() {
    this.illusions?.triggerAffirmationPhrase()
  }

  applyPreset(state: PsychoacousticState) {
    this.state = structuredClone(state)
    if (this.playing) {
      this.applyAll()
      this.rebuildFrequency(this.state.frequency)
    }
    this.emit()
  }

  private applyAll() {
    if (!this.ctx || !this.buses || !this.master) return
    const ctx = this.ctx
    setParam(this.master.gain, dbToGain(this.state.masterDb), ctx)
    this.applyBusAudition()
    this.spatial?.apply(this.state.spatial)
    this.somatic?.apply(this.state.somatic)
    this.breath?.apply(this.state.breath)
    this.illusions?.apply(this.state.illusions)
    this.neuro?.apply(this.state.neuro)
    this.noiseNode?.port.postMessage({ color: this.state.soundscapeNoise })
  }
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

type Rec = Record<string, unknown>

function mergeDeep(base: Rec, patch: DeepPartial<Rec>): Rec {
  const out: Rec = { ...base }
  for (const key of Object.keys(patch)) {
    const pv = patch[key]
    const bv = base[key]
    if (pv && typeof pv === 'object' && !Array.isArray(pv) && bv && typeof bv === 'object') {
      out[key] = mergeDeep(bv as Rec, pv as DeepPartial<Rec>)
    } else if (pv !== undefined) {
      out[key] = pv
    }
  }
  return out
}

export const psychoEngine = new PsychoacousticEngine()
