/**
 * Acoustic watermark codec — FSK burst in the upper psychoacoustic band.
 * Encodes DSP fingerprint only (never voice / affirmations).
 */

import {
  BREATH_CODES,
  ENTRAINMENT_CODES,
  MASKING_CODES,
  SONIC_DNA_BIT_RATE,
  SONIC_DNA_FRAME_SEC,
  SONIC_DNA_FSK_MARK_HZ,
  SONIC_DNA_FSK_SPACE_HZ,
  SONIC_DNA_LEVEL_DB,
  SONIC_DNA_MAGIC,
  SPATIAL_CODES,
  type SonicDnaDecodeResult,
  type SonicDnaPayload,
} from '../types/sonicDna'
import { dbToGain } from './dsp/util'

const HEADER = SONIC_DNA_MAGIC

/** Pack payload → bits (MSB first). Layout: magic ASCII + fields + checksum. */
export function encodePayloadBits(payload: SonicDnaPayload): number[] {
  const bytes: number[] = []
  for (let i = 0; i < HEADER.length; i++) bytes.push(HEADER.charCodeAt(i) & 0xff)

  const carrier = clampInt(payload.carrierHz, 0, 20000)
  bytes.push((carrier >> 8) & 0xff, carrier & 0xff)

  const beatQ = clampInt(Math.round(payload.beatHz * 100), 0, 10000)
  bytes.push((beatQ >> 8) & 0xff, beatQ & 0xff)

  bytes.push(Math.max(0, ENTRAINMENT_CODES.indexOf(payload.entrainmentType)))
  bytes.push(Math.max(0, SPATIAL_CODES.indexOf(payload.spatialMode)))
  bytes.push(clampInt(Math.round(payload.somaticLevel * 255), 0, 255))
  bytes.push(Math.max(0, BREATH_CODES.indexOf(payload.breathPattern)))
  bytes.push(Math.max(0, MASKING_CODES.indexOf(payload.maskingMode)))

  let checksum = 0
  for (const b of bytes) checksum ^= b
  bytes.push(checksum & 0xff)

  const bits: number[] = []
  for (const b of bytes) {
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1)
  }
  // Preamble for sync: 16 alternating bits
  const preamble = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
  return [...preamble, ...bits]
}

export function decodePayloadBits(bits: number[]): SonicDnaDecodeResult {
  // Find preamble
  const pre = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
  let start = -1
  for (let i = 0; i <= bits.length - pre.length - 8 * 15; i++) {
    let ok = true
    for (let j = 0; j < pre.length; j++) {
      if (bits[i + j] !== pre[j]) {
        ok = false
        break
      }
    }
    if (ok) {
      start = i + pre.length
      break
    }
  }
  if (start < 0) {
    return { ok: false, authentic: false, payload: null, confidence: 0, error: 'No Sonic DNA preamble' }
  }

  const byteCount = 6 + 2 + 2 + 1 + 1 + 1 + 1 + 1 + 1 // 16
  const need = byteCount * 8
  if (start + need > bits.length) {
    return { ok: false, authentic: false, payload: null, confidence: 0, error: 'Incomplete frame' }
  }

  const bytes: number[] = []
  for (let b = 0; b < byteCount; b++) {
    let v = 0
    for (let i = 0; i < 8; i++) v = (v << 1) | (bits[start + b * 8 + i]! & 1)
    bytes.push(v)
  }

  let checksum = 0
  for (let i = 0; i < bytes.length - 1; i++) checksum ^= bytes[i]!
  if ((checksum & 0xff) !== bytes[bytes.length - 1]) {
    return { ok: false, authentic: false, payload: null, confidence: 0.2, error: 'Checksum mismatch' }
  }

  const magic = String.fromCharCode(...bytes.slice(0, 6))
  if (magic !== HEADER) {
    return { ok: false, authentic: false, payload: null, confidence: 0.1, error: 'Bad magic' }
  }

  const carrierHz = (bytes[6]! << 8) | bytes[7]!
  const beatQ = (bytes[8]! << 8) | bytes[9]!
  const entrainmentType = ENTRAINMENT_CODES[bytes[10]!] ?? 'binaural'
  const spatialMode = SPATIAL_CODES[bytes[11]!] ?? 'bilateral'
  const somaticLevel = bytes[12]! / 255
  const breathPattern = BREATH_CODES[bytes[13]!] ?? '4-7-8'
  const maskingMode = MASKING_CODES[bytes[14]!] ?? 'standard'

  const payload: SonicDnaPayload = {
    magic: SONIC_DNA_MAGIC,
    carrierHz,
    beatHz: beatQ / 100,
    entrainmentType,
    spatialMode,
    somaticLevel,
    breathPattern,
    maskingMode,
  }

  return { ok: true, authentic: true, payload, confidence: 0.92 }
}

function clampInt(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Math.round(n)))
}

/** Continuous FSK oscillator node graph for live watermarking. */
export class SonicDnaWatermarkNode {
  private ctx: AudioContext
  private osc: OscillatorNode
  private gain: GainNode
  private bits: number[]
  private bitIndex = 0
  private timer: number | null = null
  private running = false

  constructor(ctx: AudioContext, payload: SonicDnaPayload) {
    this.ctx = ctx
    this.bits = encodePayloadBits(payload)
    this.osc = ctx.createOscillator()
    this.osc.type = 'sine'
    this.osc.frequency.value = SONIC_DNA_FSK_SPACE_HZ
    this.gain = ctx.createGain()
    this.gain.gain.value = 0
    this.osc.connect(this.gain)
  }

  connect(dest: AudioNode) {
    this.gain.connect(dest)
  }

  start() {
    if (this.running) return
    this.running = true
    const level = dbToGain(SONIC_DNA_LEVEL_DB)
    this.gain.gain.setValueAtTime(level, this.ctx.currentTime)
    try {
      this.osc.start()
    } catch {
      /* already started */
    }
    const bitMs = 1000 / SONIC_DNA_BIT_RATE
    const tick = () => {
      if (!this.running) return
      const bit = this.bits[this.bitIndex % this.bits.length]!
      const hz = bit ? SONIC_DNA_FSK_MARK_HZ : SONIC_DNA_FSK_SPACE_HZ
      const t = this.ctx.currentTime
      this.osc.frequency.cancelScheduledValues(t)
      this.osc.frequency.setValueAtTime(hz, t)
      this.bitIndex++
      // Soft wrap every frame length
      if (this.bitIndex % this.bits.length === 0) {
        /* frame boundary — continue looping for continuous watermark */
      }
      this.timer = window.setTimeout(tick, bitMs)
    }
    tick()
  }

  updatePayload(payload: SonicDnaPayload) {
    this.bits = encodePayloadBits(payload)
    this.bitIndex = 0
  }

  stop() {
    this.running = false
    if (this.timer != null) window.clearTimeout(this.timer)
    this.timer = null
    try {
      this.gain.gain.setValueAtTime(0, this.ctx.currentTime)
      this.osc.stop()
    } catch {
      /* noop */
    }
    try {
      this.osc.disconnect()
      this.gain.disconnect()
    } catch {
      /* noop */
    }
  }
}

/**
 * Demodulate FSK from an AudioBuffer (file) or Analyser time series.
 * Uses short-time energy comparison at mark vs space bins.
 */
export function decodeSonicDnaFromBuffer(
  buffer: AudioBuffer,
  opts?: { startSec?: number; durationSec?: number },
): SonicDnaDecodeResult {
  const sr = buffer.sampleRate
  const start = Math.floor((opts?.startSec ?? 0) * sr)
  const dur = Math.floor((opts?.durationSec ?? Math.min(SONIC_DNA_FRAME_SEC + 5, buffer.duration)) * sr)
  const ch = buffer.getChannelData(0)
  const slice = ch.subarray(start, Math.min(ch.length, start + dur))
  return decodeSonicDnaFromSamples(slice, sr)
}

export function decodeSonicDnaFromSamples(
  samples: Float32Array | ArrayLike<number>,
  sampleRate: number,
): SonicDnaDecodeResult {
  const bitMs = 1000 / SONIC_DNA_BIT_RATE
  const samplesPerBit = Math.max(64, Math.floor((sampleRate * bitMs) / 1000))
  const fftSize = 2048
  const bits: number[] = []

  // Sliding windows aligned to bit period
  for (let i = 0; i + samplesPerBit <= samples.length; i += samplesPerBit) {
    const window = new Float32Array(fftSize)
    const take = Math.min(samplesPerBit, fftSize)
    for (let j = 0; j < take; j++) window[j] = samples[i + j]!
    const { mark, space } = bandEnergy(window, sampleRate, fftSize)
    bits.push(mark > space ? 1 : 0)
  }

  if (bits.length < 80) {
    return { ok: false, authentic: false, payload: null, confidence: 0, error: 'Signal too short' }
  }

  return decodePayloadBits(bits)
}

function bandEnergy(window: Float32Array, sampleRate: number, fftSize: number) {
  // Simple Goertzel for mark & space
  const mark = goertzel(window, sampleRate, SONIC_DNA_FSK_MARK_HZ, fftSize)
  const space = goertzel(window, sampleRate, SONIC_DNA_FSK_SPACE_HZ, fftSize)
  return { mark, space }
}

function goertzel(samples: Float32Array, sampleRate: number, targetHz: number, n: number) {
  const k = Math.round((n * targetHz) / sampleRate)
  const w = (2 * Math.PI * k) / n
  const coeff = 2 * Math.cos(w)
  let s0 = 0
  let s1 = 0
  let s2 = 0
  const len = Math.min(samples.length, n)
  for (let i = 0; i < len; i++) {
    s0 = samples[i]! + coeff * s1 - s2
    s2 = s1
    s1 = s0
  }
  const power = s1 * s1 + s2 * s2 - coeff * s1 * s2
  return power
}

/** Build a short offline WAV buffer containing only the watermark (for tests / self-check). */
export async function renderSonicDnaTestTone(
  payload: SonicDnaPayload,
  durationSec = SONIC_DNA_FRAME_SEC + 1,
  sampleRate = 48000,
): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(1, Math.ceil(durationSec * sampleRate), sampleRate)
  const bits = encodePayloadBits(payload)
  const bitDur = 1 / SONIC_DNA_BIT_RATE
  const level = dbToGain(SONIC_DNA_LEVEL_DB)
  let t = 0
  let bi = 0
  while (t < durationSec) {
    const bit = bits[bi % bits.length]!
    const osc = ctx.createOscillator()
    osc.frequency.value = bit ? SONIC_DNA_FSK_MARK_HZ : SONIC_DNA_FSK_SPACE_HZ
    const g = ctx.createGain()
    g.gain.value = level
    osc.connect(g).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + bitDur)
    t += bitDur
    bi++
  }
  return ctx.startRendering()
}
