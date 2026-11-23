/** Subliminax — core domain types */

import { DEFAULT_PSYCHO, type PsychoacousticState } from './psychoacoustic'

export type ThemeMode = 'dark' | 'light'
export type AppView = 'home' | 'create' | 'studio' | 'presets' | 'saved' | 'guide'
export type TransportState = 'stopped' | 'playing' | 'paused'

export type IntentCategory = 'physical' | 'mental' | 'spiritual' | 'emotional' | 'custom'

export type EntrainmentType =
  | 'off'
  | 'binaural'
  | 'monaural'
  | 'isochronic'
  | 'pure'

export type BrainwaveBand =
  | 'delta'
  | 'theta'
  | 'alpha'
  | 'beta'
  | 'gamma'
  | 'schumann'
  | 'custom'

export type MoodCategory =
  | 'calming'
  | 'energizing'
  | 'inspiring'
  | 'focusing'
  | 'sleeping'

export type VoiceMode = 'record' | 'clone' | 'narrator' | 'none'

export type SpatialMode = 'static' | 'bilateral' | 'hrtf'

export type CreateStep =
  | 'intent'
  | 'issue'
  | 'frequency'
  | 'soundtrack'
  | 'ambient'
  | 'voice'
  | 'mix'

export interface IssueDef {
  id: string
  category: Exclude<IntentCategory, 'custom'>
  label: string
  description: string
  recommendedHz: number[]
  recommendedBand: BrainwaveBand
  sampleAffirmations: string[]
}

export interface MoodTrackDef {
  id: string
  mood: MoodCategory
  name: string
  blurb: string
  /** Procedural synth profile key */
  profile: string
}

export interface AmbientDef {
  id: string
  group: 'nature' | 'texture' | 'noise'
  label: string
  profile: string
}

export interface NarratorPreset {
  id: string
  label: string
  rate: number
  pitch: number
}

export interface FrequencyConfig {
  hz: number
  harmonicShimmer: boolean
  entrainment: EntrainmentType
  band: BrainwaveBand
  beatHz: number
  progressiveRamp: boolean
  rampStartHz: number
  rampEndHz: number
  volume: number
}

export interface SoundtrackConfig {
  mood: MoodCategory
  trackId: string
  volume: number
  customFileName: string | null
}

export interface AmbientLayerState {
  id: string
  enabled: boolean
  gain: number
}

export interface VoiceConfig {
  mode: VoiceMode
  script: string
  rate: number
  pitch: number
  loopPauseMs: number
  volume: number
  narratorId: string
  cloneProfileId: string
  hasRecording: boolean
}

export interface PsychoConfig {
  autoDuck: boolean
  multiLayerStack: boolean
  highCarrierMod: boolean
  spatial: SpatialMode
  driftRate: number
}

export type AdvancedPsychoState = PsychoacousticState

export interface CustomIntent {
  name: string
  affirmations: string[]
  targetHz: number | null
}

export interface CreateSession {
  step: CreateStep
  category: IntentCategory | null
  issueId: string | null
  custom: CustomIntent
  frequency: FrequencyConfig
  soundtrack: SoundtrackConfig
  ambients: AmbientLayerState[]
  voice: VoiceConfig
  psycho: PsychoConfig
  /** Advanced DSP tools applied on Mix / preview */
  advancedPsycho: PsychoacousticState
  masterVolume: number
  lengthMinutes: number
  /** Set when user finishes the create flow */
  completed?: boolean
}

export const SOLFEGGIO_HZ = [
  174, 285, 396, 417, 432, 528, 639, 741, 852, 963,
] as const

export const BRAINWAVE_RANGES: Record<
  Exclude<BrainwaveBand, 'custom'>,
  { label: string; hz: number }
> = {
  delta: { label: 'Delta 0.5–4 Hz', hz: 2 },
  theta: { label: 'Theta 4–8 Hz', hz: 6 },
  alpha: { label: 'Alpha 8–12 Hz', hz: 10 },
  beta: { label: 'Beta 12–30 Hz', hz: 16 },
  gamma: { label: 'Gamma 30–100 Hz', hz: 40 },
  schumann: { label: 'Schumann 7.83 Hz', hz: 7.83 },
}

export const CREATE_STEPS: { id: CreateStep; label: string; n: number }[] = [
  { id: 'intent', label: 'Intent', n: 1 },
  { id: 'issue', label: 'Issue', n: 2 },
  { id: 'frequency', label: 'Frequency', n: 3 },
  { id: 'soundtrack', label: 'Soundtrack', n: 4 },
  { id: 'ambient', label: 'Ambient', n: 5 },
  { id: 'voice', label: 'Voice', n: 6 },
  { id: 'mix', label: 'Mix', n: 7 },
]

export function createDefaultSession(): CreateSession {
  return {
    step: 'intent',
    category: null,
    issueId: null,
    custom: { name: '', affirmations: [''], targetHz: null },
    frequency: {
      hz: 528,
      harmonicShimmer: false,
      entrainment: 'binaural',
      band: 'theta',
      beatHz: 6,
      progressiveRamp: false,
      rampStartHz: 10,
      rampEndHz: 4,
      volume: 0.14,
    },
    soundtrack: {
      mood: 'calming',
      trackId: 'velvet-horizon',
      volume: 0.32,
      customFileName: null,
    },
    ambients: [],
    voice: {
      mode: 'narrator',
      script: '',
      rate: 0.92,
      pitch: 1,
      loopPauseMs: 2800,
      volume: 0.45,
      narratorId: 'serene-calm',
      cloneProfileId: 'local-soft',
      hasRecording: false,
    },
    psycho: {
      autoDuck: true,
      multiLayerStack: true,
      highCarrierMod: false,
      spatial: 'bilateral',
      driftRate: 0.08,
    },
    advancedPsycho: structuredClone(DEFAULT_PSYCHO),
    masterVolume: 0.55,
    lengthMinutes: 20,
    completed: false,
  }
}
