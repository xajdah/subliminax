/**
 * Subliminal Study — age + output-device psychoacoustic calibration.
 * Configures PsychoacousticEngine for headphones (binaural) vs speakers (isochronic).
 */

import { psychoEngine } from './PsychoacousticEngine'
import { DEFAULT_PSYCHO, type PsychoacousticState } from '../types/psychoacoustic'
import { ageBandFromAge, type StudyOutputDevice } from '../types/study'
import { clamp, dbToGain, setParam } from './dsp/util'

export interface StudyPsychoConfig {
  age: number
  outputDevice: StudyOutputDevice
  /** Youth (13–24): use 40 Hz Gamma instead of 14 Hz SMR */
  preferGamma?: boolean
  /** Frequency bus trim as linear 0–1 → mapped to −36…−12 dBFS */
  frequencyLevel?: number
  /** Conscious study vs quiet subliminal reinforcement */
  listenMode?: 'conscious' | 'subliminal'
}

export interface StudyPsychoResult {
  state: PsychoacousticState
  label: string
  beatHz: number
  carrierHz: number
  frequencyMode: PsychoacousticState['frequency']['mode']
  maskingDb: number
  vocalClarityBoostDb: number
  blurb: string
}

/** Map UI 0–1 slider → frequency bus dBFS (−36 … −12). */
export function frequencyLevelToDb(level: number): number {
  const t = clamp(level, 0, 1)
  return -36 + t * 24
}

export function getOptimalStudyConfig(
  age: number,
  outputDevice: StudyOutputDevice,
  opts?: { preferGamma?: boolean },
): StudyPsychoResult {
  const band = ageBandFromAge(age)
  const preferGamma = !!opts?.preferGamma

  let beatHz: number
  let carrierHz: number
  let label: string
  let blurb: string

  if (band === 'child') {
    beatHz = 10.5
    carrierHz = 200
    label = 'High-Alpha 10.5 Hz · calm focus (≤12)'
    blurb = 'Gentle High-Alpha supports calm attention without overstimulation.'
  } else if (band === 'youth') {
    if (preferGamma) {
      beatHz = 40
      carrierHz = 220
      label = 'Gamma 40 Hz · active recall (13–24)'
      blurb = 'Forty-hertz Gamma option for active recall and binding of new facts.'
    } else {
      beatHz = 14
      carrierHz = 200
      label = 'SMR 14 Hz · memory encoding (13–24)'
      blurb = 'Sensorimotor Rhythm (SMR) supports steady encoding during study.'
    }
  } else {
    // Adult: Gamma layered over Alpha — primary beat is Gamma; Alpha noted in blurb
    beatHz = 40
    carrierHz = 200
    label = 'Gamma 40 Hz over Alpha 10 Hz · retention (25+)'
    blurb =
      'Gamma for neuroplasticity and deep retention, framed over a 10 Hz Alpha calm bed.'
  }

  const state = structuredClone(DEFAULT_PSYCHO) as PsychoacousticState
  let maskingDb: number
  let vocalClarityBoostDb: number
  let frequencyMode: PsychoacousticState['frequency']['mode']

  if (outputDevice === 'headphones') {
    frequencyMode = 'binaural'
    maskingDb = -18
    vocalClarityBoostDb = 0
    state.frequency = {
      mode: 'binaural',
      carrierHz,
      beatHz,
      solfeggioHz: 432,
    }
    // Out-of-head externalizer ~20% crossfeed + Haas width ~16 ms (dualPan mid-high)
    state.spatial = {
      ...state.spatial,
      externalizer: 0.2,
      dualPan: 0.72, // ≈16 ms Haas in SpatialProcessor lerp(8–20 ms)
      proximity: 0.25,
      orbitSpeed: 0.03,
    }
    state.soundscapeNoise = 'pink'
    state.buses = {
      music: -22,
      soundscape: maskingDb,
      frequency: -20,
      voice: -14,
    }
  } else {
    // Speakers: isochronic (mono-safe pulses) — avoids binaural phase cancellation in open air
    frequencyMode = 'isochronic'
    maskingDb = -24
    vocalClarityBoostDb = 2.5
    state.frequency = {
      mode: 'isochronic',
      carrierHz,
      beatHz,
      solfeggioHz: 432,
    }
    state.spatial = {
      ...state.spatial,
      externalizer: 0,
      dualPan: 0,
      proximity: 0.15,
      orbitSpeed: 0,
      frontBehind: 0.35, // mild presence / front bias ≈ 3 kHz clarity cue
    }
    state.soundscapeNoise = 'pink'
    state.buses = {
      music: -22,
      soundscape: maskingDb,
      frequency: -20,
      // +2.5 dB vocal clarity vs headphones conscious voice trim
      voice: -14 + vocalClarityBoostDb,
    }
  }

  // Adult Alpha underlay via mild breath lock / slower spatial when Gamma primary
  if (band === 'adult') {
    state.breath = {
      ...state.breath,
      breathSync: 0.35,
      breathPattern: '5-5',
      breathLock: true,
      envelopeMaskDb: -18,
    }
  }

  return {
    state,
    label,
    beatHz,
    carrierHz,
    frequencyMode,
    maskingDb,
    vocalClarityBoostDb,
    blurb,
  }
}

/** Apply study calibration to the live psycho engine. */
export async function applyStudyPsychoConfig(
  cfg: StudyPsychoConfig,
  opts?: { startIfNeeded?: boolean },
): Promise<StudyPsychoResult> {
  const result = getOptimalStudyConfig(cfg.age, cfg.outputDevice, {
    preferGamma: cfg.preferGamma,
  })
  const state = structuredClone(result.state)

  if (cfg.frequencyLevel != null) {
    state.buses.frequency = frequencyLevelToDb(cfg.frequencyLevel)
  }

  if (cfg.listenMode === 'subliminal') {
    // Quiet reinforcement — voice deep under mask, beds softer
    state.buses.voice = Math.min(state.buses.voice, -28)
    state.buses.music = Math.min(state.buses.music, -18)
    state.breath = {
      ...state.breath,
      envelopeMaskDb: -22,
    }
    state.masterDb = -4
  } else {
    state.buses.voice = Math.max(state.buses.voice, -12)
    state.masterDb = -2
  }

  if (opts?.startIfNeeded !== false && !psychoEngine.isPlaying()) {
    psychoEngine.applyPreset(state)
    await psychoEngine.start({ withDemoSources: true })
  } else {
    psychoEngine.applyPreset(state)
  }

  psychoEngine.updateEntrainment(result.beatHz, result.carrierHz)
  psychoEngine.setNoiseColor(state.soundscapeNoise)
  psychoEngine.setBusDb('soundscape', state.buses.soundscape)
  psychoEngine.setBusDb('frequency', state.buses.frequency)
  psychoEngine.setBusDb('voice', state.buses.voice)

  // Soft presence peaking ≈ 3 kHz when speakers (+2.5 dB vocal clarity)
  attachStudyPresenceEq(result.vocalClarityBoostDb)

  return { ...result, state }
}

let presenceFilter: BiquadFilterNode | null = null
let presenceGain: GainNode | null = null

function attachStudyPresenceEq(boostDb: number) {
  const ctx = psychoEngine.getAudioContext()
  const voiceIn = psychoEngine.getVoiceInput()
  if (!ctx || !voiceIn) return

  // Tear previous
  try {
    presenceFilter?.disconnect()
    presenceGain?.disconnect()
  } catch {
    /* noop */
  }
  presenceFilter = null
  presenceGain = null

  if (boostDb <= 0.05) return

  const peaking = ctx.createBiquadFilter()
  peaking.type = 'peaking'
  peaking.frequency.value = 3000
  peaking.Q.value = 1.1
  peaking.gain.value = boostDb

  // Parallel wet into voice bus — dry path still receives injectVoiceBuffer directly
  const g = ctx.createGain()
  setParam(g.gain, dbToGain(-6), ctx)
  // Feed a silent tap from destination? We can't easily splice the bus.
  // Instead leave peaking available for study player to route recorded/TTS through.
  presenceFilter = peaking
  presenceGain = g
  peaking.connect(g).connect(voiceIn)
}

/** Route an AudioNode through the study presence EQ when speakers mode is active. */
export function getStudyVoiceInsert(): AudioNode | null {
  return presenceFilter
}

export function disposeStudyPresenceEq() {
  try {
    presenceFilter?.disconnect()
    presenceGain?.disconnect()
  } catch {
    /* noop */
  }
  presenceFilter = null
  presenceGain = null
}
