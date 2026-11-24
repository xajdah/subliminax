/**
 * Optimal Manifestation Calibration — psychoacoustic gain staging presets.
 * Gains are authored in dBFS and converted to linear for Web Audio GainNodes.
 */

export type ManifestationMode = 'standard' | 'deepSleep' | 'ultrasonic'

export interface ManifestationPreset {
  id: ManifestationMode
  label: string
  blurb: string
  soundtrackDb: number
  ambientDb: number
  frequencyDb: number
  voiceDb: number
}

/** dBFS → linear amplitude (Web Audio GainNode). */
export function dbFsToLinearGain(dbfs: number): number {
  return Math.pow(10, dbfs / 20)
}

export function linearGainToDbFs(gain: number): number {
  if (gain <= 1e-8) return -100
  return 20 * Math.log10(gain)
}

export const MANIFESTATION_PRESETS: Record<ManifestationMode, ManifestationPreset> = {
  standard: {
    id: 'standard',
    label: 'Standard',
    blurb: 'Sub-threshold manifestation — voice −18 dB under masking floor',
    soundtrackDb: -14.0,
    ambientDb: -16.5,
    frequencyDb: -22.0,
    voiceDb: -32.0,
  },
  deepSleep: {
    id: 'deepSleep',
    label: 'Sleep',
    blurb: 'Theta / delta sleep — boosted ambient blanket, quieter voice',
    soundtrackDb: -16.0,
    ambientDb: -14.0,
    frequencyDb: -24.0,
    voiceDb: -34.0,
  },
  ultrasonic: {
    id: 'ultrasonic',
    label: 'Ultrasonic',
    blurb: 'Silent 15.5–17 kHz carrier — higher voice/carrier for DAC headroom',
    soundtrackDb: -14.0,
    ambientDb: -17.0,
    frequencyDb: -22.0,
    voiceDb: -19.0,
  },
}

/** Sweet-spot notches on Player/Studio sliders (Standard Sub-Threshold). */
export const SWEET_SPOT_DB = {
  soundtrack: MANIFESTATION_PRESETS.standard.soundtrackDb,
  ambient: MANIFESTATION_PRESETS.standard.ambientDb,
  frequency: MANIFESTATION_PRESETS.standard.frequencyDb,
  voice: MANIFESTATION_PRESETS.standard.voiceDb,
} as const

export function busesFromManifestation(mode: ManifestationMode): {
  music: number
  soundscape: number
  frequency: number
  voice: number
} {
  const p = MANIFESTATION_PRESETS[mode]
  return {
    music: p.soundtrackDb,
    soundscape: p.ambientDb,
    frequency: p.frequencyDb,
    voice: p.voiceDb,
  }
}

export function manifestationLinearGains(mode: ManifestationMode) {
  const p = MANIFESTATION_PRESETS[mode]
  return {
    soundtrack: dbFsToLinearGain(p.soundtrackDb),
    ambient: dbFsToLinearGain(p.ambientDb),
    frequency: dbFsToLinearGain(p.frequencyDb),
    voice: dbFsToLinearGain(p.voiceDb),
  }
}
