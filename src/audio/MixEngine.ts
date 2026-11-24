import { AMBIENTS } from '../data/ambients'
import { getTrack } from '../data/moodTracks'
import { NARRATOR_PRESETS } from '../data/narrators'
import { voiceCloneService } from '../services/voiceCloneService'
import { TTS_MAX_MS, trimScriptToTtsLimit } from '../services/voiceLimits'
import type {
  AmbientLayerState,
  CreateSession,
  FrequencyConfig,
  TransportState,
  VoiceConfig,
} from '../types/studio'
import { BRAINWAVE_RANGES } from '../types/studio'
import { startAmbient, type AmbientHandle } from './ambientGen'
import { startMoodTrack, type MoodSynthHandle } from './moodSynth'

export interface MixSnapshot {
  transport: TransportState
  masterVolume: number
  analyser: AnalyserNode | null
}

type Listener = (s: MixSnapshot) => void

/** Subliminax session mix: carrier + mood track + ambients + voice + spatial. */
export class MixEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private duckBus: GainNode | null = null
  private spatialPan: StereoPannerNode | null = null
  private hrtf: PannerNode | null = null
  private transport: TransportState = 'stopped'
  private masterVolume = 0.92
  private listeners = new Set<Listener>()
  private mood: MoodSynthHandle | null = null
  private ambients = new Map<string, AmbientHandle>()
  private carrierOscs: OscillatorNode[] = []
  private carrierGain: GainNode | null = null
  private speechTimer: number | null = null
  private speaking = false
  private driftRaf: number | null = null
  private session: CreateSession | null = null

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.snap())
    return () => {
      this.listeners.delete(fn)
    }
  }

  private emit() {
    const s = this.snap()
    this.listeners.forEach((l) => l(s))
  }

  snap(): MixSnapshot {
    return {
      transport: this.transport,
      masterVolume: this.masterVolume,
      analyser: this.analyser,
    }
  }

  private ensure() {
    if (this.ctx) return this.ctx
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new Ctx()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.masterVolume
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 2048
    this.duckBus = this.ctx.createGain()
    this.spatialPan = this.ctx.createStereoPanner()
    this.hrtf = this.ctx.createPanner()
    this.hrtf.panningModel = 'HRTF'
    this.hrtf.setPosition(0, 0, -2)
    this.duckBus.connect(this.spatialPan)
    this.spatialPan.connect(this.master)
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

  /** Feed the finished mix into an external DSP tap (PsychoacousticEngine) */
  connectAdvancedTap(node: AudioNode | null) {
    if (!this.master) return
    try {
      this.master.disconnect()
    } catch {
      /* ignore */
    }
    if (this.analyser) {
      this.master.connect(this.analyser)
      try {
        this.analyser.disconnect()
      } catch {
        /* ignore */
      }
      if (node) {
        this.analyser.connect(node)
      } else if (this.ctx) {
        this.analyser.connect(this.ctx.destination)
      }
    } else if (node) {
      this.master.connect(node)
    } else if (this.ctx) {
      this.master.connect(this.ctx.destination)
    }
  }

  getContext(): AudioContext | null {
    return this.ctx
  }

  /** Ensure an AudioContext exists without starting transport (for Voice bus routing). */
  ensureContext(): AudioContext {
    return this.ensure()
  }

  sync(session: CreateSession) {
    this.session = session
    if (this.transport === 'playing') this.rebuildLive()
  }

  async play(session: CreateSession) {
    this.session = session
    const ctx = this.ensure()
    this.setMasterVolume(session.masterVolume)
    if (ctx.state === 'suspended') await ctx.resume()
    if (this.transport === 'playing') return
    if (this.transport === 'paused') {
      await ctx.resume()
      this.transport = 'playing'
      this.startVoice(session.voice)
      this.emit()
      return
    }
    this.teardownGraph(false)
    this.buildGraph(session)
    this.startVoice(session.voice)
    this.transport = 'playing'
    this.emit()
  }

  async pause() {
    if (this.transport !== 'playing' || !this.ctx) return
    this.stopVoice()
    this.stopDrift()
    await this.ctx.suspend()
    this.transport = 'paused'
    this.emit()
  }

  stop() {
    this.stopVoice()
    this.teardownGraph(true)
    this.stopDrift()
    if (this.ctx?.state === 'running') void this.ctx.suspend()
    this.transport = 'stopped'
    this.emit()
  }

  private rebuildLive() {
    if (!this.session) return
    // lightweight: update volumes / restart mood if track changed
    this.teardownGraph(false)
    this.buildGraph(this.session)
  }

  private buildGraph(session: CreateSession) {
    const ctx = this.ensure()
    if (!this.duckBus || !this.spatialPan || !this.hrtf || !this.master) return

    // Mood track
    const track = getTrack(session.soundtrack.trackId)
    if (track) {
      this.mood = startMoodTrack(ctx, track.profile, session.soundtrack.volume)
      this.mood.output.connect(this.duckBus)
    }

    // Ambients
    session.ambients
      .filter((a) => a.enabled)
      .forEach((a) => {
        const def = AMBIENTS.find((d) => d.id === a.id)
        if (!def) return
        const h = startAmbient(ctx, def.profile, a.gain)
        h.output.connect(this.duckBus!)
        this.ambients.set(a.id, h)
      })

    // Carrier / entrainment
    this.startCarrier(session.frequency)

    // Duck when voice on
    if (session.psycho.autoDuck && session.voice.mode !== 'none') {
      this.duckBus.gain.setTargetAtTime(0.55, ctx.currentTime, 0.1)
    } else {
      this.duckBus.gain.setTargetAtTime(1, ctx.currentTime, 0.1)
    }

    // Spatial
    try {
      this.duckBus.disconnect()
    } catch {
      /* ignore */
    }
    this.stopDrift()
    if (session.psycho.spatial === 'hrtf') {
      this.duckBus.connect(this.hrtf)
      this.hrtf.connect(this.master)
      let phase = 0
      const tick = () => {
        phase += (session.psycho.driftRate * Math.PI * 2) / 60
        this.hrtf?.setPosition(Math.sin(phase) * 2.5, 0, -Math.cos(phase) * 2.5)
        this.driftRaf = requestAnimationFrame(tick)
      }
      this.driftRaf = requestAnimationFrame(tick)
    } else {
      this.duckBus.connect(this.spatialPan)
      this.spatialPan.connect(this.master)
      if (session.psycho.spatial === 'static') this.spatialPan.pan.value = 0
      else {
        let phase = 0
        const tick = () => {
          phase += (session.psycho.driftRate * Math.PI * 2) / 60
          if (this.spatialPan) this.spatialPan.pan.value = Math.sin(phase)
          this.driftRaf = requestAnimationFrame(tick)
        }
        this.driftRaf = requestAnimationFrame(tick)
      }
    }
  }

  private startCarrier(freq: FrequencyConfig) {
    const ctx = this.ensure()
    if (!this.duckBus) return
    this.clearCarrier()
    this.carrierGain = ctx.createGain()
    this.carrierGain.gain.value = freq.volume
    this.carrierGain.connect(this.duckBus)

    let beat = freq.beatHz
    if (freq.band !== 'custom') beat = BRAINWAVE_RANGES[freq.band].hz

    const hz = Math.max(1, freq.hz)
    if (freq.entrainment === 'off') return

    if (freq.entrainment === 'pure' || freq.entrainment === 'isochronic') {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = hz
      if (freq.entrainment === 'isochronic') {
        const amp = ctx.createGain()
        amp.gain.value = 0
        const lfo = ctx.createOscillator()
        lfo.type = 'square'
        lfo.frequency.value = Math.max(0.1, beat)
        const lg = ctx.createGain()
        lg.gain.value = 0.5
        const bias = ctx.createConstantSource()
        bias.offset.value = 0.5
        bias.start()
        lfo.connect(lg)
        lg.connect(amp.gain)
        bias.connect(amp.gain)
        o.connect(amp)
        amp.connect(this.carrierGain)
        o.start()
        lfo.start()
        this.carrierOscs.push(o, lfo)
      } else {
        o.connect(this.carrierGain)
        o.start()
        this.carrierOscs.push(o)
        if (freq.harmonicShimmer) {
          for (let i = 2; i <= 4; i++) {
            const h = ctx.createOscillator()
            h.type = 'sine'
            h.frequency.value = hz * i
            const g = ctx.createGain()
            g.gain.value = 0.18 / i
            h.connect(g)
            g.connect(this.carrierGain)
            h.start()
            this.carrierOscs.push(h)
          }
        }
      }
      return
    }

    // binaural / monaural
    const L = ctx.createOscillator()
    const R = ctx.createOscillator()
    L.type = 'sine'
    R.type = 'sine'
    L.frequency.value = hz
    R.frequency.value = hz + beat
    if (freq.entrainment === 'binaural') {
      const merger = ctx.createChannelMerger(2)
      L.connect(merger, 0, 0)
      R.connect(merger, 0, 1)
      merger.connect(this.carrierGain)
    } else {
      const mix = ctx.createGain()
      mix.gain.value = 0.5
      L.connect(mix)
      R.connect(mix)
      mix.connect(this.carrierGain)
    }
    L.start()
    R.start()
    this.carrierOscs.push(L, R)
  }

  private clearCarrier() {
    this.carrierOscs.forEach((o) => {
      try {
        o.stop()
        o.disconnect()
      } catch {
        /* ignore */
      }
    })
    this.carrierOscs = []
    if (this.carrierGain) {
      try {
        this.carrierGain.disconnect()
      } catch {
        /* ignore */
      }
      this.carrierGain = null
    }
  }

  private startVoice(voice: VoiceConfig) {
    this.stopVoice()
    if (voice.mode === 'none' || voice.mode === 'record') return
    if (!voice.script.trim()) return
    // Narrator hard cap — refuse over-limit scripts at mix time
    if (voice.mode === 'narrator') {
      const words = voice.script.trim().split(/\s+/).filter(Boolean).length
      if (words > 100) return
    }
    this.speaking = true
    const narrator = NARRATOR_PRESETS.find((n) => n.id === voice.narratorId)
    const rate = voice.mode === 'narrator' && narrator ? narrator.rate : voice.rate
    const pitch = voice.mode === 'narrator' && narrator ? narrator.pitch : voice.pitch
    const profileId = voice.mode === 'clone' ? voice.cloneProfileId : 'local-soft'
    const vol = Math.min(
      1,
      this.session?.psycho.multiLayerStack ? voice.volume * 0.95 : voice.volume * 0.85,
    )
    // Narrator + Clone: spoken audio hard-capped at 2 minutes
    const spokenText = trimScriptToTtsLimit(voice.script, rate)

    const cycle = () => {
      if (!this.speaking) return
      const speak =
        voice.mode === 'narrator'
          ? voiceCloneService.speakNarrator.bind(voiceCloneService)
          : voiceCloneService.speak.bind(voiceCloneService)
      speak({
        text: spokenText,
        rate,
        pitch,
        volume: vol,
        profileId,
        maxMs: TTS_MAX_MS,
        onEnd: () => {
          if (!this.speaking) return
          if (this.session?.psycho.multiLayerStack) {
            speak({
              text: spokenText,
              rate: rate * 1.1,
              pitch: pitch * 0.92,
              volume: vol * 0.3,
              profileId,
              maxMs: TTS_MAX_MS,
            })
          }
          this.speechTimer = window.setTimeout(cycle, Math.max(400, voice.loopPauseMs))
        },
      })
    }
    cycle()
  }

  /** Start or stop speech so it matches the current session. Live voyages call this when the movement changes. */
  restartVoice() {
    if (!this.session || this.transport !== 'playing') return
    this.startVoice(this.session.voice)
  }

  private stopVoice() {
    this.speaking = false
    if (this.speechTimer != null) window.clearTimeout(this.speechTimer)
    this.speechTimer = null
    voiceCloneService.cancel()
  }

  private stopDrift() {
    if (this.driftRaf != null) cancelAnimationFrame(this.driftRaf)
    this.driftRaf = null
  }

  private teardownGraph(full: boolean) {
    this.mood?.stop()
    this.mood = null
    this.ambients.forEach((h) => h.stop())
    this.ambients.clear()
    this.clearCarrier()
    void full
  }

  updateAmbients(layers: AmbientLayerState[]) {
    if (!this.session || this.transport !== 'playing') return
    layers.forEach((l) => {
      const h = this.ambients.get(l.id)
      if (h && l.enabled) h.setGain(l.gain)
    })
  }
}

export const mixEngine = new MixEngine()
