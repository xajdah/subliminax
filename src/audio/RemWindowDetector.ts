/**
 * Closed-loop REM window detector — ultradian peaks + acoustic/respiratory
 * micro-signatures, with first-75-min lockout and 25-min refractory cooldown.
 */

import type { AcousticEventKind } from '../types/remscribe'

/** Classic ultradian REM peaks (minutes from sleep onset). */
export const ULTRADIAN_REM_PEAKS_MIN = [90, 180, 270, 360, 450] as const

export const REM_LOCKOUT_MS = 75 * 60 * 1000
export const REM_REFRACTORY_MS = 25 * 60 * 1000
export const AROUSAL_ABORT_WINDOW_MS = 5000

export interface RemAcousticSnapshot {
  rms: number
  rmsEma: number
  breathRateEst: number
  recentKinds: AcousticEventKind[]
  stillnessSec: number
  spike: boolean
}

export interface RemWindowSample {
  elapsedMs: number
  ultradianScore: number
  acousticScore: number
  confidence: number
  nearestPeakMin: number | null
  inLockout: boolean
  inRefractory: boolean
  shouldCue: boolean
}

function gauss(x: number, mu: number, sigma: number) {
  const d = (x - mu) / sigma
  return Math.exp(-0.5 * d * d)
}

export class RemWindowDetector {
  private sessionStart = 0
  private lastCueAt = 0
  private enabled = false

  configure(sessionStartMs: number, enabled: boolean) {
    this.sessionStart = sessionStartMs
    this.enabled = enabled
    this.lastCueAt = 0
  }

  markCueFired(atMs = Date.now()) {
    this.lastCueAt = atMs
  }

  /**
   * Dual-signal REM confidence.
   * 1) Ultradian architecture windows around 90-min multiples
   * 2) Acoustic: stillness (REM atonia) + irregular rapid breathing / soft vocalizations
   */
  sample(nowMs: number, acoustic: RemAcousticSnapshot): RemWindowSample {
    const elapsedMs = Math.max(0, nowMs - this.sessionStart)
    const elapsedMin = elapsedMs / 60000
    const inLockout = elapsedMs < REM_LOCKOUT_MS
    const inRefractory = this.lastCueAt > 0 && nowMs - this.lastCueAt < REM_REFRACTORY_MS

    // Higher REM density in second half of night → boost later peaks
    let ultradianScore = 0
    let nearestPeakMin: number | null = null
    let nearestDist = Infinity
    for (const peak of ULTRADIAN_REM_PEAKS_MIN) {
      const halfBoost = peak >= 270 ? 1.15 : 1
      const s = gauss(elapsedMin, peak, 18) * halfBoost
      if (s > ultradianScore) ultradianScore = s
      const dist = Math.abs(elapsedMin - peak)
      if (dist < nearestDist) {
        nearestDist = dist
        nearestPeakMin = peak
      }
    }
    ultradianScore = Math.min(1, ultradianScore)

    // Acoustic / respiratory micro-signatures
    const stillness = Math.min(1, acoustic.stillnessSec / 90)
    const lowMovement =
      acoustic.recentKinds.filter((k) =>
        k === 'snoring' || k === 'restlessMovement' || k === 'coughing' || k === 'gasping',
      ).length === 0
        ? 1
        : 0.25
    const breath = acoustic.breathRateEst
    const irregularRapid =
      breath >= 16 && breath <= 22 ? 0.85 : breath > 12 && breath < 26 ? 0.45 : 0.15
    const softVocal = acoustic.recentKinds.some(
      (k) => k === 'sleepTalking' || k === 'humanTalking',
    )
      ? 0.55
      : 0
    const quietBed = acoustic.rms < acoustic.rmsEma * 1.15 && acoustic.rms < 0.06 ? 0.7 : 0.25

    const acousticScore = Math.min(
      1,
      stillness * 0.3 +
        lowMovement * 0.25 +
        irregularRapid * 0.25 +
        quietBed * 0.1 +
        softVocal * 0.15,
    )

    const confidence = Math.min(1, ultradianScore * 0.55 + acousticScore * 0.45)
    const shouldCue =
      this.enabled &&
      !inLockout &&
      !inRefractory &&
      !acoustic.spike &&
      confidence >= 0.62 &&
      ultradianScore >= 0.35

    return {
      elapsedMs,
      ultradianScore,
      acousticScore,
      confidence,
      nearestPeakMin,
      inLockout,
      inRefractory,
      shouldCue,
    }
  }
}

export const remWindowDetector = new RemWindowDetector()
