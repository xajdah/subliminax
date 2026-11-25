/** Aura Calibration — kinematic telemetry + prescription */

import type { BreathPattern } from './psychoacoustic'
import type { EntrainmentType, SpatialMode } from './studio'

export type AuraEnergeticState =
  | 'agitated-beta'
  | 'low-energy'
  | 'creative-theta'
  | 'balanced-alpha'
  | 'focused-smr'

export interface AuraStrokePoint {
  x: number
  y: number
  t: number
  pressure: number
}

export interface AuraKinematics {
  avgVelocity: number
  peakVelocity: number
  angularity: number
  curvatureSmoothness: number
  density: number
  hesitationMs: number
  pauseCount: number
  colorEnergy: number
  durationSec: number
  strokeCount: number
}

export interface AuraPrescription {
  state: AuraEnergeticState
  stateLabel: string
  blurb: string
  carrierHz: number
  beatHz: number
  entrainment: EntrainmentType
  spatial: SpatialMode
  breathPattern: BreathPattern | null
  breathSync: number
  somaticLevel: number
  script: string
  words: [string, string, string]
}

export interface AuraPresetRecord {
  id: string
  label: string
  createdAt: number
  prescription: AuraPrescription
  kinematics: AuraKinematics
}
