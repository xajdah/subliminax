/** REMscribe — overnight sleep entrainment & dream journaling types */

export type DreamLanguageCode =
  | 'en-US'
  | 'ur-PK'
  | 'hi-IN'
  | 'de-DE'
  | 'fr-FR'
  | 'it-IT'
  | 'sr-RS'
  | 'ar-SA'
  | 'ja-JP'
  | 'zh-CN'
  | 'es-ES'
  | 'pt-PT'

export interface DreamLanguageOption {
  code: DreamLanguageCode
  label: string
  wakeWords: string[]
}

export const DREAM_LANGUAGES: DreamLanguageOption[] = [
  { code: 'en-US', label: 'English (en-US)', wakeWords: ['record'] },
  { code: 'ur-PK', label: 'Urdu (ur-PK)', wakeWords: ['record', 'ریکارڈ'] },
  { code: 'hi-IN', label: 'Hindi (hi-IN)', wakeWords: ['record', 'रिकॉर्ड'] },
  { code: 'de-DE', label: 'German (de-DE)', wakeWords: ['record', 'aufnehmen'] },
  { code: 'fr-FR', label: 'French (fr-FR)', wakeWords: ['record', 'enregistrer'] },
  { code: 'it-IT', label: 'Italian (it-IT)', wakeWords: ['record', 'registra'] },
  { code: 'sr-RS', label: 'Serbian (sr-RS)', wakeWords: ['record', 'snimaj'] },
  { code: 'ar-SA', label: 'Arabic (ar-SA)', wakeWords: ['record', 'تسجيل'] },
  { code: 'ja-JP', label: 'Japanese (ja-JP)', wakeWords: ['record', '記録', '録音'] },
  { code: 'zh-CN', label: 'Chinese (zh-CN)', wakeWords: ['record', '录制'] },
  { code: 'es-ES', label: 'Spanish (es-ES)', wakeWords: ['record', 'grabar'] },
  { code: 'pt-PT', label: 'Portuguese (pt-PT)', wakeWords: ['record', 'gravar'] },
]

export type SessionDurationPreset = 4 | 5 | 7 | 9 | 'custom'

export type AcousticEventKind =
  | 'snoring'
  | 'sleepTalking'
  | 'humanTalking'
  | 'bellChime'
  | 'catMeow'
  | 'coughing'
  | 'gasping'
  | 'restlessMovement'
  | 'dreamRecorded'

export const ACOUSTIC_EVENT_LABELS: Record<AcousticEventKind, string> = {
  snoring: 'Snoring',
  sleepTalking: 'Sleep Talking',
  humanTalking: 'Human Talking',
  bellChime: 'Bell / Chime Ring',
  catMeow: 'Cat Meow',
  coughing: 'Coughing',
  gasping: 'Gasping / Apnea Spike',
  restlessMovement: 'Restless Movement',
  dreamRecorded: 'Dream Recorded',
}

export type SleepStage = 'awake' | 'light' | 'deep' | 'rem'

export interface AcousticEvent {
  id: string
  kind: AcousticEventKind
  timestamp: number
  relativeSec: number
  confidence: number
  /** Object URL or data URL for 5–10s clip */
  clipUrl?: string
  clipDurationSec?: number
}

export interface DreamLog {
  id: string
  timestamp: number
  relativeSec: number
  language: DreamLanguageCode
  transcript: string
  clipUrl?: string
  clipDurationSec?: number
  interpretation?: DreamInterpretation
}

export interface DreamInterpretation {
  symbols: string[]
  emotionalTone: string
  affirmationLinks: string[]
  summary: string
  language: DreamLanguageCode
  createdAt: number
}

export interface HypnogramSample {
  relativeSec: number
  stage: SleepStage
  beatHz: number
}

export interface SleepMetrics {
  totalSleepMin: number
  deepPct: number
  remPct: number
  lightPct: number
  awakePct: number
  efficiencyScore: number
  noiseDisturbanceCount: number
}

export interface RemScribeSessionConfig {
  durationHours: number
  customWakeAtMs: number | null
  language: DreamLanguageCode
  linkedAffirmations: string[]
  linkedGoalNames: string[]
}

export interface RemScribeSession {
  id: string
  config: RemScribeSessionConfig
  startedAt: number
  endedAt: number | null
  events: AcousticEvent[]
  dreams: DreamLog[]
  hypnogram: HypnogramSample[]
  metrics: SleepMetrics | null
  status: 'setup' | 'running' | 'ended'
}

export function newRemId(prefix = 'rem'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function estimateMetrics(
  hypnogram: HypnogramSample[],
  events: AcousticEvent[],
  durationSec: number,
): SleepMetrics {
  if (hypnogram.length === 0 || durationSec <= 0) {
    return {
      totalSleepMin: 0,
      deepPct: 0,
      remPct: 0,
      lightPct: 0,
      awakePct: 100,
      efficiencyScore: 0,
      noiseDisturbanceCount: 0,
    }
  }
  const counts = { awake: 0, light: 0, deep: 0, rem: 0 }
  for (const s of hypnogram) counts[s.stage]++
  const n = hypnogram.length
  const deepPct = (counts.deep / n) * 100
  const remPct = (counts.rem / n) * 100
  const lightPct = (counts.light / n) * 100
  const awakePct = (counts.awake / n) * 100
  const sleepFrac = 1 - awakePct / 100
  const totalSleepMin = (durationSec * sleepFrac) / 60
  const noiseDisturbanceCount = events.filter(
    (e) => e.kind !== 'dreamRecorded',
  ).length
  const efficiencyScore = Math.round(
    Math.min(
      100,
      sleepFrac * 100 * 0.7 +
        Math.min(35, deepPct) * 0.5 +
        Math.min(30, remPct) * 0.4 -
        Math.min(20, noiseDisturbanceCount * 1.2),
    ),
  )
  return {
    totalSleepMin: Math.round(totalSleepMin),
    deepPct: Math.round(deepPct * 10) / 10,
    remPct: Math.round(remPct * 10) / 10,
    lightPct: Math.round(lightPct * 10) / 10,
    awakePct: Math.round(awakePct * 10) / 10,
    efficiencyScore: Math.max(0, efficiencyScore),
    noiseDisturbanceCount,
  }
}

export function stageFromBeatHz(beatHz: number, phase: SleepCurvePhase): SleepStage {
  if (phase === 'ascent' && beatHz >= 10) return 'awake'
  if (phase === 'descent' && beatHz >= 12) return 'awake'
  if (beatHz <= 3) return 'deep'
  if (beatHz >= 5.5 && beatHz <= 8) return 'rem'
  if (beatHz < 12) return 'light'
  return 'awake'
}

export type SleepCurvePhase = 'descent' | 'delta' | 'rem' | 'ascent'

export function phaseAtProgress(t: number): SleepCurvePhase {
  if (t < 0.15) return 'descent'
  if (t < 0.5) return 'delta'
  if (t < 0.85) return 'rem'
  return 'ascent'
}
