import type { AudioLabConfig, CarrierConfig } from '../types/studio'

export interface CarrierNodes {
  output: GainNode
  apply: (carrier: CarrierConfig, lab: AudioLabConfig, beatHz: number) => void
  setFrequency: (hz: number) => void
  stop: () => void
}

/**
 * Carrier tone + optional Harmonic Resonance overtones,
 * Solar-Earth Sync drift, and entrainment (binaural / isochronic / monaural).
 */
export function createCarrier(ctx: AudioContext): CarrierNodes {
  const output = ctx.createGain()
  let fundamentals: OscillatorNode[] = []
  let gains: GainNode[] = []
  let lOsc: OscillatorNode | null = null
  let rOsc: OscillatorNode | null = null
  let pulseLfo: OscillatorNode | null = null
  let pulseAmp: GainNode | null = null
  let solarTimer: number | null = null
  let harmonic = false

  const clear = () => {
    fundamentals.forEach((o) => {
      try {
        o.stop()
        o.disconnect()
      } catch {
        /* ignore */
      }
    })
    fundamentals = []
    gains.forEach((g) => {
      try {
        g.disconnect()
      } catch {
        /* ignore */
      }
    })
    gains = []
    ;[lOsc, rOsc, pulseLfo].forEach((o) => {
      if (!o) return
      try {
        o.stop()
        o.disconnect()
      } catch {
        /* ignore */
      }
    })
    lOsc = rOsc = pulseLfo = null
    if (pulseAmp) {
      try {
        pulseAmp.disconnect()
      } catch {
        /* ignore */
      }
      pulseAmp = null
    }
  }

  const solarOffset = () => {
    // Rough local solar clock drift 7.6–8.3 around Schumann-ish band when enabled
    const now = new Date()
    const minutes = now.getHours() * 60 + now.getMinutes()
    const season = (now.getMonth() + 1) / 12
    const t = (Math.sin((minutes / 1440) * Math.PI * 2) + 1) / 2
    return 7.6 + (0.7 * t + 0.1 * season)
  }

  const rebuild = (hz: number, lab: AudioLabConfig, beatHz: number) => {
    clear()
    harmonic = lab.harmonicResonance

    const carrierHz = lab.solarEarthSync ? solarOffset() : hz

    if (lab.entrainment === 'binaural') {
      const merger = ctx.createChannelMerger(2)
      lOsc = ctx.createOscillator()
      rOsc = ctx.createOscillator()
      lOsc.type = 'sine'
      rOsc.type = 'sine'
      lOsc.frequency.value = Math.max(20, carrierHz)
      rOsc.frequency.value = Math.max(20, carrierHz) + beatHz
      lOsc.connect(merger, 0, 0)
      rOsc.connect(merger, 0, 1)
      const g = ctx.createGain()
      g.gain.value = 1
      merger.connect(g)
      g.connect(output)
      gains.push(g)
      lOsc.start()
      rOsc.start()
    } else if (lab.entrainment === 'monaural') {
      lOsc = ctx.createOscillator()
      rOsc = ctx.createOscillator()
      lOsc.type = 'sine'
      rOsc.type = 'sine'
      lOsc.frequency.value = Math.max(20, carrierHz)
      rOsc.frequency.value = Math.max(20, carrierHz) + beatHz
      const mix = ctx.createGain()
      mix.gain.value = 0.5
      lOsc.connect(mix)
      rOsc.connect(mix)
      mix.connect(output)
      gains.push(mix)
      lOsc.start()
      rOsc.start()
    } else if (lab.entrainment === 'isochronic') {
      lOsc = ctx.createOscillator()
      lOsc.type = 'sine'
      lOsc.frequency.value = Math.max(20, carrierHz)
      pulseAmp = ctx.createGain()
      pulseAmp.gain.value = 0
      pulseLfo = ctx.createOscillator()
      pulseLfo.type = 'square'
      pulseLfo.frequency.value = Math.max(0.1, beatHz)
      const lfoG = ctx.createGain()
      lfoG.gain.value = 0.5
      const bias = ctx.createConstantSource()
      bias.offset.value = 0.5
      bias.start()
      pulseLfo.connect(lfoG)
      lfoG.connect(pulseAmp.gain)
      bias.connect(pulseAmp.gain)
      lOsc.connect(pulseAmp)
      pulseAmp.connect(output)
      gains.push(lfoG)
      lOsc.start()
      pulseLfo.start()
    } else {
      // Pure / harmonic stack
      const count = harmonic ? 5 : 1
      for (let i = 1; i <= count; i++) {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = Math.max(1, carrierHz) * i
        const g = ctx.createGain()
        g.gain.value = i === 1 ? 1 : 0.22 / i
        osc.connect(g)
        g.connect(output)
        osc.start()
        fundamentals.push(osc)
        gains.push(g)
      }
    }

    if (solarTimer != null) {
      window.clearInterval(solarTimer)
      solarTimer = null
    }
    if (lab.solarEarthSync) {
      solarTimer = window.setInterval(() => {
        const h = solarOffset()
        fundamentals.forEach((o, i) => {
          o.frequency.setTargetAtTime(h * (i + 1), ctx.currentTime, 0.5)
        })
        if (lOsc) lOsc.frequency.setTargetAtTime(Math.max(20, h), ctx.currentTime, 0.5)
        if (rOsc && lab.entrainment === 'binaural') {
          rOsc.frequency.setTargetAtTime(Math.max(20, h) + beatHz, ctx.currentTime, 0.5)
        }
      }, 15000)
    }
  }

  let lastKey = ''

  return {
    output,
    apply: (carrier, lab, beatHz) => {
      const key = [
        carrier.hz,
        lab.harmonicResonance,
        lab.solarEarthSync,
        lab.entrainment,
        beatHz.toFixed(2),
      ].join('|')
      if (key !== lastKey) {
        lastKey = key
        rebuild(carrier.hz, lab, beatHz)
      }
      output.gain.setTargetAtTime(
        carrier.muted ? 0 : Math.max(0, Math.min(1, carrier.volume)),
        ctx.currentTime,
        0.05,
      )
    },
    setFrequency: (hz) => {
      fundamentals.forEach((o, i) => {
        o.frequency.setTargetAtTime(hz * (i + 1), ctx.currentTime, 0.08)
      })
      if (lOsc) lOsc.frequency.setTargetAtTime(Math.max(20, hz), ctx.currentTime, 0.08)
    },
    stop: () => {
      if (solarTimer != null) window.clearInterval(solarTimer)
      clear()
      try {
        output.disconnect()
      } catch {
        /* ignore */
      }
    },
  }
}
