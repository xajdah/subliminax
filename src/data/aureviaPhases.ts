import type { BrainwaveBand, CreateSession } from '../types/studio'
import { createDefaultSession } from '../types/studio'

export type AureviaPathId = 'short' | 'full'
export type AureviaMovement = 'threshold' | 'crossing' | 'presence' | 'return'

export interface AureviaPhase {
  id: AureviaMovement
  title: string
  line: string
  seconds: number
  hz: number
  band: BrainwaveBand
  beatHz: number
  bed: number
  ambient: number
  shimmer: boolean
  voice: boolean
}

const FULL: AureviaPhase[] = [
  {
    id: 'threshold',
    title: 'Threshold',
    line: 'You arrive. The breath is enough.',
    seconds: 60,
    hz: 174,
    band: 'schumann',
    beatHz: 7.83,
    bed: 0.28,
    ambient: 0.16,
    shimmer: false,
    voice: false,
  },
  {
    id: 'crossing',
    title: 'Crossing',
    line: 'The mind widens. A bright horizon opens in front of you.',
    seconds: 240,
    hz: 528,
    band: 'theta',
    beatHz: 6,
    bed: 0.42,
    ambient: 0.4,
    shimmer: true,
    voice: false,
  },
  {
    id: 'presence',
    title: 'Presence',
    line: 'You meet the part of you that already sees.',
    seconds: 480,
    hz: 852,
    band: 'alpha',
    beatHz: 10,
    bed: 0.48,
    ambient: 0.5,
    shimmer: true,
    voice: true,
  },
  {
    id: 'return',
    title: 'Return',
    line: 'You come back, carrying what was shown.',
    seconds: 120,
    hz: 528,
    band: 'custom',
    beatHz: 8,
    bed: 0.3,
    ambient: 0.22,
    shimmer: false,
    voice: false,
  },
]

const SHORT: AureviaPhase[] = [
  { ...FULL[0], seconds: 45 },
  { ...FULL[1], seconds: 120 },
  { ...FULL[2], seconds: 210 },
  { ...FULL[3], seconds: 75 },
]

export const AUREVIA_PATHS: Record<AureviaPathId, AureviaPhase[]> = {
  short: SHORT,
  full: FULL,
}

export function aureviaDuration(path: AureviaPathId): number {
  return AUREVIA_PATHS[path].reduce((sum, phase) => sum + phase.seconds, 0)
}

export function buildAureviaSession(
  phase: AureviaPhase,
  script: string,
  opts?: { ownVoice?: boolean; quiet?: boolean },
): CreateSession {
  const base = createDefaultSession()
  const speakWithGuide = phase.voice && !opts?.ownVoice
  const quiet = !!opts?.quiet
  return {
    ...base,
    step: 'mix',
    category: 'spiritual',
    frequency: {
      ...base.frequency,
      hz: phase.hz,
      harmonicShimmer: phase.shimmer,
      entrainment: 'binaural',
      band: phase.band,
      beatHz: phase.beatHz,
      progressiveRamp: false,
      volume: 0.18,
    },
    soundtrack: {
      mood: 'calming',
      trackId: 'velvet-horizon',
      volume: quiet ? phase.bed * 0.75 : phase.bed,
      customFileName: null,
    },
    ambients: [{ id: 'glass-temple', enabled: true, gain: phase.ambient }],
    voice: {
      ...base.voice,
      mode: speakWithGuide ? 'narrator' : 'none',
      script: speakWithGuide ? script : '',
      volume: quiet ? 0.22 : 0.4,
      rate: 0.86,
      loopPauseMs: 8000,
      narratorId: 'warm-guide',
    },
    psycho: {
      autoDuck: true,
      multiLayerStack: false,
      highCarrierMod: false,
      spatial: phase.id === 'presence' || phase.id === 'crossing' ? 'bilateral' : 'static',
      driftRate: 0.015,
    },
    masterVolume: 0.84,
    lengthMinutes: 15,
  }
}
