import {
  DEFAULT_PSYCHO,
  type PsychoacousticState,
} from '../types/psychoacoustic'

export interface StudioPreset {
  id: string
  label: string
  blurb: string
  state: PsychoacousticState
}

function base(over: Partial<PsychoacousticState> & {
  buses?: Partial<PsychoacousticState['buses']>
  spatial?: Partial<PsychoacousticState['spatial']>
  somatic?: Partial<PsychoacousticState['somatic']>
  breath?: Partial<PsychoacousticState['breath']>
  frequency?: Partial<PsychoacousticState['frequency']>
  illusions?: Partial<PsychoacousticState['illusions']>
  neuro?: Partial<PsychoacousticState['neuro']>
}): PsychoacousticState {
  return {
    ...structuredClone(DEFAULT_PSYCHO),
    ...over,
    buses: { ...DEFAULT_PSYCHO.buses, ...over.buses },
    spatial: { ...DEFAULT_PSYCHO.spatial, ...over.spatial },
    somatic: { ...DEFAULT_PSYCHO.somatic, ...over.somatic },
    breath: { ...DEFAULT_PSYCHO.breath, ...over.breath },
    frequency: { ...DEFAULT_PSYCHO.frequency, ...over.frequency },
    illusions: { ...DEFAULT_PSYCHO.illusions, ...over.illusions },
    neuro: { ...DEFAULT_PSYCHO.neuro, ...over.neuro },
  }
}

export const STUDIO_PRESETS: StudioPreset[] = [
  {
    id: 'deep-sleep',
    label: 'Deep Sleep',
    blurb: 'Delta chirp, soft pink bed, low voice under mask.',
    state: base({
      buses: { music: -14, soundscape: -12, frequency: -22, voice: -34 },
      frequency: { mode: 'binaural', carrierHz: 100, beatHz: 2, solfeggioHz: 174 },
      breath: {
        breathSync: 0.55,
        breathPattern: '4-7-8',
        breathLock: true,
        envelopeMaskDb: -22,
        ultrasonic: false,
        ultrasonicCarrierHz: 16000,
      },
      illusions: {
        shepardIntensity: 0.15,
        phaseVacuum: 0,
        phantomWord: 0.1,
        innerVoiceFormant: -0.6,
        stochasticBoost: 0.2,
        chirpDurationMinutes: 25,
      },
      neuro: { ...DEFAULT_PSYCHO.neuro, polyCascade: 0.35, tunnelDepth: 0.25 },
      soundscapeNoise: 'brown',
    }),
  },
  {
    id: 'out-of-head',
    label: 'Out-of-Head Cinema',
    blurb: 'Externalizer + orbit + dual-pan immersion.',
    state: base({
      buses: { music: -10, soundscape: -16, frequency: -24, voice: -30 },
      spatial: {
        externalizer: 0.85,
        frontBehind: 0.4,
        proximity: 0.35,
        proximityRate: 0.06,
        orbitSpeed: 0.12,
        orbitMode: 'circular',
        dualPan: 0.55,
      },
      neuro: { ...DEFAULT_PSYCHO.neuro, levitation: 0.4, earWhisper: 0.3 },
    }),
  },
  {
    id: 'somatic-body',
    label: 'Somatic Body Resonance',
    blurb: 'Chest bass, phantom fundamental, 40 Hz cranial.',
    state: base({
      buses: { music: -12, soundscape: -15, frequency: -18, voice: -28 },
      somatic: {
        chestBass: 0.75,
        phantomFundamental: 0.65,
        cranialPulse: 0.7,
        asmrWhisper: 0.35,
      },
      frequency: { mode: 'isochronic', carrierHz: 120, beatHz: 40, solfeggioHz: 528 },
      neuro: { ...DEFAULT_PSYCHO.neuro, temporalInterference: 0.5, polyCascade: 0.45 },
    }),
  },
  {
    id: 'ultrasonic-focus',
    label: 'Ultrasonic Focus',
    blurb: 'Carrier masking + breath lock + gamma edge.',
    state: base({
      buses: { music: -16, soundscape: -14, frequency: -20, voice: -36 },
      breath: {
        breathSync: 0.25,
        breathPattern: '5-5',
        breathLock: true,
        envelopeMaskDb: -24,
        ultrasonic: true,
        ultrasonicCarrierHz: 16500,
      },
      frequency: { mode: 'binaural', carrierHz: 200, beatHz: 10, solfeggioHz: 852 },
      illusions: {
        ...DEFAULT_PSYCHO.illusions,
        stochasticBoost: 0.45,
        innerVoiceFormant: -0.35,
      },
      neuro: { ...DEFAULT_PSYCHO.neuro, sineSpeech: 0.4, bilateralWeave: 0.5 },
    }),
  },
]

export const STUDIO_PRESETS_MAP = Object.fromEntries(
  STUDIO_PRESETS.map((p) => [p.id, p]),
) as Record<string, StudioPreset>
