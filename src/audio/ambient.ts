import type { AmbientBedId } from '../types/studio'
import { createLoopingNoiseSource, type NoiseColor } from './noise'

export interface AmbientNodes {
  input: GainNode
  filter: BiquadFilterNode
  output: GainNode
  stop: () => void
}

function bedToNoise(bed: AmbientBedId): NoiseColor | null {
  if (bed === 'pink') return 'pink'
  if (bed === 'brown' || bed === 'rain') return 'brown'
  if (bed === 'pad') return 'pink'
  return null
}

/** Build an ambient bed subgraph (noise + optional filter shaping). */
export function createAmbientBed(
  ctx: AudioContext,
  bed: AmbientBedId,
  gain: number,
  filterHz: number,
): AmbientNodes | null {
  if (bed === 'none') return null

  const output = ctx.createGain()
  output.gain.value = Math.max(0, Math.min(1, gain))

  const filter = ctx.createBiquadFilter()
  filter.type = bed === 'rain' ? 'bandpass' : bed === 'pad' ? 'lowpass' : 'lowpass'
  filter.frequency.value = Math.max(80, filterHz)
  filter.Q.value = bed === 'rain' ? 0.7 : bed === 'pad' ? 0.5 : 0.8

  const input = ctx.createGain()
  input.gain.value = 1

  const color = bedToNoise(bed)
  const sources: AudioBufferSourceNode[] = []

  if (color) {
    const noise = createLoopingNoiseSource(ctx, color)
    noise.connect(input)
    noise.start()
    sources.push(noise)
  }

  // Soft sine pad layer for "pad" bed
  if (bed === 'pad') {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 110
    const oscGain = ctx.createGain()
    oscGain.gain.value = 0.15
    osc.connect(oscGain)
    oscGain.connect(input)
    osc.start()
    // Track via stop hook only — oscillator has no buffer source list
    const stopOsc = () => {
      try {
        osc.stop()
        osc.disconnect()
        oscGain.disconnect()
      } catch {
        /* already stopped */
      }
    }
    input.connect(filter)
    filter.connect(output)
    return {
      input,
      filter,
      output,
      stop: () => {
        sources.forEach((s) => {
          try {
            s.stop()
            s.disconnect()
          } catch {
            /* ignore */
          }
        })
        stopOsc()
        try {
          input.disconnect()
          filter.disconnect()
          output.disconnect()
        } catch {
          /* ignore */
        }
      },
    }
  }

  input.connect(filter)
  filter.connect(output)

  return {
    input,
    filter,
    output,
    stop: () => {
      sources.forEach((s) => {
        try {
          s.stop()
          s.disconnect()
        } catch {
          /* ignore */
        }
      })
      try {
        input.disconnect()
        filter.disconnect()
        output.disconnect()
      } catch {
        /* ignore */
      }
    },
  }
}
