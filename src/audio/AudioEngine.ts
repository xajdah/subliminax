import type { AffirmationTrack, TransportState, XenapseConfig } from '../types/studio'
import { createAmbientBed, type AmbientNodes } from './ambient'
import { createEntrainmentGraph, type EntrainmentNodes } from './entrainment'
import { createSpeechController, type SpeechController } from './speech'

export type EngineListener = (snapshot: EngineSnapshot) => void

export interface EngineSnapshot {
  transport: TransportState
  masterVolume: number
  analyser: AnalyserNode | null
  ready: boolean
}

/**
 * Subliminax master audio engine.
 * Owns AudioContext lifecycle, transport, Xenapse + ambient graphs, speech bus.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private entrainment: EntrainmentNodes | null = null
  private ambient: AmbientNodes | null = null
  private speech: SpeechController = createSpeechController()
  private transport: TransportState = 'stopped'
  private masterVolume = 0.5
  private xenapse: XenapseConfig | null = null
  private listeners = new Set<EngineListener>()
  private affirmations: AffirmationTrack[] = []

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
      analyser: this.analyser,
      ready: this.ctx !== null,
    }
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser
  }

  getSpeechSupported(): boolean {
    return this.speech.supported
  }

  /** Unlock / resume AudioContext on a user gesture. */
  async unlock(): Promise<void> {
    const ctx = this.ensureContext()
    if (ctx.state === 'suspended') await ctx.resume()
    this.emit()
  }

  private ensureContext(): AudioContext {
    if (this.ctx) return this.ctx
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new Ctx()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.masterVolume
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0.85
    this.master.connect(this.analyser)
    this.analyser.connect(this.ctx.destination)
    return this.ctx
  }

  setMasterVolume(v: number) {
    this.masterVolume = Math.max(0, Math.min(1, v))
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05)
    }
    this.emit()
  }

  setXenapseConfig(config: XenapseConfig) {
    this.xenapse = config
    if (this.transport === 'playing') {
      this.rebuildGraph()
    }
  }

  setAffirmations(tracks: AffirmationTrack[]) {
    this.affirmations = tracks
  }

  async play() {
    await this.unlock()
    if (this.transport === 'playing') return
    if (this.transport === 'paused' && this.ctx) {
      await this.ctx.resume()
      this.transport = 'playing'
      this.emit()
      return
    }
    this.rebuildGraph()
    this.startSpeech()
    this.transport = 'playing'
    this.emit()
  }

  async pause() {
    if (this.transport !== 'playing' || !this.ctx) return
    await this.ctx.suspend()
    this.speech.stop()
    this.transport = 'paused'
    this.emit()
  }

  stop() {
    this.teardownGraph()
    this.speech.stop()
    if (this.ctx && this.ctx.state === 'running') {
      void this.ctx.suspend()
    }
    this.transport = 'stopped'
    this.emit()
  }

  private startSpeech() {
    const active = this.affirmations.filter((t) => !t.muted && t.text.trim())
    if (active.length === 0) return
    this.speech.speakQueue(active)
  }

  private rebuildGraph() {
    const ctx = this.ensureContext()
    const master = this.master
    if (!master || !this.xenapse) return

    this.teardownGraph(false)

    const x = this.xenapse
    const carrier =
      x.useSolfeggio && x.solfeggioHz != null ? x.solfeggioHz : x.carrierHz

    this.entrainment = createEntrainmentGraph(
      ctx,
      x.mode,
      carrier,
      x.beatHz,
      x.pulseHz,
      x.toneGain,
    )
    this.entrainment?.output.connect(master)

    this.ambient = createAmbientBed(ctx, x.ambient, x.ambientGain, x.ambientFilterHz)
    this.ambient?.output.connect(master)
  }

  private teardownGraph(full = true) {
    this.entrainment?.stop()
    this.entrainment = null
    this.ambient?.stop()
    this.ambient = null
    if (full) {
      // keep context / master / analyser for reuse
    }
  }

  /** Dispose AudioContext entirely (unmount). */
  async dispose() {
    this.stop()
    this.teardownGraph()
    this.listeners.clear()
    if (this.ctx) {
      try {
        await this.ctx.close()
      } catch {
        /* ignore */
      }
    }
    this.ctx = null
    this.master = null
    this.analyser = null
  }
}

export const audioEngine = new AudioEngine()
