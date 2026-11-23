/** Subliminax Studio — types aligned to customer-guide studio + audio lab options */

export type ThemeMode = 'dark' | 'light'
export type TransportState = 'stopped' | 'playing' | 'paused'
export type AppSurface = 'simple' | 'studio'

export type IntentId = 'sleep' | 'anxiety' | 'confidence' | 'abundance'

export type SoundscapeId =
  | 'silence'
  | 'rain'
  | 'open-air'
  | 'room-tone'
  | 'drone'
  | 'ocean'
  | 'forest'
  | 'fireplace'

export type NarrationKind = 'device' | 'narrator' | 'voice-print' | 'none'

export type VisualMode = 'off' | 'cymatics' | 'aura' | 'xray'

/** Carrier catalog from the guide (Solfeggio + extras). */
export const CARRIER_PRESETS = [
  { hz: 174, label: '174 Hz', note: 'Foundation / grounding' },
  { hz: 285, label: '285 Hz', note: 'Field repair (traditional)' },
  { hz: 396, label: '396 Hz', note: 'Liberation from fear' },
  { hz: 417, label: '417 Hz', note: 'Facilitating change' },
  { hz: 432, label: '432 Hz', note: 'Alternate tuning reference' },
  { hz: 528, label: '528 Hz', note: 'Transformation' },
  { hz: 639, label: '639 Hz', note: 'Connection' },
  { hz: 741, label: '741 Hz', note: 'Expression' },
  { hz: 852, label: '852 Hz', note: 'Intuition' },
  { hz: 888, label: '888 Hz', note: 'Reference tone' },
  { hz: 963, label: '963 Hz', note: 'Unity' },
  { hz: 7.83, label: '7.83 Hz', note: 'Schumann reference' },
] as const

export type BrainwaveBand = 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma'

export const BRAINWAVE_HZ: Record<BrainwaveBand, number> = {
  delta: 2,
  theta: 6,
  alpha: 10,
  beta: 16,
  gamma: 40,
}

export interface CarrierConfig {
  hz: number
  band: BrainwaveBand | null
  volume: number
  muted: boolean
}

export interface SoundscapeConfig {
  id: SoundscapeId
  volume: number
  muted: boolean
  warmthHz: number
  pan: number
  customFileName: string | null
}

export interface AffirmationConfig {
  lines: string[]
  activeIndex: number
}

export interface NarrationConfig {
  kind: NarrationKind
  rate: number
  pitch: number
  volume: number
  loopPauseMs: number
  voicePrintConsent: boolean
  hasVoiceSample: boolean
  narratorId: string
}

export interface SessionClock {
  lengthMinutes: number // 1–720
  elapsedMs: number
}

/** Audio engineering lab — all off by default per guide. */
export interface AudioLabConfig {
  harmonicResonance: boolean
  solarEarthSync: boolean
  nearUltrasonicShift: boolean
  dualPannedReverse: boolean
  isoPanMatrix: boolean
  isoPanSpeed: number
  formantMasking: boolean
  formantAmount: number
  sleepCycleInfiltration: boolean
  environmentMorphing: boolean
  choreographyEnabled: boolean
  choreographySteps: ChoreographyStep[]
  unveilAmount: number // 0–1, 0.01 ≈ guide “1% slide” audition
  xrayFocus: boolean
  bioSync: boolean
  entrainment: 'off' | 'binaural' | 'isochronic' | 'monaural'
  entrainmentGain: number
}

export interface ChoreographyStep {
  id: string
  atMinute: number
  hz: number
  label: string
}

export interface VisualConfig {
  mode: VisualMode
  reduceMotion: boolean
}

export interface StudioState {
  surface: AppSurface
  intentId: IntentId | null
  carrier: CarrierConfig
  soundscape: SoundscapeConfig
  affirmations: AffirmationConfig
  narration: NarrationConfig
  clock: SessionClock
  lab: AudioLabConfig
  visual: VisualConfig
  masterVolume: number
  transport: TransportState
}

export interface IntentPreset {
  id: IntentId
  label: string
  description: string
  carrierHz: number
  soundscape: SoundscapeId
  lengthMinutes: number
  affirmations: string[]
}

export const INTENT_PRESETS: IntentPreset[] = [
  {
    id: 'sleep',
    label: 'Sleep',
    description: 'Soft delta-leaning draft for rest',
    carrierHz: 174,
    soundscape: 'rain',
    lengthMinutes: 45,
    affirmations: [
      'My body softens into rest.',
      'Sleep comes easily to me.',
      'I am safe as I drift deeper.',
    ],
  },
  {
    id: 'anxiety',
    label: 'Anxiety',
    description: 'Grounding draft for nerves',
    carrierHz: 396,
    soundscape: 'open-air',
    lengthMinutes: 20,
    affirmations: [
      'I am calm in this moment.',
      'My breath steadies my mind.',
      'I release what I do not need to hold.',
    ],
  },
  {
    id: 'confidence',
    label: 'Confidence',
    description: 'Clear present-tense confidence draft',
    carrierHz: 528,
    soundscape: 'drone',
    lengthMinutes: 15,
    affirmations: [
      'I trust myself completely.',
      'I speak and act with quiet certainty.',
      'I am capable and ready.',
    ],
  },
  {
    id: 'abundance',
    label: 'Abundance',
    description: 'Open, receptive abundance draft',
    carrierHz: 852,
    soundscape: 'room-tone',
    lengthMinutes: 25,
    affirmations: [
      'I welcome growth with ease.',
      'Opportunity flows toward me.',
      'I am open to receiving.',
    ],
  },
]

export function createDefaultLab(): AudioLabConfig {
  return {
    harmonicResonance: false,
    solarEarthSync: false,
    nearUltrasonicShift: false,
    dualPannedReverse: false,
    isoPanMatrix: false,
    isoPanSpeed: 0.05,
    formantMasking: false,
    formantAmount: 0.25,
    sleepCycleInfiltration: false,
    environmentMorphing: false,
    choreographyEnabled: false,
    choreographySteps: [
      { id: 'c1', atMinute: 0, hz: 10, label: 'Alpha hold' },
      { id: 'c2', atMinute: 10, hz: 6, label: 'Into theta' },
      { id: 'c3', atMinute: 25, hz: 2, label: 'Delta settle' },
    ],
    unveilAmount: 0,
    xrayFocus: false,
    bioSync: false,
    entrainment: 'off',
    entrainmentGain: 0.1,
  }
}

export function createDefaultStudioState(): StudioState {
  return {
    surface: 'studio',
    intentId: null,
    carrier: { hz: 528, band: null, volume: 0.16, muted: false },
    soundscape: {
      id: 'rain',
      volume: 0.32,
      muted: false,
      warmthHz: 1800,
      pan: 0,
      customFileName: null,
    },
    affirmations: {
      lines: [
        'I am calm, centered, and open to healing.',
        'Every breath restores my balance.',
      ],
      activeIndex: 0,
    },
    narration: {
      kind: 'device',
      rate: 0.92,
      pitch: 1,
      volume: 0.5,
      loopPauseMs: 2800,
      voicePrintConsent: false,
      hasVoiceSample: false,
      narratorId: 'soft',
    },
    clock: { lengthMinutes: 20, elapsedMs: 0 },
    lab: createDefaultLab(),
    visual: { mode: 'cymatics', reduceMotion: false },
    masterVolume: 0.55,
    transport: 'stopped',
  }
}
