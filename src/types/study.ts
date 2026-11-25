/** Subliminal Study — lesson capture, styles, and playback types */

export type StudyOutputDevice = 'headphones' | 'speakers'

export type StudyLanguageCode =
  | 'en'
  | 'sr'
  | 'de'
  | 'fr'
  | 'es'
  | 'it'
  | 'pt'
  | 'hi'
  | 'ur'
  | 'ar'
  | 'ja'
  | 'zh'

export interface StudyLanguageOption {
  code: StudyLanguageCode
  label: string
}

export const STUDY_LANGUAGES: StudyLanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'sr', label: 'Serbian' },
  { code: 'de', label: 'German' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ur', label: 'Urdu' },
  { code: 'ar', label: 'Arabic' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
]

export type StudyLearningStyle =
  | 'activeRecall'
  | 'rhyme'
  | 'song'
  | 'podcast'
  | 'memoryPalace'
  | 'analogy'

export interface StudyStyleCard {
  id: StudyLearningStyle
  title: string
  blurb: string
  badge: string
}

export const STUDY_STYLE_CARDS: StudyStyleCard[] = [
  {
    id: 'activeRecall',
    title: 'Active Recall Q&A',
    blurb: 'Question → [3s PAUSE] → answer. Forces retrieval before the reveal.',
    badge: 'Q&A',
  },
  {
    id: 'rhyme',
    title: 'Rhyme & Cadence',
    blurb: 'Metered couplets that stick — ideal for lists and definitions.',
    badge: 'Rhyme',
  },
  {
    id: 'song',
    title: 'Song / Chant',
    blurb: 'Repetitive chant structure with a clear hook and refrain.',
    badge: 'Song',
  },
  {
    id: 'podcast',
    title: '2-Person Podcast Dialogue',
    blurb: '[Host] and [Mentor] tags — conversational teaching for dual-voice TTS.',
    badge: 'Podcast',
  },
  {
    id: 'memoryPalace',
    title: 'Memory Palace Story',
    blurb: 'Walk a vivid spatial story that places each fact in a room.',
    badge: 'Palace',
  },
  {
    id: 'analogy',
    title: 'Simple Analogy (ELI5)',
    blurb: 'Everyday metaphors that collapse dense topics into one clear picture.',
    badge: 'ELI5',
  },
]

export type StudyAgeBand = 'child' | 'youth' | 'adult'

export function ageBandFromAge(age: number): StudyAgeBand {
  if (age <= 12) return 'child'
  if (age <= 24) return 'youth'
  return 'adult'
}

export type StudyVoiceMode = 'record' | 'clone' | 'narrator'

export type StudyListenMode = 'conscious' | 'subliminal'

export interface StudyHighlight {
  id: string
  text: string
  kind: 'fact' | 'definition' | 'formula'
}

export interface StudyQuizItem {
  id: string
  question: string
  answer: string
}

export interface StudyGenerationResult {
  keyHighlights: StudyHighlight[]
  studyScript: string
  flashQuiz: StudyQuizItem[]
}

export interface StudySessionConfig {
  language: StudyLanguageCode
  subject: string
  age: number
  outputDevice: StudyOutputDevice
  /** Youth band can opt into 40 Hz Gamma for active recall */
  preferGamma: boolean
  lessonText: string
  style: StudyLearningStyle
}

export interface StudySession extends StudySessionConfig {
  id: string
  generated: StudyGenerationResult | null
  voiceMode: StudyVoiceMode
  listenMode: StudyListenMode
  /** Frequency bus volume 0–1 (maps −36…−12 dBFS) */
  frequencyLevel: number
  createdAt: number
}

export function createDefaultStudySession(): StudySession {
  return {
    id: `study_${Date.now().toString(36)}`,
    language: 'en',
    subject: '',
    age: 16,
    outputDevice: 'headphones',
    preferGamma: false,
    lessonText: '',
    style: 'activeRecall',
    generated: null,
    voiceMode: 'narrator',
    listenMode: 'conscious',
    frequencyLevel: 0.45,
    createdAt: Date.now(),
  }
}
