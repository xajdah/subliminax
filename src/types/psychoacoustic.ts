/** Psychoacoustic DSP parameter model */

export type NoiseColor = 'white' | 'pink' | 'brown'
export type OrbitMode = 'circular' | 'figure8' | 'overCrown'
export type BreathPattern = '4-7-8' | '5-5'
export type TunerTab = 'space' | 'somatic' | 'breath' | 'waves' | 'illusions'

export interface BusGainsDb {
  music: number
  soundscape: number
  frequency: number
  voice: number
}

export interface SpatialParams {
  externalizer: number // 0–1
  frontBehind: number // -1 rear … +1 front
  proximity: number // 0 near … 1 far
  proximityRate: number // Hz of glide LFO
  orbitSpeed: number // 0–0.5 Hz
  orbitMode: OrbitMode
  dualPan: number // 0–1
}

export interface SomaticParams {
  chestBass: number
  phantomFundamental: number
  cranialPulse: number
  asmrWhisper: number
}

export interface BreathMaskParams {
  breathSync: number
  breathPattern: BreathPattern
  breathLock: boolean
  envelopeMaskDb: number // -6 … -30 (voice below mask floor)
  ultrasonic: boolean
  ultrasonicCarrierHz: number // 14500–17500
}

export interface FrequencyGenParams {
  mode: 'binaural' | 'isochronic' | 'monaural' | 'solfeggio' | 'off'
  carrierHz: number
  beatHz: number
  solfeggioHz: number
}

/** Illusions & Trance — neuro-auditory DSP (0–1 unless noted) */
export interface IllusionParams {
  shepardIntensity: number
  phaseVacuum: number
  phantomWord: number
  /** -1 … +1 formant shift (negative = more internal/bone) */
  innerVoiceFormant: number
  stochasticBoost: number
  /** 0–30 minutes exponential beta→theta/delta chirp */
  chirpDurationMinutes: number
}

/** Neuro-Illusions — spatial / temporal / granular (0–1) */
export interface NeuroIllusionParams {
  levitation: number
  tunnelDepth: number
  earWhisper: number
  temporalInterference: number
  polyCascade: number
  granularHalo: number
  sineSpeech: number
  bilateralWeave: number
}

export interface PsychoacousticState {
  buses: BusGainsDb
  spatial: SpatialParams
  somatic: SomaticParams
  breath: BreathMaskParams
  frequency: FrequencyGenParams
  illusions: IllusionParams
  neuro: NeuroIllusionParams
  soundscapeNoise: NoiseColor
  masterDb: number
  isolateVoice: boolean
  checkMasking: boolean
  /** Live descending entrainment Hz (chirp) — read-only from engine */
  liveBeatHz: number
}

export const DEFAULT_PSYCHO: PsychoacousticState = {
  buses: {
    // Studio audition levels (still voice-under-music; not full club loudness)
    music: -8,
    soundscape: -10,
    frequency: -14,
    voice: -18,
  },
  spatial: {
    externalizer: 0.35,
    frontBehind: 0.2,
    proximity: 0.25,
    proximityRate: 0.05,
    orbitSpeed: 0.08,
    orbitMode: 'circular',
    dualPan: 0.2,
  },
  somatic: {
    chestBass: 0.15,
    phantomFundamental: 0.1,
    cranialPulse: 0.2,
    asmrWhisper: 0.25,
  },
  breath: {
    breathSync: 0.3,
    breathPattern: '4-7-8',
    breathLock: false,
    envelopeMaskDb: -18,
    ultrasonic: false,
    ultrasonicCarrierHz: 16000,
  },
  frequency: {
    mode: 'binaural',
    carrierHz: 200,
    beatHz: 6,
    solfeggioHz: 528,
  },
  illusions: {
    shepardIntensity: 0,
    phaseVacuum: 0,
    phantomWord: 0,
    innerVoiceFormant: 0,
    stochasticBoost: 0,
    chirpDurationMinutes: 0,
  },
  neuro: {
    levitation: 0,
    tunnelDepth: 0,
    earWhisper: 0,
    temporalInterference: 0,
    polyCascade: 0,
    granularHalo: 0,
    sineSpeech: 0,
    bilateralWeave: 0,
  },
  soundscapeNoise: 'pink',
  /** Unity master for audible cloud-desktop / laptop preview */
  masterDb: 0,
  isolateVoice: false,
  checkMasking: false,
  liveBeatHz: 6,
}
