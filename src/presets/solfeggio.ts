import type { SolfeggioHz } from '../types/studio'

export interface SolfeggioTone {
  hz: SolfeggioHz
  label: string
  note: string
}

export const SOLFEGGIO_TONES: readonly SolfeggioTone[] = [
  { hz: 174, label: '174 Hz', note: 'Foundation / pain relief' },
  { hz: 285, label: '285 Hz', note: 'Tissue / field repair' },
  { hz: 396, label: '396 Hz', note: 'Liberation from fear' },
  { hz: 417, label: '417 Hz', note: 'Facilitating change' },
  { hz: 528, label: '528 Hz', note: 'Transformation / DNA' },
  { hz: 639, label: '639 Hz', note: 'Connection / relationships' },
  { hz: 741, label: '741 Hz', note: 'Expression / solution' },
  { hz: 852, label: '852 Hz', note: 'Intuition / awakening' },
  { hz: 963, label: '963 Hz', note: 'Unity / pineal' },
] as const
