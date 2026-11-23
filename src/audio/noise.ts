/** Buffer-based colored noise generators */

export type NoiseColor = 'white' | 'pink' | 'brown'

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function createNoiseBuffer(
  ctx: AudioContext,
  color: NoiseColor,
  durationSec = 2,
): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * durationSec))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  const rand = mulberry32(color === 'pink' ? 0x50494e4b : color === 'brown' ? 0x42524f57 : 0x57484954)

  if (color === 'white') {
    for (let i = 0; i < length; i++) data[i] = rand() * 2 - 1
    return buffer
  }

  if (color === 'pink') {
    // Paul Kellet refined pink noise
    let b0 = 0
    let b1 = 0
    let b2 = 0
    let b3 = 0
    let b4 = 0
    let b5 = 0
    let b6 = 0
    for (let i = 0; i < length; i++) {
      const white = rand() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }
    return buffer
  }

  // Brown (Brownian) noise
  let last = 0
  for (let i = 0; i < length; i++) {
    const white = rand() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5
  }
  return buffer
}

export function createLoopingNoiseSource(
  ctx: AudioContext,
  color: NoiseColor,
): AudioBufferSourceNode {
  const source = ctx.createBufferSource()
  source.buffer = createNoiseBuffer(ctx, color)
  source.loop = true
  return source
}
