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
  busesFromManifestation,
  type ManifestationMode,
} from './manifestationCalibration'
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
  private ownsContext = true
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
  private voiceBufferSrc: AudioBufferSourceNode | null = null
  private voiceBufferGain: GainNode | null = null
  private voiceBuffer: AudioBuffer | null = null
  private voiceBufferLoop = true
  private savedBuses: PsychoacousticState['buses'] | null = null
  private raf = 0
  /** Master-clock phase accumulator for audio-visual sync (radians). */
  private entrainmentPhaseRad = 0
  private entrainmentPhaseAt = 0
  private entrainmentTrackHz = 6
  private breathPhaseRad = 0
  private breathPhaseAt = 0

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

  getAudioContext(): AudioContext | null {
    return this.ctx
  }

  /**
   * Instantaneous entrainment phase locked to audioCtx.currentTime
   * (never wall-clock timers). Phase wraps 0…2π at the active beat Hz.
   */
  getEntrainmentSnapshot(atTime?: number): {
    phaseRad: number
    beatHz: number
    breathPhaseRad: number
    breathCycleSec: number
    audioTime: number
  } {
    const audioTime = atTime ?? this.ctx?.currentTime ?? 0
    this.advanceEntrainmentPhase(audioTime)
    this.advanceBreathPhase(audioTime)
    return {
      phaseRad: this.wrapTwoPi(this.entrainmentPhaseRad),
      beatHz: this.entrainmentTrackHz,
      breathPhaseRad: this.wrapTwoPi(this.breathPhaseRad),
      breathCycleSec: this.breathCycleSeconds(),
      audioTime,
    }
  }

  private wrapTwoPi(r: number) {
    const TWO_PI = Math.PI * 2
    let x = r % TWO_PI
    if (x < 0) x += TWO_PI
    return x
  }

  private breathCycleSeconds() {
    return this.state.breath.breathPattern === '5-5' ? 10 : 19
  }

  private advanceEntrainmentPhase(audioTime: number) {
    const dt = Math.max(0, audioTime - this.entrainmentPhaseAt)
    this.entrainmentPhaseRad += 2 * Math.PI * this.entrainmentTrackHz * dt
    this.entrainmentPhaseAt = audioTime
  }

  private advanceBreathPhase(audioTime: number) {
    const dt = Math.max(0, audioTime - this.breathPhaseAt)
    const hz = 1 / this.breathCycleSeconds()
    this.breathPhaseRad += 2 * Math.PI * hz * dt
    this.breathPhaseAt = audioTime
  }

  private syncEntrainmentClock(hz: number) {
    const t = this.ctx?.currentTime ?? 0
    this.advanceEntrainmentPhase(t)
    this.entrainmentTrackHz = clamp(hz, 0.5, 40)
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

  /** External mix from CreateSubliminal MixEngine taps into the DSP sum */
  private mixTap: GainNode | null = null

  getMixTap(): GainNode | null {
    return this.mixTap
  }

  async start(opts?: { withDemoSources?: boolean; context?: AudioContext }) {
    const withDemo = opts?.withDemoSources !== false
    if (opts?.context) {
      this.ctx = opts.context
      this.ownsContext = false
    }
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

    // Beds + voice → spatial (so Space 3D sliders are audible on the mix)
    // Frequency stays direct so entrainment cues stay stable.
    this.buses.voice.out.connect(this.illusions.voiceIn)
    this.illusions.voiceOut.connect(this.neuro.voiceIn)
    this.neuro.voiceOut.connect(this.breath.voiceIn)
    this.breath.voiceOut.connect(this.spatial.input)
    this.buses.music.out.connect(this.spatial.input)
    this.buses.soundscape.out.connect(this.spatial.input)
    this.spatial.output.connect(this.sum)

    // Frequency → sum (+ somatic taps)
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

    this.mixTap = ctx.createGain()
    this.mixTap.gain.value = 1
    this.mixTap.connect(this.sum)

    this.sum.connect(this.limiter).connect(this.master).connect(ctx.destination)

    if (withDemo) await this.startDemoSources()
    if (this.voiceBuffer) this.startVoiceBufferPlayback()
    this.applyAll()
    const t0 = ctx.currentTime
    this.entrainmentPhaseRad = 0
    this.entrainmentPhaseAt = t0
    this.breathPhaseRad = 0
    this.breathPhaseAt = t0
    this.entrainmentTrackHz = clamp(
      this.state.illusions.chirpDurationMinutes > 0
        ? (this.illusions?.getLiveBeatHz() ?? this.state.frequency.beatHz)
        : this.state.frequency.beatHz,
      0.5,
      40,
    )
    this.playing = true
    this.loop()
    this.emit()
  }

  private async startDemoSources() {
    const ctx = this.ctx!
    const b = this.buses!

    // Music: soft pad tone
    this.musicGain = ctx.createGain()
    this.musicGain.gain.value = 0.45
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
      ng.gain.value = 0.4
      this.noiseNode.connect(ng).connect(b.soundscape.input)
    } catch {
      /* fallback silent */
    }

    // Frequency entrainment
    this.rebuildFrequency(this.state.frequency)

    // Voice: soft filtered tone (stands in for affirmations — avoid bare sine buzz)
    this.voiceGain = ctx.createGain()
    this.voiceGain.gain.value = 0.22
    this.voiceOsc = ctx.createOscillator()
    this.voiceOsc.type = 'triangle'
    this.voiceOsc.frequency.value = 185
    const voiceLp = ctx.createBiquadFilter()
    voiceLp.type = 'lowpass'
    voiceLp.frequency.value = 2400
    this.voiceOsc.connect(voiceLp).connect(this.voiceGain).connect(b.voice.input)
    this.voiceOsc.start()
  }

  private rebuildFrequency(f: FrequencyGenParams) {
    const ctx = this.ctx
    const b = this.buses
    if (!ctx || !b) return
    this.stopFreqNodes()
    if (f.mode === 'off') return

    this.freqGain = ctx.createGain()
    this.freqGain.gain.value = 0.4
    const beat =
      this.state.illusions.chirpDurationMinutes > 0
        ? this.illusions?.getLiveBeatHz() ?? f.beatHz
        : f.beatHz
    this.syncEntrainmentClock(Math.max(0.5, beat))

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
    // Chirp updates beat — keep visual phase clock continuous
    if (this.state.illusions.chirpDurationMinutes > 0 && this.illusions) {
      const hz = this.illusions.getLiveBeatHz()
      this.syncEntrainmentClock(hz)
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
    } else {
      this.syncEntrainmentClock(this.state.frequency.beatHz)
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
      this.stopVoiceBufferPlayback()
      this.stopFreqNodes()
      this.noiseNode?.disconnect()
      this.mixTap?.disconnect()
      this.master?.disconnect()
      this.limiter?.disconnect()
      this.sum?.disconnect()
      if (this.ownsContext) void this.ctx?.close()
    } catch {
      /* noop */
    }
    this.ctx = null
    this.ownsContext = true
    this.buses = null
    this.master = this.limiter = this.sum = this.mixTap = null
    this.emit()
  }

  patch(partial: DeepPartial<PsychoacousticState>) {
    this.state = mergeDeep(this.state as unknown as Rec, partial as unknown as DeepPartial<Rec>) as unknown as PsychoacousticState
    if (this.playing) this.applyAll()
    this.emit()
  }

  setBusDb(bus: BusId, db: number, tau = 0.05) {
    this.state.buses[bus] = clamp(db, -60, 0)
    if (this.buses && this.ctx) {
      setParam(this.buses[bus].gain.gain, dbToGain(this.state.buses[bus]), this.ctx, tau)
    }
    this.emit()
  }

  /**
   * Optimal Manifestation Calibration — click-free ramp of all four bus gains.
   * `standard` is the Studio default; Sleep / Ultrasonic remap ambient & voice staging.
   */
  applyManifestationCalibration(mode: ManifestationMode, tau = 0.08) {
    const buses = busesFromManifestation(mode)
    this.state.buses = { ...buses }
    if (mode === 'ultrasonic') {
      this.state.breath = {
        ...this.state.breath,
        ultrasonic: true,
        ultrasonicCarrierHz: clamp(this.state.breath.ultrasonicCarrierHz || 16000, 15500, 17000),
      }
    } else if (mode === 'deepSleep') {
      this.state.soundscapeNoise = 'brown'
      this.state.breath = { ...this.state.breath, envelopeMaskDb: -18 }
    }
    if (this.buses && this.ctx) {
      const ctx = this.ctx
      const t = ctx.currentTime
      ;(Object.keys(buses) as BusId[]).forEach((id) => {
        const g = this.buses![id].gain.gain
        g.cancelScheduledValues(t)
        g.setTargetAtTime(dbToGain(buses[id]), t, tau)
      })
      if (this.breath) this.breath.apply(this.state.breath)
      this.noiseNode?.port.postMessage({ color: this.state.soundscapeNoise })
    }
    this.emit()
  }

  /** Smooth low-pass on a bus (used by overnight sleep-curve scheduler). */
  setBusLowpassHz(bus: BusId, hz: number, tau = 0.35) {
    if (!this.buses || !this.ctx) return
    const target = nyquistClamp(hz, this.ctx.sampleRate)
    setParam(this.buses[bus].lpf.frequency, target, this.ctx, tau)
  }

  /** Live beat / carrier update without tearing down entrainment nodes. */
  updateEntrainment(beatHz: number, carrierHz?: number, tau = 0.2) {
    this.state.frequency.beatHz = clamp(beatHz, 0.5, 40)
    if (carrierHz != null) this.state.frequency.carrierHz = clamp(carrierHz, 80, 600)
    this.syncEntrainmentClock(this.state.frequency.beatHz)
    if (!this.ctx) {
      this.emit()
      return
    }
    const ctx = this.ctx
    const f = this.state.frequency
    if (this.freqOscL) setParam(this.freqOscL.frequency, nyquistClamp(f.carrierHz, ctx.sampleRate), ctx, tau)
    if (this.freqOscR && f.mode === 'binaural') {
      setParam(
        this.freqOscR.frequency,
        nyquistClamp(f.carrierHz + f.beatHz, ctx.sampleRate),
        ctx,
        tau,
      )
    }
    if (this.isoLfo && f.mode === 'isochronic') {
      setParam(this.isoLfo.frequency, Math.max(0.5, f.beatHz), ctx, tau)
    }
    this.emit()
  }

  setNoiseColor(color: NoiseColor) {
    this.state.soundscapeNoise = color
    this.noiseNode?.port.postMessage({ color })
    this.emit()
  }

  /** Soft 432 Hz confirmation chime (wake-word ack) — non-jarring. */
  playConfirmChime(freqHz = 432, durationSec = 0.55) {
    if (!this.ctx || !this.sum) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freqHz
    const g = ctx.createGain()
    g.gain.value = 0.0001
    const t0 = ctx.currentTime
    g.gain.setTargetAtTime(0.12, t0, 0.02)
    g.gain.setTargetAtTime(0.0001, t0 + durationSec * 0.55, 0.08)
    osc.connect(g).connect(this.sum)
    osc.start(t0)
    osc.stop(t0 + durationSec + 0.1)
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

  /**
   * Route an affirmation AudioBuffer into the Voice bus at calibrated
   * default gain (−32 dBFS bus trim; breath mask targets −18 dB delta).
   */
  async injectVoiceBuffer(buffer: AudioBuffer, opts?: { loop?: boolean }) {
    this.voiceBuffer = buffer
    this.voiceBufferLoop = opts?.loop !== false
    if (!this.playing || !this.ctx || !this.buses) return
    this.startVoiceBufferPlayback()
  }

  clearVoiceBuffer() {
    this.stopVoiceBufferPlayback()
    this.voiceBuffer = null
  }

  getVoiceInput(): GainNode | null {
    return this.buses?.voice.input ?? null
  }

  private startVoiceBufferPlayback() {
    if (!this.ctx || !this.buses || !this.voiceBuffer) return
    this.stopVoiceBufferPlayback()
    // Mute demo voice carrier when real affirmations are on the bus
    if (this.voiceGain) {
      setParam(this.voiceGain.gain, 0.0001, this.ctx)
    }
    const src = this.ctx.createBufferSource()
    src.buffer = this.voiceBuffer
    src.loop = this.voiceBufferLoop
    const g = this.ctx.createGain()
    // Unity into bus — bus trim holds −32 dBFS calibration
    g.gain.value = 1
    src.connect(g).connect(this.buses.voice.input)
    src.start()
    this.voiceBufferSrc = src
    this.voiceBufferGain = g
  }

  private stopVoiceBufferPlayback() {
    try {
      this.voiceBufferSrc?.stop()
      this.voiceBufferSrc?.disconnect()
      this.voiceBufferGain?.disconnect()
    } catch {
      /* noop */
    }
    this.voiceBufferSrc = null
    this.voiceBufferGain = null
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
