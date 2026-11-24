/**
 * Phase-locked audio ↔ visual bridge.
 * Master clock: PsychoacousticEngine AudioContext.currentTime only.
 */

import { psychoEngine } from './PsychoacousticEngine'
import type { BreathPattern } from '../types/psychoacoustic'

export type GanzfeldPhaseMode = 'monophasic' | 'hemispheric' | 'breathing'
export type GanzfeldPalette = 'amber' | 'violet' | 'emerald'
export type GanzfeldWaveform = 'sine' | 'isochronic'

export interface PhaseSyncSample {
  /** Entrainment phase 0…2π */
  phaseRad: number
  /** Active beat frequency (Hz) */
  beatHz: number
  /** Breath LFO phase 0…2π */
  breathPhaseRad: number
  breathCycleSec: number
  breathPattern: BreathPattern
  audioTime: number
  /** 0…1 luminance for left / right eye halves */
  left: number
  right: number
  /** Unified field for monophasic / breathing */
  field: number
}

export interface GanzfeldRenderOpts {
  mode: GanzfeldPhaseMode
  waveform: GanzfeldWaveform
  intensity: number // 0.1 … 1
}

function softPulse(phaseRad: number, waveform: GanzfeldWaveform): number {
  if (waveform === 'isochronic') {
    // Crisp duty-cycle pulse still derived from continuous phase (no timers)
    const duty = ((phaseRad / (Math.PI * 2)) % 1 + 1) % 1
    return duty < 0.45 ? 1 : 0.08
  }
  // Soft sine, remapped to 0…1
  return 0.5 + 0.5 * Math.sin(phaseRad)
}

/**
 * Sample the live phase-locked visual modulators.
 * Call once per animation frame from the Ganzfeld canvas.
 */
export function samplePhaseSync(opts: GanzfeldRenderOpts): PhaseSyncSample {
  const snap = psychoEngine.getEntrainmentSnapshot()
  const intensity = Math.min(1, Math.max(0.1, opts.intensity))
  const state = psychoEngine.getState()

  let left = 0.5
  let right = 0.5
  let field = 0.5

  if (opts.mode === 'breathing') {
    // Smooth respiratory swell — zero rapid strobing
    const breath = 0.5 + 0.5 * Math.sin(snap.breathPhaseRad)
    field = left = right = breath
  } else if (opts.mode === 'hemispheric') {
    const a = softPulse(snap.phaseRad, opts.waveform)
    const b = softPulse(snap.phaseRad + Math.PI, opts.waveform) // 180° out of phase
    left = a
    right = b
    field = (a + b) * 0.5
  } else {
    const p = softPulse(snap.phaseRad, opts.waveform)
    field = left = right = p
  }

  // Scale by intensity around mid-gray bias so dark room remains usable at low %
  const scale = (v: number) => v * intensity

  return {
    phaseRad: snap.phaseRad,
    beatHz: snap.beatHz,
    breathPhaseRad: snap.breathPhaseRad,
    breathCycleSec: snap.breathCycleSec,
    breathPattern: state.breath.breathPattern,
    audioTime: snap.audioTime,
    left: scale(left),
    right: scale(right),
    field: scale(field),
  }
}

export const GANZFELD_PALETTES: Record<
  GanzfeldPalette,
  { label: string; blurb: string; rgb: [number, number, number] }
> = {
  amber: {
    label: 'Warm Amber / Sunset',
    blurb: '620–650 nm · Theta/Delta deep trance',
    rgb: [255, 92, 42],
  },
  violet: {
    label: 'Violet / Indigo',
    blurb: '430–460 nm · Gamma clarity & phosphenes',
    rgb: [118, 72, 255],
  },
  emerald: {
    label: 'Emerald / Rose-Gold',
    blurb: 'Alpha 8–12 Hz heart-brain coherence',
    rgb: [46, 196, 148],
  },
}

export function suggestPaletteForHz(hz: number): GanzfeldPalette {
  if (hz >= 30) return 'violet'
  if (hz >= 8 && hz <= 12) return 'emerald'
  return 'amber'
}
