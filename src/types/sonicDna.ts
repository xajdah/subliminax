/** Sonic DNA watermark payload — DSP fingerprint only (never voice/affirmations). */

import type { BreathPattern } from './psychoacoustic'
import type { EntrainmentType, SpatialMode } from './studio'

export const SONIC_DNA_MAGIC = 'SMX_V1'
export const SONIC_DNA_FSK_SPACE_HZ = 18200
export const SONIC_DNA_FSK_MARK_HZ = 19400
export const SONIC_DNA_LEVEL_DB = -36
export const SONIC_DNA_BIT_RATE = 24 // bits/sec → ~10s frame fits ~240 bits
export const SONIC_DNA_FRAME_SEC = 10

export type SonicMaskingMode = 'standard' | 'deep' | 'light'

export interface SonicDnaPayload {
  magic: typeof SONIC_DNA_MAGIC
  carrierHz: number
  beatHz: number
  entrainmentType: EntrainmentType
  spatialMode: SpatialMode
  /** Aggregate somatic intensity 0–1 */
  somaticLevel: number
  breathPattern: BreathPattern
  maskingMode: SonicMaskingMode
}

export interface SonicDnaDecodeResult {
  ok: boolean
  authentic: boolean
  payload: SonicDnaPayload | null
  confidence: number
  error?: string
}

export const ENTRAINMENT_CODES: EntrainmentType[] = [
  'off',
  'binaural',
  'monaural',
  'isochronic',
  'pure',
]

export const SPATIAL_CODES: SpatialMode[] = ['static', 'bilateral', 'hrtf']

export const BREATH_CODES: BreathPattern[] = ['4-7-8', '5-5']

export const MASKING_CODES: SonicMaskingMode[] = ['standard', 'deep', 'light']

export function payloadFromPsycho(opts: {
  carrierHz: number
  beatHz: number
  entrainmentType: EntrainmentType
  spatialMode: SpatialMode
  somaticLevel: number
  breathPattern: BreathPattern
  envelopeMaskDb: number
}): SonicDnaPayload {
  let maskingMode: SonicMaskingMode = 'standard'
  if (opts.envelopeMaskDb <= -22) maskingMode = 'deep'
  else if (opts.envelopeMaskDb >= -14) maskingMode = 'light'
  return {
    magic: SONIC_DNA_MAGIC,
    carrierHz: Math.round(opts.carrierHz),
    beatHz: Math.round(opts.beatHz * 100) / 100,
    entrainmentType: opts.entrainmentType,
    spatialMode: opts.spatialMode,
    somaticLevel: Math.max(0, Math.min(1, opts.somaticLevel)),
    breathPattern: opts.breathPattern,
    maskingMode,
  }
}
