/**
 * High-clarity 48 kHz mono PCM WAV capture for Master Voice Clone calibration.
 */

export interface WavCaptureHandle {
  stop: () => Promise<{ blob: Blob; durationSec: number; objectUrl: string }>
  getLevel: () => number
}

function encodeWavPcm16(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

/** Start capturing mic audio as 48 kHz mono PCM WAV with a live RMS level meter. */
export async function startWavCapture(): Promise<WavCaptureHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  })

  const ctx = new AudioContext({ sampleRate: 48000 })
  if (ctx.state === 'suspended') await ctx.resume()
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 2048
  source.connect(analyser)

  const chunks: Float32Array[] = []
  let level = 0
  let stopped = false
  const startedAt = performance.now()

  // ScriptProcessor is deprecated but widely available for offline PCM capture without a worklet file
  const bufferSize = 4096
  const processor = ctx.createScriptProcessor(bufferSize, 1, 1)
  processor.onaudioprocess = (ev) => {
    if (stopped) return
    const input = ev.inputBuffer.getChannelData(0)
    chunks.push(new Float32Array(input))
    let sum = 0
    for (let i = 0; i < input.length; i++) sum += input[i]! * input[i]!
    level = Math.sqrt(sum / input.length)
  }
  source.connect(processor)
  processor.connect(ctx.destination)

  return {
    getLevel: () => level,
    stop: async () => {
      stopped = true
      const durationSec = (performance.now() - startedAt) / 1000
      try {
        processor.disconnect()
        source.disconnect()
        analyser.disconnect()
      } catch {
        /* noop */
      }
      stream.getTracks().forEach((t) => t.stop())
      await ctx.close()

      let total = 0
      for (const c of chunks) total += c.length
      const samples = new Float32Array(total)
      let o = 0
      for (const c of chunks) {
        samples.set(c, o)
        o += c.length
      }
      const blob = encodeWavPcm16(samples, 48000)
      const objectUrl = URL.createObjectURL(blob)
      return { blob, durationSec, objectUrl }
    },
  }
}
