import type { CreateSession } from '../types/studio'

/** Soften decoded MP3 beds so they don't clip against carrier/ambients */
export const FILE_BED_GAIN = 0.38

/** Balanced starting point for music + ambient + carrier + voice */
export const OPTIMAL_MIX_LEVELS = {
  masterVolume: 0.8,
  soundtrackVolume: 0.48,
  frequencyVolume: 0.2,
  voiceVolume: 0.62,
  ambientBusGain: 0.36,
} as const

export function applyOptimalMixLevels(session: CreateSession): CreateSession {
  return {
    ...session,
    masterVolume: OPTIMAL_MIX_LEVELS.masterVolume,
    soundtrack: {
      ...session.soundtrack,
      volume: OPTIMAL_MIX_LEVELS.soundtrackVolume,
    },
    frequency: {
      ...session.frequency,
      volume: OPTIMAL_MIX_LEVELS.frequencyVolume,
    },
    voice: {
      ...session.voice,
      volume: OPTIMAL_MIX_LEVELS.voiceVolume,
    },
    ambientBusGain: OPTIMAL_MIX_LEVELS.ambientBusGain,
    optimalLevels: true,
  }
}

export function effectiveTrackGain(volume: number, hasAudioFile: boolean): number {
  const v = Math.max(0, Math.min(1, volume))
  return hasAudioFile ? v * FILE_BED_GAIN : v
}
