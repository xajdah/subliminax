import type { SoundscapeConfig, SoundscapeId } from '../types/studio'
import { startLoopingNoise } from './noise'

export interface SoundscapeNodes {
  output: GainNode
  apply: (cfg: SoundscapeConfig) => void
  setCustomBuffer: (buffer: AudioBuffer | null) => void
  /** Brief room sample for Environment Morphing */
  morphFromAnalyser: (analyser: AnalyserNode | null) => void
  stop: () => void
}

export function createSoundscape(ctx: AudioContext): SoundscapeNodes {
  const output = ctx.createGain()
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.Q.value = 0.7
  const pan = ctx.createStereoPanner()
  filter.connect(pan)
  pan.connect(output)

  let nodes: AudioNode[] = []
  let stoppables: Array<{ stop: () => void }> = []
  let custom: AudioBuffer | null = null
  let customSrc: AudioBufferSourceNode | null = null
  let current: SoundscapeId = 'silence'

  const clear = () => {
    stoppables.forEach((s) => {
      try {
        s.stop()
      } catch {
        /* ignore */
      }
    })
    stoppables = []
    nodes.forEach((n) => {
      try {
        n.disconnect()
      } catch {
        /* ignore */
      }
    })
    nodes = []
    if (customSrc) {
      try {
        customSrc.stop()
        customSrc.disconnect()
      } catch {
        /* ignore */
      }
      customSrc = null
    }
  }

  const track = <T extends AudioNode>(n: T): T => {
    nodes.push(n)
    return n
  }

  const startId = (id: SoundscapeId) => {
    clear()
    current = id
    if (custom) {
      customSrc = ctx.createBufferSource()
      customSrc.buffer = custom
      customSrc.loop = true
      customSrc.connect(filter)
      customSrc.start()
      return
    }
    if (id === 'silence') return

    if (id === 'rain' || id === 'open-air') {
      const n = startLoopingNoise(ctx, 'pink')
      stoppables.push(n)
      const bp = track(ctx.createBiquadFilter())
      bp.type = 'bandpass'
      bp.frequency.value = id === 'rain' ? 1200 : 2200
      bp.Q.value = 0.55
      const g = track(ctx.createGain())
      g.gain.value = id === 'rain' ? 0.7 : 0.45
      n.connect(bp)
      bp.connect(g)
      g.connect(filter)
      return
    }

    if (id === 'ocean') {
      const n = startLoopingNoise(ctx, 'brown')
      stoppables.push(n)
      const lp = track(ctx.createBiquadFilter())
      lp.type = 'lowpass'
      lp.frequency.value = 550
      const swell = track(ctx.createGain())
      swell.gain.value = 0.5
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 0.07
      const lfoG = track(ctx.createGain())
      lfoG.gain.value = 0.35
      lfo.connect(lfoG)
      lfoG.connect(swell.gain)
      lfo.start()
      stoppables.push(lfo)
      const g = track(ctx.createGain())
      g.gain.value = 0.55
      n.connect(lp)
      lp.connect(swell)
      swell.connect(g)
      g.connect(filter)
      return
    }

    if (id === 'forest' || id === 'fireplace') {
      const n = startLoopingNoise(ctx, id === 'forest' ? 'pink' : 'brown')
      stoppables.push(n)
      const bp = track(ctx.createBiquadFilter())
      bp.type = 'bandpass'
      bp.frequency.value = id === 'forest' ? 2600 : 900
      bp.Q.value = id === 'forest' ? 0.4 : 1.1
      const g = track(ctx.createGain())
      g.gain.value = 0.4
      n.connect(bp)
      bp.connect(g)
      g.connect(filter)
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = id === 'forest' ? 90 : 55
      const og = track(ctx.createGain())
      og.gain.value = 0.07
      osc.connect(og)
      og.connect(filter)
      osc.start()
      stoppables.push(osc)
      return
    }

    if (id === 'room-tone') {
      const n = startLoopingNoise(ctx, 'brown')
      stoppables.push(n)
      const lp = track(ctx.createBiquadFilter())
      lp.type = 'lowpass'
      lp.frequency.value = 350
      const g = track(ctx.createGain())
      g.gain.value = 0.25
      n.connect(lp)
      lp.connect(g)
      g.connect(filter)
      return
    }

    // drone
    ;[55, 82.5, 110].forEach((hz, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = hz
      const g = track(ctx.createGain())
      g.gain.value = 0.1 / (i + 1)
      osc.connect(g)
      g.connect(filter)
      osc.start()
      stoppables.push(osc)
    })
  }

  return {
    output,
    apply: (cfg) => {
      output.gain.setTargetAtTime(
        cfg.muted || cfg.id === 'silence' ? 0 : Math.max(0, Math.min(1, cfg.volume)),
        ctx.currentTime,
        0.05,
      )
      filter.frequency.setTargetAtTime(Math.max(200, cfg.warmthHz), ctx.currentTime, 0.08)
      pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, cfg.pan)), ctx.currentTime, 0.05)
      if (!custom && cfg.id !== current) startId(cfg.id)
    },
    setCustomBuffer: (buffer) => {
      custom = buffer
      startId(current)
    },
    morphFromAnalyser: (analyser) => {
      if (!analyser) return
      const data = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(data)
      let sum = 0
      let w = 0
      for (let i = 0; i < Math.min(64, data.length); i++) {
        sum += data[i]! * i
        w += data[i]!
      }
      const centroid = w > 0 ? sum / w : 20
      const hz = 200 + centroid * 40
      filter.frequency.setTargetAtTime(Math.min(4000, hz), ctx.currentTime, 0.2)
    },
    stop: () => {
      clear()
      try {
        filter.disconnect()
        pan.disconnect()
        output.disconnect()
      } catch {
        /* ignore */
      }
    },
  }
}
