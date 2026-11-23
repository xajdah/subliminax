import type {
  AffirmationConfig,
  AudioLabConfig,
  BrainwaveBand,
  CarrierConfig,
  NarrationConfig,
  SoundscapeConfig,
  StudioState,
  TransportState,
} from '../types/studio'
import { BRAINWAVE_HZ } from '../types/studio'
import { createCarrier, type CarrierNodes } from './carrier'
import { createNarration, type NarrationNodes } from './narration'
import { createSoundscape, type SoundscapeNodes } from './soundscape'
import { decodeAudioBlob } from './decode'

export type EngineListener = (snap: EngineSnapshot) => void

export interface EngineSnapshot {
  transport: TransportState
  masterVolume: number
  ready: boolean
  analyser: AnalyserNode | null
  bedAnalyser: AnalyserNode | null
  carrierAnalyser: AnalyserNode | null
  voiceAnalyser: AnalyserNode | null
}

/**
 * Subliminax Studio master engine.
 * Graph: soundscape + carrier + narration → spatial → master → analysers → destination
 */
export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private bedAnalyser: AnalyserNode | null = null
  private carrierAnalyser: AnalyserNode | null = null
  private voiceAnalyser: AnalyserNode | null = null

  private soundscape: SoundscapeNodes | null = null
  private carrier: CarrierNodes | null = null
  private narration: NarrationNodes | null = null

  private spatialIn: GainNode | null = null
  private bilateral: StereoPannerNode | null = null
  private hrtf: PannerNode | null = null
  private bassSplit: BiquadFilterNode | null = null
  private bassGain: GainNode | null = null
  private driftRaf: number | null = null
  private driftPhase = 0

  private transport: TransportState = 'stopped'
  private masterVolume = 0.55
  private listeners = new Set<EngineListener>()

  private state: Pick<
    StudioState,
    'carrier' | 'soundscape' | 'affirmations' | 'narration' | 'lab' | 'clock'
  > | null = null

  subscribe(listener: EngineListener): () => void {
    this.listeners.add(listener)
    listener(this.snapshot())
    return () => this.listeners.delete(listener)
  }

  private emit() {
    const snap = this.snapshot()
    this.listeners.forEach((l) => l(snap))
  }

  snapshot(): EngineSnapshot {
    return {
      transport: this.transport,
      masterVolume: this.masterVolume,
      ready: this.ctx != null,
      analyser: this.analyser,
      bedAnalyser: this.bedAnalyser,
      carrierAnalyser: this.carrierAnalyser,
      voiceAnalyser: this.voiceAnalyser,
    }
  }

  async unlock() {
    const ctx = this.ensure()
    if (ctx.state === 'suspended') await ctx.resume()
    this.emit()
  }

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new Ctx()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.masterVolume

    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0.85

    this.bedAnalyser = this.ctx.createAnalyser()
    this.bedAnalyser.fftSize = 1024
    this.carrierAnalyser = this.ctx.createAnalyser()
    this.carrierAnalyser.fftSize = 1024
    this.voiceAnalyser = this.ctx.createAnalyser()
    this.voiceAnalyser.fftSize = 1024

    this.spatialIn = this.ctx.createGain()
    this.bilateral = this.ctx.createStereoPanner()
    this.hrtf = this.ctx.createPanner()
    this.hrtf.panningModel = 'HRTF'
    this.hrtf.distanceModel = 'linear'
    this.hrtf.refDistance = 1
    this.hrtf.maxDistance = 12
    this.hrtf.setPosition(0, 0, -2)

    // 80 Hz crossover — bass stays centred (Iso-Pan Matrix)
    this.bassSplit = this.ctx.createBiquadFilter()
    this.bassSplit.type = 'lowpass'
    this.bassSplit.frequency.value = 80
    this.bassGain = this.ctx.createGain()
    this.bassGain.gain.value = 1

    this.spatialIn.connect(this.bilateral)
    this.bilateral.connect(this.master)
    this.spatialIn.connect(this.bassSplit)
    this.bassSplit.connect(this.bassGain)
    this.bassGain.connect(this.master)

    this.master.connect(this.analyser)
    this.analyser.connect(this.ctx.destination)

    this.soundscape = createSoundscape(this.ctx)
    this.carrier = createCarrier(this.ctx)
    this.narration = createNarration(this.ctx)

    this.soundscape.output.connect(this.bedAnalyser)
    this.bedAnalyser.connect(this.spatialIn)
    this.carrier.output.connect(this.carrierAnalyser)
    this.carrierAnalyser.connect(this.spatialIn)
    this.narration.output.connect(this.voiceAnalyser)
    this.voiceAnalyser.connect(this.spatialIn)

    return this.ctx
  }

  setMasterVolume(v: number) {
    this.masterVolume = Math.max(0, Math.min(1, v))
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05)
    }
    this.emit()
  }

  syncFromState(state: StudioState) {
    this.state = {
      carrier: state.carrier,
      soundscape: state.soundscape,
      affirmations: state.affirmations,
      narration: state.narration,
      lab: state.lab,
      clock: state.clock,
    }
    if (!this.ctx || this.transport === 'stopped') return
    this.applyLive()
  }

  private beatHz(carrier: CarrierConfig, lab: AudioLabConfig, elapsedMs: number, _lengthMs: number) {
    if (lab.choreographyEnabled && lab.choreographySteps.length > 0) {
      const minute = elapsedMs / 60000
      const sorted = [...lab.choreographySteps].sort((a, b) => a.atMinute - b.atMinute)
      let step = sorted[0]!
      for (const s of sorted) {
        if (s.atMinute <= minute) step = s
      }
      return step.hz
    }
    if (carrier.band) return BRAINWAVE_HZ[carrier.band as BrainwaveBand]
    // Default subtle alpha pulse when entrainment on without band
    return 10
  }

  private applyLive() {
    if (!this.state || !this.soundscape || !this.carrier || !this.narration) return
    const { carrier, soundscape, narration, lab, clock } = this.state
    const lengthMs = clock.lengthMinutes * 60 * 1000
    const beat = this.beatHz(carrier, lab, clock.elapsedMs, lengthMs)

    this.soundscape.apply(soundscape)
    this.carrier.apply(carrier, lab, beat)
    this.narration.applyLevels(narration, lab)

    if (lab.environmentMorphing) {
      this.soundscape.morphFromAnalyser(this.analyser)
    }

    this.applySpatial(lab)
  }

  private applySpatial(lab: AudioLabConfig) {
    if (!this.spatialIn || !this.bilateral || !this.hrtf || !this.master) return
    this.stopDrift()

    try {
      this.spatialIn.disconnect()
    } catch {
      /* ignore */
    }

    if (lab.isoPanMatrix) {
      this.spatialIn.connect(this.hrtf)
      this.hrtf.connect(this.master)
      if (this.bassSplit && this.bassGain) {
        this.spatialIn.connect(this.bassSplit)
        this.bassSplit.connect(this.bassGain)
        this.bassGain.connect(this.master)
      }
      if (this.transport === 'playing') {
        const speed = lab.isoPanSpeed
        const tick = () => {
          this.driftPhase += (speed * Math.PI * 2) / 60
          const x = Math.sin(this.driftPhase) * 2.5
          const z = -Math.cos(this.driftPhase) * 2.5
          this.hrtf?.setPosition(x, 0, z)
          this.driftRaf = requestAnimationFrame(tick)
        }
        this.driftRaf = requestAnimationFrame(tick)
      }
    } else {
      this.spatialIn.connect(this.bilateral)
      this.bilateral.connect(this.master)
      this.bilateral.pan.value = 0
      if (this.bassSplit && this.bassGain) {
        this.spatialIn.connect(this.bassSplit)
        this.bassSplit.connect(this.bassGain)
        this.bassGain.connect(this.master)
      }
    }
  }

  private stopDrift() {
    if (this.driftRaf != null) {
      cancelAnimationFrame(this.driftRaf)
      this.driftRaf = null
    }
  }

  async play() {
    await this.unlock()
    if (this.transport === 'playing') return
    if (this.transport === 'paused' && this.ctx) {
      await this.ctx.resume()
      this.transport = 'playing'
      if (this.state) {
        this.narration?.start(this.state.affirmations, this.state.narration, this.state.lab)
        this.applyLive()
      }
      this.emit()
      return
    }
    this.applyLive()
    if (this.state) {
      this.narration?.start(this.state.affirmations, this.state.narration, this.state.lab)
    }
    this.transport = 'playing'
    this.emit()
  }

  async pause() {
    if (this.transport !== 'playing' || !this.ctx) return
    this.narration?.stop()
    this.stopDrift()
    await this.ctx.suspend()
    this.transport = 'paused'
    this.emit()
  }

  stop() {
    this.narration?.stop()
    this.stopDrift()
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend()
    this.transport = 'stopped'
    this.emit()
  }

  async loadSoundscapeFile(file: File) {
    const ctx = this.ensure()
    const buf = await decodeAudioBlob(ctx, file)
    this.soundscape?.setCustomBuffer(buf)
  }

  clearSoundscapeFile() {
    this.soundscape?.setCustomBuffer(null)
  }

  updateElapsed(elapsedMs: number) {
    if (this.state) {
      this.state = { ...this.state, clock: { ...this.state.clock, elapsedMs } }
      if (this.transport === 'playing') this.applyLive()
    }
  }

  async dispose() {
    this.stop()
    this.soundscape?.stop()
    this.carrier?.stop()
    this.narration?.dispose()
    this.listeners.clear()
    if (this.ctx) {
      try {
        await this.ctx.close()
      } catch {
        /* ignore */
      }
    }
    this.ctx = null
  }
}

export const audioEngine = new AudioEngine()

// Re-export helpers used by UI
export type { CarrierConfig, SoundscapeConfig, NarrationConfig, AffirmationConfig, AudioLabConfig }
