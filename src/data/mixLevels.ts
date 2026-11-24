import {
  manifestationLinearGains,
  type ManifestationMode,
} from '../audio/manifestationCalibration'
import type { CreateSession } from '../types/studio'

/**
 * Soften decoded MP3 beds when UI levels are still hot (legacy / manual).
 * Keep enough headroom so Web Audio + master limiter don’t grit the bed.
 */
export const FILE_BED_GAIN = 0.32

/** Apply Optimal Manifestation Calibration linear gains onto a Create session. */
export function applyOptimalMixLevels(
  session: CreateSession,
  mode: ManifestationMode = 'standard',
): CreateSession {
  const g = manifestationLinearGains(mode)
  return {
    ...session,
    soundtrack: {
      ...session.soundtrack,
      volume: g.soundtrack,
    },
    frequency: {
      ...session.frequency,
      volume: g.frequency,
    },
    voice: {
      ...session.voice,
      volume: g.voice,
    },
    ambientBusGain: g.ambient,
    optimalLevels: true,
    manifestationMode: mode,
  }
}

/**
 * Track bus gain for MixEngine.
 * Calibrated linear volumes are already headroom-safe; soft-cap hotter file levels.
 */
export function effectiveTrackGain(volume: number, hasAudioFile: boolean): number {
  const v = Math.max(0, Math.min(1, volume))
  if (hasAudioFile && v > 0.22) return 0.22 + (v - 0.22) * FILE_BED_GAIN
  return v
}
