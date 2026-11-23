/** Catalog of advanced DSP tools with human descriptions for Create → Mix */

export type ToolGroup =
  | 'space'
  | 'somatic'
  | 'breath'
  | 'illusions'
  | 'neuro'

export interface AdvancedToolDef {
  id: string
  group: ToolGroup
  label: string
  description: string
  /** Path into PsychoacousticState for 0–1 intensity (or special) */
  kind: 'pct' | 'bipolar' | 'minutes' | 'toggle'
  /** Dot path e.g. spatial.externalizer */
  path: string
  min?: number
  max?: number
}

export const ADVANCED_TOOL_GROUPS: { id: ToolGroup; label: string; blurb: string }[] = [
  {
    id: 'space',
    label: 'Space 3D',
    blurb: 'Place the mix around and outside the head.',
  },
  {
    id: 'somatic',
    label: 'Body / Somatic',
    blurb: 'Felt vibration, chest warmth, and ASMR proximity.',
  },
  {
    id: 'breath',
    label: 'Breath & Masking',
    blurb: 'Respiratory pacing and subliminal voice under the bed.',
  },
  {
    id: 'illusions',
    label: 'Illusions & Trance',
    blurb: 'Neuro-auditory illusions that deepen trance and masking.',
  },
  {
    id: 'neuro',
    label: 'Neuro-Illusions',
    blurb: 'Elevation, corridors, EMDR weave, granular halos.',
  },
]

export const ADVANCED_TOOLS: AdvancedToolDef[] = [
  {
    id: 'externalizer',
    group: 'space',
    label: 'Out-of-Head Externalizer',
    description:
      'Crossfeeds delayed L/R with head-shadow filtering and early reflections so headphones feel like speakers in a room.',
    kind: 'pct',
    path: 'spatial.externalizer',
  },
  {
    id: 'frontBehind',
    group: 'space',
    label: 'Front ↔ Behind Axis',
    description:
      'HRTF Z-axis with pinna notches (behind) and presence boost (front) to slide the scene ahead or behind you.',
    kind: 'bipolar',
    path: 'spatial.frontBehind',
    min: -1,
    max: 1,
  },
  {
    id: 'proximity',
    group: 'space',
    label: 'Near ↔ Far Proximity',
    description:
      'Glides distance, reflection wetness, and air-absorption low-pass so sources feel intimate or distant.',
    kind: 'pct',
    path: 'spatial.proximity',
  },
  {
    id: 'orbit',
    group: 'space',
    label: '3D Head Orbit',
    description:
      'Slow circular / figure-8 / over-crown motion of the HRTF panner around the listener.',
    kind: 'pct',
    path: 'spatial.orbitSpeed',
    max: 0.5,
  },
  {
    id: 'dualPan',
    group: 'space',
    label: 'Dual Pan / Haas Width',
    description:
      'Splits voice with ~18 ms Haas delay and micro-detune for a wide, enveloping whisper field.',
    kind: 'pct',
    path: 'spatial.dualPan',
  },
  {
    id: 'chestBass',
    group: 'somatic',
    label: 'Sub-Harmonic Chest Bass',
    description:
      'Isolates 60–120 Hz from music/frequency, soft-clips an octave-down warmth into the body.',
    kind: 'pct',
    path: 'somatic.chestBass',
  },
  {
    id: 'phantom',
    group: 'somatic',
    label: 'Phantom Fundamental',
    description:
      'Adds 80/120 Hz overtones of a missing 40 Hz root so small headphones still feel deep pressure.',
    kind: 'pct',
    path: 'somatic.phantomFundamental',
  },
  {
    id: 'cranial',
    group: 'somatic',
    label: '40 Hz Cranial Vibro-Pulse',
    description:
      'Pure 40 Hz sine, slowly amplitude-modulated (~0.1 Hz) for a cranial coherence pulse.',
    kind: 'pct',
    path: 'somatic.cranialPulse',
  },
  {
    id: 'asmr',
    group: 'somatic',
    label: 'ASMR Proximity Whisper',
    description:
      'Air shelf at 12 kHz + chest warmth + fast compression so voice feels whispered close to the ear.',
    kind: 'pct',
    path: 'somatic.asmrWhisper',
  },
  {
    id: 'breathSync',
    group: 'breath',
    label: 'Breath Sync',
    description:
      'Respiratory LFO (4-7-8 or 5-5) gently rides music/soundscape volume and low-pass cutoff.',
    kind: 'pct',
    path: 'breath.breathSync',
  },
  {
    id: 'envelopeMask',
    group: 'breath',
    label: 'Dynamic Envelope Masking',
    description:
      'Keeps voice a fixed dB under the music+soundscape RMS floor so affirmations stay subliminal.',
    kind: 'bipolar',
    path: 'breath.envelopeMaskDb',
    min: -30,
    max: -6,
  },
  {
    id: 'ultrasonic',
    group: 'breath',
    label: 'Ultrasonic Carrier',
    description:
      'High-passes voice and ring-modulates it onto a 14.5–17.5 kHz carrier for ultrasonic masking.',
    kind: 'toggle',
    path: 'breath.ultrasonic',
  },
  {
    id: 'shepard',
    group: 'illusions',
    label: 'Shepard-Risset Infinite Descent',
    description:
      'Seven octave-spaced sines glide down forever with a Gaussian window peaking near 180 Hz.',
    kind: 'pct',
    path: 'illusions.shepardIntensity',
  },
  {
    id: 'phaseVacuum',
    group: 'illusions',
    label: 'Phase Vacuum / Magnetic Center',
    description:
      'Inverts a parallel music width bus; correlation sweeps +1→−1 and snaps on affirmation pulses.',
    kind: 'pct',
    path: 'illusions.phaseVacuum',
  },
  {
    id: 'phantomWord',
    group: 'illusions',
    label: 'Phantom Word Ghost-Loop',
    description:
      'Band-passed voice into staggered L/R delays in the soundscape to invite auditory pareidolia.',
    kind: 'pct',
    path: 'illusions.phantomWord',
  },
  {
    id: 'formant',
    group: 'illusions',
    label: 'Inner-Monologue Formant Shift',
    description:
      'Shifts F1–F3 and blends chest resonance so affirmations feel like bone-conducted self-talk.',
    kind: 'bipolar',
    path: 'illusions.innerVoiceFormant',
    min: -1,
    max: 1,
  },
  {
    id: 'stochastic',
    group: 'illusions',
    label: 'Stochastic Resonance Dither',
    description:
      'Injects calibrated pink noise under the voice to lift sub-threshold transients across the nerve floor.',
    kind: 'pct',
    path: 'illusions.stochasticBoost',
  },
  {
    id: 'chirp',
    group: 'illusions',
    label: 'Brainwave Chirp Ramp',
    description:
      'Exponentially glides entrainment from Beta→Alpha→Theta/Delta over 0–30 minutes (live pin on X-Ray).',
    kind: 'minutes',
    path: 'illusions.chirpDurationMinutes',
    min: 0,
    max: 30,
  },
  {
    id: 'levitation',
    group: 'neuro',
    label: 'Acoustic Levitation',
    description:
      'Raises HRTF Y while sweeping a pinna elevation peak 4→9.5 kHz and high-passing sub-bass.',
    kind: 'pct',
    path: 'neuro.levitation',
  },
  {
    id: 'tunnel',
    group: 'neuro',
    label: 'Infinity Whisper Corridor',
    description:
      'Ping-pong delays (180/240 ms) with progressive low-pass and feedback for an endless corridor.',
    kind: 'pct',
    path: 'neuro.tunnelDepth',
  },
  {
    id: 'earWhisper',
    group: 'neuro',
    label: 'Near-Ear Whisper Proximity',
    description:
      'HRTF at ±0.12 m with proximity warmth, 0.68 ms ITD, and contralateral head-shadow LPF.',
    kind: 'pct',
    path: 'neuro.earWhisper',
  },
  {
    id: 'temporal',
    group: 'neuro',
    label: 'Temporal Interference Gamma',
    description:
      '1800+1840 Hz sines create a 40 Hz cochlear beat without an audible bass drone.',
    kind: 'pct',
    path: 'neuro.temporalInterference',
  },
  {
    id: 'poly',
    group: 'neuro',
    label: 'Harmonic Brainwave Stack',
    description:
      'Phase-locked Delta 2 Hz, Theta 6 Hz, and Gamma 40 Hz layers on 60/180/540 Hz carriers.',
    kind: 'pct',
    path: 'neuro.polyCascade',
  },
  {
    id: 'granular',
    group: 'neuro',
    label: 'Voice-Woven Granular Halo',
    description:
      '250 ms Hann grains from voice, read slowly in an AudioWorklet, blended into the music bed.',
    kind: 'pct',
    path: 'neuro.granularHalo',
  },
  {
    id: 'sineSpeech',
    group: 'neuro',
    label: 'Sine-Wave Speech Skeleton',
    description:
      'Ultra-narrow formant bandpasses (Q=18) with soft saturation — whistle contours that slip past speech filters.',
    kind: 'pct',
    path: 'neuro.sineSpeech',
  },
  {
    id: 'bilateral',
    group: 'neuro',
    label: 'Bilateral EMDR Syllabic Weave',
    description:
      '3.5 Hz out-of-phase L/R gain LFOs so affirmations alternate smoothly across hemispheres.',
    kind: 'pct',
    path: 'neuro.bilateralWeave',
  },
]
