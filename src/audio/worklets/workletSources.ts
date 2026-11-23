/** Inline AudioWorklet processor sources (Blob URL registration) */

export const NOISE_WORKLET_NAME = 'sx-noise-processor'
export const ULTRASONIC_WORKLET_NAME = 'sx-ultrasonic-carrier'
export const GRANULAR_WORKLET_NAME = 'sx-granular-halo'

export const NOISE_WORKLET_CODE = `
class SxNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.color = 'pink'
    this.b0 = 0; this.b1 = 0; this.b2 = 0; this.b3 = 0
    this.b4 = 0; this.b5 = 0; this.b6 = 0; this.last = 0
    this.port.onmessage = (e) => {
      if (e.data && e.data.color) this.color = e.data.color
    }
  }
  process(_inputs, outputs) {
    const out = outputs[0]
    if (!out || !out[0]) return true
    const ch0 = out[0]
    const ch1 = out[1] || out[0]
    for (let i = 0; i < ch0.length; i++) {
      const white = Math.random() * 2 - 1
      let s = white
      if (this.color === 'pink') {
        this.b0 = 0.99886 * this.b0 + white * 0.0555179
        this.b1 = 0.99332 * this.b1 + white * 0.0750759
        this.b2 = 0.969 * this.b2 + white * 0.153852
        this.b3 = 0.8665 * this.b3 + white * 0.3104856
        this.b4 = 0.55 * this.b4 + white * 0.5329522
        this.b5 = -0.7616 * this.b5 - white * 0.016898
        s = (this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362) * 0.11
        this.b6 = white * 0.115926
      } else if (this.color === 'brown') {
        this.last = (this.last + 0.02 * white) / 1.02
        s = this.last * 3.5
      }
      ch0[i] = s
      if (ch1 !== ch0) ch1[i] = s
    }
    return true
  }
}
registerProcessor('${NOISE_WORKLET_NAME}', SxNoiseProcessor)
`

export const ULTRASONIC_WORKLET_CODE = `
class SxUltrasonicCarrier extends AudioWorkletProcessor {
  constructor() {
    super()
    this.phase = 0
    this.carrierHz = 16000
    this.enabled = false
    this.port.onmessage = (e) => {
      if (!e.data) return
      if (typeof e.data.carrierHz === 'number') this.carrierHz = e.data.carrierHz
      if (typeof e.data.enabled === 'boolean') this.enabled = e.data.enabled
    }
  }
  process(inputs, outputs) {
    const input = inputs[0]
    const output = outputs[0]
    if (!output || !output[0]) return true
    const inn = input && input[0] ? input[0] : null
    const outL = output[0]
    const outR = output[1] || output[0]
    const sr = sampleRate
    const twoPi = Math.PI * 2
    for (let i = 0; i < outL.length; i++) {
      const x = inn ? inn[i] : 0
      if (!this.enabled) {
        outL[i] = x
        if (outR !== outL) outR[i] = x
        continue
      }
      this.phase += twoPi * this.carrierHz / sr
      if (this.phase > twoPi) this.phase -= twoPi
      const c = Math.sin(this.phase)
      // Ring modulate (suppressed carrier) + light residual dry for continuity
      const y = x * c * 0.95 + x * 0.05
      outL[i] = y
      if (outR !== outL) outR[i] = y
    }
    return true
  }
}
registerProcessor('${ULTRASONIC_WORKLET_NAME}', SxUltrasonicCarrier)
`

export const GRANULAR_WORKLET_CODE = `
class SxGranularHalo extends AudioWorkletProcessor {
  constructor() {
    super()
    this.bufLen = Math.floor(sampleRate * 0.25)
    this.buf = new Float32Array(this.bufLen)
    this.w = 0
    this.amount = 0
    this.grainPos = 0
    this.grainAge = 0
    this.grainLen = Math.floor(sampleRate * 0.08)
    this.readPtr = 0
    this.port.onmessage = (e) => {
      if (e.data && typeof e.data.amount === 'number') this.amount = e.data.amount
    }
  }
  hann(i, n) {
    return 0.5 - 0.5 * Math.cos((Math.PI * 2 * i) / Math.max(1, n - 1))
  }
  process(inputs, outputs) {
    const input = inputs[0] && inputs[0][0]
    const out = outputs[0] && outputs[0][0]
    const outR = outputs[0] && outputs[0][1] ? outputs[0][1] : out
    if (!out) return true
    const a = this.amount
    for (let i = 0; i < out.length; i++) {
      const x = input ? input[i] : 0
      this.buf[this.w] = x
      this.w = (this.w + 1) % this.bufLen
      if (this.grainAge <= 0) {
        this.readPtr = Math.floor(Math.random() * this.bufLen)
        this.grainAge = this.grainLen
      }
      const gi = this.grainLen - this.grainAge
      const g = this.buf[this.readPtr] * this.hann(gi, this.grainLen)
      // 0.12x read speed ≈ advance pointer slowly
      if (gi % 8 === 0) this.readPtr = (this.readPtr + 1) % this.bufLen
      this.grainAge--
      const y = g * a
      out[i] = y
      if (outR !== out) outR[i] = y * 0.92
    }
    return true
  }
}
registerProcessor('${GRANULAR_WORKLET_NAME}', SxGranularHalo)
`

const loaded = new WeakMap<BaseAudioContext, Promise<void>>()

export async function ensureWorklets(ctx: BaseAudioContext): Promise<void> {
  if (!(ctx instanceof AudioContext)) return
  const existing = loaded.get(ctx)
  if (existing) return existing
  const p = (async () => {
    const blobs = [NOISE_WORKLET_CODE, ULTRASONIC_WORKLET_CODE, GRANULAR_WORKLET_CODE]
    const urls = blobs.map((c) =>
      URL.createObjectURL(new Blob([c], { type: 'application/javascript' })),
    )
    try {
      for (const u of urls) await ctx.audioWorklet.addModule(u)
    } finally {
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  })()
  loaded.set(ctx, p)
  return p
}
