/** Core studio domain types for Subliminax */

export type ThemeMode = 'dark' | 'light'
export type StudioMode = 'simple' | 'advanced'
export type TransportState = 'stopped' | 'playing' | 'paused'

export type MoodId =
  | 'focus'
  | 'peace'
  | 'sleep'
  | 'energizing'
  | 'love'
  | 'inspire'

export type AmbientBedId = 'pink' | 'brown' | 'rain' | 'pad' | 'none'

export type EntrainmentMode = 'tone' | 'binaural' | 'isochronic' | 'off'

export type SolfeggioHz =
  | 174
  | 285
  | 396
  | 417
  | 528
  | 639
  | 741
  | 852
  | 963

export interface AffirmationTrack {
  id: string
  text: string
  volume: number
  pan: number
  rate: number
  pitch: number
  loop: boolean
  muted: boolean
  subliminal: boolean
}

export interface SessionNotes {
  title: string
  body: string
  updatedAt: number
}

export interface XenapseConfig {
  mode: EntrainmentMode
  carrierHz: number
  beatHz: number
  pulseHz: number
  toneGain: number
  ambient: AmbientBedId
  ambientGain: number
  ambientFilterHz: number
  useSolfeggio: boolean
  solfeggioHz: SolfeggioHz | null
}

export interface MatrixHaloConfig {
  intensity: number
  reduceMotion: boolean
  showRings: boolean
  showCymatics: boolean
}

export interface StudioState {
  theme: ThemeMode
  studioMode: StudioMode
  transport: TransportState
  masterVolume: number
  moodId: MoodId | null
  affirmations: AffirmationTrack[]
  sessionNotes: SessionNotes
  xenapse: XenapseConfig
  matrixHalo: MatrixHaloConfig
  sessionElapsedMs: number
}

export interface MoodPreset {
  id: MoodId
  label: string
  description: string
  xenapse: Partial<XenapseConfig>
  masterVolume: number
  sampleAffirmations: string[]
}
