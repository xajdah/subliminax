import { startLoopingNoise, type NoiseColor } from './noise'

export interface AmbientHandle {
  output: GainNode
  setGain: (g: number) => void
  stop: () => void
}

export function startAmbient(
  ctx: AudioContext,
  profile: string,
  gain: number,
): AmbientHandle {
  const output = ctx.createGain()
  output.gain.value = Math.max(0, Math.min(1, gain))
  const stoppables: Array<{ stop: () => void }> = []
  const nodes: AudioNode[] = []

  const noise = (color: NoiseColor, filterType: BiquadFilterType, freq: number, q = 0.7) => {
    const src = startLoopingNoise(ctx, color)
    stoppables.push(src)
    const f = ctx.createBiquadFilter()
    f.type = filterType
    f.frequency.value = freq
    f.Q.value = q
    nodes.push(f)
    src.connect(f)
    f.connect(output)
  }

  switch (profile) {
    case 'rain-soft':
      noise('pink', 'bandpass', 1400, 0.55)
      break
    case 'thunder':
      noise('brown', 'lowpass', 500)
      break
    case 'ocean-gentle':
    case 'ocean-crash':
      noise('brown', 'lowpass', profile === 'ocean-crash' ? 900 : 550)
      break
    case 'forest':
    case 'grass-wind':
    case 'desert':
      noise('pink', 'bandpass', profile === 'desert' ? 900 : 2600, 0.4)
      break
    case 'birds-brook':
    case 'stream':
      noise('white', 'bandpass', 3200, 0.8)
      break
    case 'fire':
      noise('brown', 'bandpass', 900, 1.2)
      break
    case 'underwater':
      noise('brown', 'lowpass', 400)
      break
    case 'bowls':
    case 'chimes':
    case 'temple': {
      const hz = profile === 'temple' ? 110 : profile === 'bowls' ? 440 : 880
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = hz
      const g = ctx.createGain()
      g.gain.value = 0.08
      o.connect(g)
      g.connect(output)
      o.start()
      stoppables.push(o)
      break
    }
    case 'vinyl':
      noise('pink', 'highpass', 2000, 0.5)
      break
    case 'pink':
      noise('pink', 'lowpass', 4000)
      break
    case 'brown':
      noise('brown', 'lowpass', 800)
      break
    case 'white':
      noise('white', 'lowpass', 6000)
      break
    case 'green':
      noise('pink', 'bandpass', 500, 0.9)
      break
    default:
      noise('pink', 'lowpass', 2000)
  }

  return {
    output,
    setGain: (g) => {
      output.gain.setTargetAtTime(Math.max(0, Math.min(1, g)), ctx.currentTime, 0.05)
    },
    stop: () => {
      stoppables.forEach((s) => {
        try {
          s.stop()
        } catch {
          /* ignore */
        }
      })
      nodes.forEach((n) => {
        try {
          n.disconnect()
        } catch {
          /* ignore */
        }
      })
      try {
        output.disconnect()
      } catch {
        /* ignore */
      }
    },
  }
}
