/**
 * Combine kinematic stroke telemetry with 3-word semantic cues
 * into an Aura & Brainwave Prescription.
 */

import type {
  AuraEnergeticState,
  AuraKinematics,
  AuraPrescription,
  AuraStrokePoint,
} from '../types/aura'
import type { CreateSession } from '../types/studio'
import { createDefaultSession } from '../types/studio'
import { DEFAULT_PSYCHO } from '../types/psychoacoustic'

const AGITATION_WORDS = [
  'anger',
  'anxious',
  'chaos',
  'fire',
  'fast',
  'panic',
  'storm',
  'sharp',
  'rush',
  'tense',
  'wild',
]
const LOW_WORDS = [
  'tired',
  'heavy',
  'slow',
  'empty',
  'fog',
  'sleep',
  'cold',
  'numb',
  'drain',
  'quiet',
  'dark',
]
const FLOW_WORDS = [
  'flow',
  'ocean',
  'soft',
  'dream',
  'create',
  'light',
  'open',
  'peace',
  'wave',
  'art',
  'play',
]
const FOCUS_WORDS = [
  'focus',
  'clear',
  'sharp',
  'aim',
  'work',
  'steel',
  'laser',
  'now',
  'task',
  'mind',
]

export function computeKinematics(
  strokes: AuraStrokePoint[][],
  durationSec: number,
  colorEnergy: number,
): AuraKinematics {
  let totalDist = 0
  let totalTime = 0
  let peakVelocity = 0
  let angleAccum = 0
  let angleSamples = 0
  let smoothTurns = 0
  let sharpTurns = 0
  let hesitationMs = 0
  let pauseCount = 0
  let pointCount = 0

  for (const stroke of strokes) {
    pointCount += stroke.length
    for (let i = 1; i < stroke.length; i++) {
      const a = stroke[i - 1]!
      const b = stroke[i]!
      const dt = Math.max(1, b.t - a.t)
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.hypot(dx, dy)
      const v = dist / dt // px/ms
      totalDist += dist
      totalTime += dt
      peakVelocity = Math.max(peakVelocity, v)
      if (dt > 200) {
        hesitationMs += dt
        pauseCount++
      }
      if (i >= 2) {
        const c = stroke[i - 2]!
        const ang1 = Math.atan2(a.y - c.y, a.x - c.x)
        const ang2 = Math.atan2(b.y - a.y, b.x - a.x)
        let d = Math.abs(ang2 - ang1)
        if (d > Math.PI) d = 2 * Math.PI - d
        angleAccum += d
        angleSamples++
        if (d > 0.9) sharpTurns++
        else if (d < 0.25) smoothTurns++
      }
    }
  }

  const avgVelocity = totalTime > 0 ? totalDist / totalTime : 0
  const angularity =
    angleSamples > 0 ? sharpTurns / Math.max(1, sharpTurns + smoothTurns) : 0.3
  const curvatureSmoothness =
    angleSamples > 0 ? 1 - Math.min(1, angleAccum / (angleSamples * 0.8)) : 0.5
  const density = durationSec > 0 ? pointCount / durationSec : 0

  return {
    avgVelocity,
    peakVelocity,
    angularity,
    curvatureSmoothness,
    density,
    hesitationMs,
    pauseCount,
    colorEnergy,
    durationSec,
    strokeCount: strokes.length,
  }
}

export function prescribeAura(
  kin: AuraKinematics,
  words: [string, string, string],
): AuraPrescription {
  const w = words.map((x) => x.trim().toLowerCase())
  const wordHit = (list: string[]) =>
    w.some((x) => list.some((k) => x.includes(k) || k.includes(x)))

  let state: AuraEnergeticState
  // Fast + jagged → agitated beta
  if (kin.avgVelocity > 0.85 || kin.angularity > 0.55 || wordHit(AGITATION_WORDS)) {
    state = 'agitated-beta'
  } else if (
    kin.avgVelocity < 0.25 ||
    kin.density < 8 ||
    kin.hesitationMs > 2500 ||
    wordHit(LOW_WORDS)
  ) {
    state = 'low-energy'
  } else if (kin.curvatureSmoothness > 0.55 && (kin.avgVelocity > 0.35 || wordHit(FLOW_WORDS))) {
    state = 'creative-theta'
  } else if (wordHit(FOCUS_WORDS) || (kin.density > 40 && kin.angularity < 0.35)) {
    state = 'focused-smr'
  } else {
    state = 'balanced-alpha'
  }

  const base = {
    words,
    script: buildScript(words, state),
  }

  switch (state) {
    case 'agitated-beta':
      return {
        ...base,
        state,
        stateLabel: 'Agitated Beta',
        blurb: 'Fast / jagged motion suggests high arousal — downshift into Alpha with breath sync.',
        carrierHz: 200,
        beatHz: 8,
        entrainment: 'binaural',
        spatial: 'bilateral',
        breathPattern: '4-7-8',
        breathSync: 0.7,
        somaticLevel: 0.35,
      }
    case 'low-energy':
      return {
        ...base,
        state,
        stateLabel: 'Low Energy',
        blurb: 'Slow / heavy strokes — lift with SMR focus or Gamma clarity.',
        carrierHz: 220,
        beatHz: kin.colorEnergy > 0.55 ? 40 : 14,
        entrainment: 'isochronic',
        spatial: 'static',
        breathPattern: '5-5',
        breathSync: 0.45,
        somaticLevel: 0.55,
      }
    case 'creative-theta':
      return {
        ...base,
        state,
        stateLabel: 'Creative Theta Flow',
        blurb: 'Flowing balanced strokes — Theta creative entrainment.',
        carrierHz: 180,
        beatHz: 6,
        entrainment: 'binaural',
        spatial: 'hrtf',
        breathPattern: '4-7-8',
        breathSync: 0.4,
        somaticLevel: 0.4,
      }
    case 'focused-smr':
      return {
        ...base,
        state,
        stateLabel: 'Focused SMR',
        blurb: 'Dense, directed marks — Sensorimotor rhythm for calm focus.',
        carrierHz: 210,
        beatHz: 14,
        entrainment: 'binaural',
        spatial: 'bilateral',
        breathPattern: '5-5',
        breathSync: 0.35,
        somaticLevel: 0.3,
      }
    default:
      return {
        ...base,
        state: 'balanced-alpha',
        stateLabel: 'Balanced Alpha',
        blurb: 'Steady presence — Alpha coherence with soft spatial motion.',
        carrierHz: 200,
        beatHz: 10,
        entrainment: 'binaural',
        spatial: 'bilateral',
        breathPattern: '4-7-8',
        breathSync: 0.5,
        somaticLevel: 0.35,
      }
  }
}

function buildScript(words: [string, string, string], state: AuraEnergeticState): string {
  const [a, b, c] = words.map((w) => w.trim() || 'presence') as [string, string, string]
  const tone =
    state === 'agitated-beta'
      ? 'I soften. I breathe. I return to calm clarity.'
      : state === 'low-energy'
        ? 'Energy rises through me with gentle precision.'
        : state === 'focused-smr'
          ? 'My attention is steady, clean, and kind.'
          : 'I create from ease and quiet power.'
  return `I am ${a}. I welcome ${b}. I embody ${c}. ${tone}`
}

/** Map prescription → CreateSession seed for Studio. */
export function sessionFromAuraPrescription(rx: AuraPrescription): CreateSession {
  const base = createDefaultSession()
  const band =
    rx.beatHz <= 4
      ? 'delta'
      : rx.beatHz <= 8
        ? 'theta'
        : rx.beatHz <= 12
          ? 'alpha'
          : rx.beatHz <= 30
            ? 'beta'
            : 'gamma'

  const psycho = structuredClone(DEFAULT_PSYCHO)
  psycho.frequency = {
    mode:
      rx.entrainment === 'isochronic'
        ? 'isochronic'
        : rx.entrainment === 'monaural'
          ? 'monaural'
          : rx.entrainment === 'off'
            ? 'off'
            : 'binaural',
    carrierHz: rx.carrierHz,
    beatHz: rx.beatHz,
    solfeggioHz: 528,
  }
  psycho.breath = {
    ...psycho.breath,
    breathPattern: rx.breathPattern ?? '4-7-8',
    breathSync: rx.breathSync,
    breathLock: !!rx.breathPattern,
  }
  psycho.somatic = {
    chestBass: rx.somaticLevel * 0.6,
    phantomFundamental: rx.somaticLevel * 0.4,
    cranialPulse: rx.somaticLevel * 0.5,
    asmrWhisper: rx.somaticLevel * 0.35,
  }
  if (rx.spatial === 'hrtf') {
    psycho.spatial = {
      ...psycho.spatial,
      externalizer: 0.75,
      orbitSpeed: 0.08,
      dualPan: 0.4,
    }
  } else if (rx.spatial === 'bilateral') {
    psycho.spatial = { ...psycho.spatial, dualPan: 0.55, externalizer: 0.35 }
  }

  return {
    ...base,
    step: 'mix',
    category: 'mental',
    frequency: {
      ...base.frequency,
      hz: rx.carrierHz > 100 ? 528 : 432,
      entrainment: rx.entrainment,
      band,
      beatHz: rx.beatHz,
      volume: base.frequency.volume,
    },
    voice: {
      ...base.voice,
      mode: 'narrator',
      script: rx.script,
    },
    psycho: {
      ...base.psycho,
      spatial: rx.spatial,
    },
    advancedPsycho: psycho,
  }
}

const PRESET_KEY = 'subliminax.auraPresets.v1'

export function saveAuraPreset(record: {
  label: string
  prescription: AuraPrescription
  kinematics: AuraKinematics
}) {
  const list = loadAuraPresets()
  const row = {
    id: `aura_${Date.now().toString(36)}`,
    label: record.label,
    createdAt: Date.now(),
    prescription: record.prescription,
    kinematics: record.kinematics,
  }
  list.unshift(row)
  localStorage.setItem(PRESET_KEY, JSON.stringify(list.slice(0, 40)))
  return row
}

export function loadAuraPresets() {
  try {
    const raw = localStorage.getItem(PRESET_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const CREATE_SEED_KEY = 'subliminax.createSeed.v1'

export function writeCreateSeed(session: CreateSession) {
  sessionStorage.setItem(CREATE_SEED_KEY, JSON.stringify(session))
}

export function consumeCreateSeed(): CreateSession | null {
  try {
    const raw = sessionStorage.getItem(CREATE_SEED_KEY)
    if (!raw) return null
    sessionStorage.removeItem(CREATE_SEED_KEY)
    return JSON.parse(raw) as CreateSession
  } catch {
    return null
  }
}
