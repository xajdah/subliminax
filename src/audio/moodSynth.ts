/** Procedural mood-track synthesizer — 25 profiles */

export interface MoodSynthHandle {
  output: GainNode
  stop: () => void
}

type ProfileFn = (ctx: AudioContext, out: GainNode) => () => void

function addOsc(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  type: OscillatorType,
  gain: number,
  stoppables: Array<{ stop: () => void }>,
) {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.value = freq
  const g = ctx.createGain()
  g.gain.value = gain
  o.connect(g)
  g.connect(dest)
  o.start()
  stoppables.push(o)
}

const profiles: Record<string, ProfileFn> = {
  'warm-pad-slow': (ctx, out) => {
    const s: Array<{ stop: () => void }> = []
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 900
    f.connect(out)
    ;[110, 165, 220].forEach((hz, i) => addOsc(ctx, f, hz, 'sine', 0.12 / (i + 1), s))
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.05
    const lg = ctx.createGain()
    lg.gain.value = 200
    lfo.connect(lg)
    lg.connect(f.frequency)
    lfo.start()
    s.push(lfo)
    return () => s.forEach((x) => x.stop())
  },
  'liquid-arp': (ctx, out) => {
    const s: Array<{ stop: () => void }> = []
    const notes = [220, 261.63, 329.63, 392]
    let i = 0
    const beat = ctx.createGain()
    beat.gain.value = 0.1
    beat.connect(out)
    const id = window.setInterval(() => {
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.value = notes[i % notes.length]!
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.12, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
      o.connect(g)
      g.connect(beat)
      o.start()
      o.stop(ctx.currentTime + 0.85)
      i++
    }, 900)
    return () => {
      window.clearInterval(id)
      s.forEach((x) => x.stop())
    }
  },
  'warm-fifths': (ctx, out) => {
    const s: Array<{ stop: () => void }> = []
    addOsc(ctx, out, 130.81, 'sine', 0.1, s)
    addOsc(ctx, out, 196.0, 'sine', 0.08, s)
    return () => s.forEach((x) => x.stop())
  },
  'pluck-pad': (ctx, out) => {
    const s: Array<{ stop: () => void }> = []
    addOsc(ctx, out, 164.81, 'sine', 0.08, s)
    addOsc(ctx, out, 246.94, 'triangle', 0.04, s)
    return () => s.forEach((x) => x.stop())
  },
  'swell-wash': (ctx, out) => {
    const s: Array<{ stop: () => void }> = []
    const g = ctx.createGain()
    g.gain.value = 0.05
    g.connect(out)
    addOsc(ctx, g, 98, 'sine', 1, s)
    addOsc(ctx, g, 147, 'sine', 0.6, s)
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.08
    const lg = ctx.createGain()
    lg.gain.value = 0.04
    lfo.connect(lg)
    lg.connect(g.gain)
    lfo.start()
    s.push(lfo)
    return () => s.forEach((x) => x.stop())
  },
  'bright-pulse': (ctx, out) => pulseProfile(ctx, out, 2.2, [261.63, 329.63, 392]),
  'drive-seq': (ctx, out) => pulseProfile(ctx, out, 3.5, [220, 277.18, 329.63, 440]),
  'filter-surge': (ctx, out) => {
    const s: Array<{ stop: () => void }> = []
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 600
    f.connect(out)
    addOsc(ctx, f, 220, 'sawtooth', 0.05, s)
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.15
    const lg = ctx.createGain()
    lg.gain.value = 1800
    lfo.connect(lg)
    lg.connect(f.frequency)
    lfo.start()
    s.push(lfo)
    return () => s.forEach((x) => x.stop())
  },
  'upbeat-pulse': (ctx, out) => pulseProfile(ctx, out, 4, [293.66, 370, 440]),
  'sparkle-arp': (ctx, out) => {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    let i = 0
    const id = window.setInterval(() => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = notes[i % notes.length]!
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.08, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
      o.connect(g)
      g.connect(out)
      o.start()
      o.stop(ctx.currentTime + 0.4)
      i++
    }, 220)
    return () => window.clearInterval(id)
  },
  'soar-fifths': (ctx, out) => {
    const s: Array<{ stop: () => void }> = []
    addOsc(ctx, out, 174.61, 'sine', 0.09, s)
    addOsc(ctx, out, 261.63, 'sine', 0.07, s)
    addOsc(ctx, out, 392.0, 'triangle', 0.04, s)
    return () => s.forEach((x) => x.stop())
  },
  'hope-prog': (ctx, out) => {
    const s: Array<{ stop: () => void }> = []
    addOsc(ctx, out, 196, 'sine', 0.08, s)
    addOsc(ctx, out, 246.94, 'sine', 0.06, s)
    addOsc(ctx, out, 311.13, 'triangle', 0.04, s)
    return () => s.forEach((x) => x.stop())
  },
  'bell-wide': (ctx, out) => {
    const s: Array<{ stop: () => void }> = []
    const L = ctx.createStereoPanner()
    const R = ctx.createStereoPanner()
    L.pan.value = -0.7
    R.pan.value = 0.7
    L.connect(out)
    R.connect(out)
    addOsc(ctx, L, 523.25, 'sine', 0.05, s)
    addOsc(ctx, R, 659.25, 'sine', 0.04, s)
    return () => s.forEach((x) => x.stop())
  },
  'bright-sweep': (ctx, out) => {
    const s: Array<{ stop: () => void }> = []
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 400
    f.connect(out)
    addOsc(ctx, f, 246.94, 'triangle', 0.06, s)
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.07
    const lg = ctx.createGain()
    lg.gain.value = 2500
    lfo.connect(lg)
    lg.connect(f.frequency)
    lfo.start()
    s.push(lfo)
    return () => s.forEach((x) => x.stop())
  },
  'guide-melody': (ctx, out) => {
    const melody = [261.63, 293.66, 329.63, 392, 349.23, 329.63]
    let i = 0
    const id = window.setInterval(() => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = melody[i % melody.length]!
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.09, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2)
      o.connect(g)
      g.connect(out)
      o.start()
      o.stop(ctx.currentTime + 1.3)
      i++
    }, 1100)
    return () => window.clearInterval(id)
  },
  'flow-grid': (ctx, out) => pulseProfile(ctx, out, 1.5, [130.81, 196]),
  'minimal-fifths': (ctx, out) => {
    const s: Array<{ stop: () => void }> = []
    addOsc(ctx, out, 146.83, 'sine', 0.07, s)
    addOsc(ctx, out, 220, 'sine', 0.05, s)
    return () => s.forEach((x) => x.stop())
  },
  'drone-tick': (ctx, out) => {
    const s: Array<{ stop: () => void }> = []
    addOsc(ctx, out, 73.42, 'sine', 0.1, s)
    const id = window.setInterval(() => {
      const o = ctx.createOscillator()
      o.frequency.value = 880
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.03, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
      o.connect(g)
      g.connect(out)
      o.start()
      o.stop(ctx.currentTime + 0.06)
    }, 1000)
    return () => {
      window.clearInterval(id)
      s.forEach((x) => x.stop())
    }
  },
  'anchor-cadence': (ctx, out) => pulseProfile(ctx, out, 1.2, [164.81, 246.94]),
  'steady-bed': (ctx, out) => {
    const s: Array<{ stop: () => void }> = []
    addOsc(ctx, out, 110, 'sine', 0.09, s)
    addOsc(ctx, out, 165, 'sine', 0.05, s)
    return () => s.forEach((x) => x.stop())
  },
  'sub-pad': (ctx, out) => {
    const s: Array<{ stop: () => void }> = []
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 280
    f.connect(out)
    addOsc(ctx, f, 55, 'sine', 0.14, s)
    addOsc(ctx, f, 82.5, 'sine', 0.06, s)
    return () => s.forEach((x) => x.stop())
  },
  'drowsy-wash': (ctx, out) => {
    const s: Array<{ stop: () => void }> = []
    addOsc(ctx, out, 98, 'sine', 0.08, s)
    addOsc(ctx, out, 123.47, 'sine', 0.05, s)
    addOsc(ctx, out, 146.83, 'triangle', 0.03, s)
    return () => s.forEach((x) => x.stop())
  },
  'rock-swell': (ctx, out) => {
    const s: Array<{ stop: () => void }> = []
    const g = ctx.createGain()
    g.gain.value = 0.06
    g.connect(out)
    addOsc(ctx, g, 65.41, 'sine', 1, s)
    addOsc(ctx, g, 98, 'sine', 0.5, s)
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.06
    const lg = ctx.createGain()
    lg.gain.value = 0.05
    lfo.connect(lg)
    lg.connect(g.gain)
    lfo.start()
    s.push(lfo)
    return () => s.forEach((x) => x.stop())
  },
  'lullaby-bell': (ctx, out) => {
    const notes = [523.25, 587.33, 659.25, 698.46]
    let i = 0
    const id = window.setInterval(() => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = notes[i % notes.length]!
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.05, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2)
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = 2000
      o.connect(f)
      f.connect(g)
      g.connect(out)
      o.start()
      o.stop(ctx.currentTime + 2.1)
      i++
    }, 2400)
    return () => window.clearInterval(id)
  },
  dreamless: (ctx, out) => {
    const s: Array<{ stop: () => void }> = []
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 200
    f.connect(out)
    addOsc(ctx, f, 48, 'sine', 0.12, s)
    return () => s.forEach((x) => x.stop())
  },
}

function pulseProfile(
  ctx: AudioContext,
  out: GainNode,
  hz: number,
  notes: number[],
): () => void {
  const s: Array<{ stop: () => void }> = []
  notes.forEach((n, i) => addOsc(ctx, out, n, i === 0 ? 'sine' : 'triangle', 0.05, s))
  const amp = ctx.createGain()
  // re-route: already connected — use LFO on a subgain
  const bus = ctx.createGain()
  bus.gain.value = 0.7
  // Leave oscillators on out; add click pulse
  const id = window.setInterval(() => {
    const o = ctx.createOscillator()
    o.frequency.value = notes[0]!
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.08, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    o.connect(g)
    g.connect(out)
    o.start()
    o.stop(ctx.currentTime + 0.15)
  }, 1000 / hz)
  void amp
  void bus
  return () => {
    window.clearInterval(id)
    s.forEach((x) => x.stop())
  }
}

export function startMoodTrack(
  ctx: AudioContext,
  profile: string,
  volume: number,
): MoodSynthHandle {
  const output = ctx.createGain()
  output.gain.value = Math.max(0, Math.min(1, volume))
  const fn = profiles[profile] ?? profiles['warm-pad-slow']!
  const stopInner = fn(ctx, output)
  return {
    output,
    stop: () => {
      stopInner()
      try {
        output.disconnect()
      } catch {
        /* ignore */
      }
    },
  }
}
