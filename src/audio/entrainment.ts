import type { EntrainmentMode } from '../types/studio'

export interface EntrainmentNodes {
  output: GainNode
  setCarrier: (hz: number) => void
  setBeat: (hz: number) => void
  setPulse: (hz: number) => void
  setGain: (g: number) => void
  stop: () => void
}

/**
 * Xenapse entrainment graph:
 * - tone: single carrier
 * - binaural: L/R carriers offset by beatHz
 * - isochronic: carrier amplitude-modulated by pulseHz
 */
export function createEntrainmentGraph(
  ctx: AudioContext,
  mode: EntrainmentMode,
  carrierHz: number,
  beatHz: number,
  pulseHz: number,
  gain: number,
): EntrainmentNodes | null {
  if (mode === 'off') return null

  const output = ctx.createGain()
  output.gain.value = Math.max(0, Math.min(1, gain))

  const disposers: Array<() => void> = []

  const stopAll = () => {
    disposers.forEach((d) => d())
    try {
      output.disconnect()
    } catch {
      /* ignore */
    }
  }

  if (mode === 'tone') {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = carrierHz
    osc.connect(output)
    osc.start()
    disposers.push(() => {
      try {
        osc.stop()
        osc.disconnect()
      } catch {
        /* ignore */
      }
    })
    return {
      output,
      setCarrier: (hz) => {
        osc.frequency.setTargetAtTime(hz, ctx.currentTime, 0.05)
      },
      setBeat: () => undefined,
      setPulse: () => undefined,
      setGain: (g) => {
        output.gain.setTargetAtTime(Math.max(0, Math.min(1, g)), ctx.currentTime, 0.05)
      },
      stop: stopAll,
    }
  }

  if (mode === 'binaural') {
    const merger = ctx.createChannelMerger(2)
    const left = ctx.createOscillator()
    const right = ctx.createOscillator()
    left.type = 'sine'
    right.type = 'sine'
    left.frequency.value = carrierHz
    right.frequency.value = carrierHz + beatHz

    const leftGain = ctx.createGain()
    const rightGain = ctx.createGain()
    leftGain.gain.value = 1
    rightGain.gain.value = 1

    left.connect(leftGain)
    right.connect(rightGain)
    leftGain.connect(merger, 0, 0)
    rightGain.connect(merger, 0, 1)
    merger.connect(output)

    left.start()
    right.start()

    disposers.push(() => {
      try {
        left.stop()
        right.stop()
        left.disconnect()
        right.disconnect()
        leftGain.disconnect()
        rightGain.disconnect()
        merger.disconnect()
      } catch {
        /* ignore */
      }
    })

    return {
      output,
      setCarrier: (hz) => {
        left.frequency.setTargetAtTime(hz, ctx.currentTime, 0.05)
        right.frequency.setTargetAtTime(hz + beatHz, ctx.currentTime, 0.05)
      },
      setBeat: (hz) => {
        right.frequency.setTargetAtTime(left.frequency.value + hz, ctx.currentTime, 0.05)
      },
      setPulse: () => undefined,
      setGain: (g) => {
        output.gain.setTargetAtTime(Math.max(0, Math.min(1, g)), ctx.currentTime, 0.05)
      },
      stop: stopAll,
    }
  }

  // isochronic
  const carrier = ctx.createOscillator()
  carrier.type = 'sine'
  carrier.frequency.value = carrierHz

  const amp = ctx.createGain()
  amp.gain.value = 0

  const lfo = ctx.createOscillator()
  lfo.type = 'square'
  lfo.frequency.value = Math.max(0.1, pulseHz)

  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.5

  // Bias so square LFO swings 0..1-ish
  const bias = ctx.createConstantSource()
  bias.offset.value = 0.5
  bias.start()

  lfo.connect(lfoGain)
  lfoGain.connect(amp.gain)
  bias.connect(amp.gain)
  carrier.connect(amp)
  amp.connect(output)

  carrier.start()
  lfo.start()

  disposers.push(() => {
    try {
      carrier.stop()
      lfo.stop()
      bias.stop()
      carrier.disconnect()
      lfo.disconnect()
      lfoGain.disconnect()
      bias.disconnect()
      amp.disconnect()
    } catch {
      /* ignore */
    }
  })

  return {
    output,
    setCarrier: (hz) => {
      carrier.frequency.setTargetAtTime(hz, ctx.currentTime, 0.05)
    },
    setBeat: () => undefined,
    setPulse: (hz) => {
      lfo.frequency.setTargetAtTime(Math.max(0.1, hz), ctx.currentTime, 0.05)
    },
    setGain: (g) => {
      output.gain.setTargetAtTime(Math.max(0, Math.min(1, g)), ctx.currentTime, 0.05)
    },
    stop: stopAll,
  }
}
