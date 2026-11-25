/**
 * Subliminal Study — highlight extraction, multi-style script synthesis, flash quiz.
 * Client-side architect (swap body for a remote LLM when an API key is bound).
 */

import {
  ageBandFromAge,
  type StudyGenerationResult,
  type StudyHighlight,
  type StudyLanguageCode,
  type StudyLearningStyle,
  type StudyQuizItem,
  type StudySessionConfig,
} from '../types/study'

export interface StudyGenerateInput extends StudySessionConfig {}

function sentencesFrom(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?。！？])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12)
}

function scoreSentence(s: string): number {
  let score = Math.min(40, s.length / 4)
  if (/\d/.test(s)) score += 12
  if (/=|→|:|::|≈|∑|∫|√|%/.test(s)) score += 18
  if (/\b(is|are|means|defined|formula|law|theorem|because|therefore)\b/i.test(s)) score += 10
  if (/\b(important|key|must|always|never|exam|remember)\b/i.test(s)) score += 8
  return score
}

function classifyKind(s: string): StudyHighlight['kind'] {
  if (/=|→|≈|∑|∫|√|formula/i.test(s)) return 'formula'
  if (/\b(is|are|means|defined as|refers to)\b/i.test(s)) return 'definition'
  return 'fact'
}

function extractHighlights(text: string, max = 7): StudyHighlight[] {
  const scored = sentencesFrom(text)
    .map((textLine) => ({ text: textLine, score: scoreSentence(textLine) }))
    .sort((a, b) => b.score - a.score)

  const picks: StudyHighlight[] = []
  const seen = new Set<string>()
  for (const row of scored) {
    const key = row.text.slice(0, 48).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    picks.push({
      id: `hl_${picks.length + 1}`,
      text: row.text.length > 180 ? `${row.text.slice(0, 177)}…` : row.text,
      kind: classifyKind(row.text),
    })
    if (picks.length >= max) break
  }

  if (picks.length === 0) {
    const fallback = text.trim().slice(0, 160) || 'Add lesson text to extract highlights.'
    picks.push({ id: 'hl_1', text: fallback, kind: 'fact' })
  }
  return picks
}

function ageTone(age: number): { address: string; pace: string } {
  const band = ageBandFromAge(age)
  if (band === 'child') {
    return { address: 'young explorer', pace: 'slow, warm, and encouraging' }
  }
  if (band === 'youth') {
    return { address: 'learner', pace: 'clear, energetic, and precise' }
  }
  return { address: 'student', pace: 'concise, adult, and retention-focused' }
}

function langNote(language: StudyLanguageCode): string {
  const map: Record<StudyLanguageCode, string> = {
    en: 'English',
    sr: 'Serbian',
    de: 'German',
    fr: 'French',
    es: 'Spanish',
    it: 'Italian',
    pt: 'Portuguese',
    hi: 'Hindi',
    ur: 'Urdu',
    ar: 'Arabic',
    ja: 'Japanese',
    zh: 'Chinese',
  }
  return map[language]
}

function topFacts(highlights: StudyHighlight[], n: number): string[] {
  return highlights.slice(0, n).map((h) => h.text.replace(/\s+/g, ' ').trim())
}

function buildActiveRecall(facts: string[], subject: string, age: number): string {
  const { address, pace } = ageTone(age)
  const stems = [
    'In one sentence, what is the core idea of',
    'Why does this matter for',
    'Name the key term or formula in',
    'How would you explain this piece of',
    'What should you recall first from',
  ]
  const lines: string[] = [
    `Active Recall · ${subject || 'Lesson'} · for a ${address} (${pace}).`,
    '',
  ]
  facts.forEach((f, i) => {
    const short = f.length > 110 ? `${f.slice(0, 107)}…` : f
    const cue = short.slice(0, 42).replace(/[.!?]+$/g, '')
    const stem = stems[i % stems.length]
    lines.push(`Q${i + 1}. ${stem} “${cue}…”?`)
    lines.push('[3s PAUSE]')
    lines.push(`A${i + 1}. ${short}`)
    lines.push('')
  })
  lines.push('Close your eyes and replay each answer once more.')
  return lines.join('\n')
}

function buildRhyme(facts: string[], subject: string): string {
  const lines = [`Rhyme & Cadence · ${subject || 'Lesson'}`, '']
  facts.forEach((f, i) => {
    const core = f.replace(/[.!?]+$/g, '')
    const a = core.slice(0, Math.min(42, core.length))
    const b = core.slice(Math.min(42, core.length), Math.min(84, core.length)) || 'hold it clear and true'
    lines.push(`${i + 1}. ${a} —`)
    lines.push(`   ${b || 'keep the meaning shining through'}.`)
    lines.push('')
  })
  lines.push('Repeat the cadence twice; let the rhyme lock the list.')
  return lines.join('\n')
}

function buildSong(facts: string[], subject: string): string {
  const hook = (subject || 'this lesson').slice(0, 28)
  const lines = [
    `Song / Chant · ${subject || 'Lesson'}`,
    '',
    `♪ Hook: Learn it, keep it, sing ${hook} —`,
    '♪ Hook: Fact by fact until it stays.',
    '',
  ]
  facts.forEach((f, i) => {
    lines.push(`Verse ${i + 1}: ${f.slice(0, 120)}`)
    lines.push('♪ Refrain: Learn it, keep it, sing it through.')
    lines.push('')
  })
  return lines.join('\n')
}

function buildPodcast(facts: string[], subject: string, age: number): string {
  const { address } = ageTone(age)
  const lines = [
    `Podcast Dialogue · ${subject || 'Lesson'}`,
    '',
    `[Host] Welcome back. Today we unpack ${subject || 'our lesson'} for every ${address}.`,
    `[Mentor] Let's make it stick — short turns, clear answers.`,
    '',
  ]
  facts.forEach((f, i) => {
    lines.push(`[Host] Point ${i + 1} — what's the takeaway?`)
    lines.push(`[Mentor] ${f}`)
    lines.push(`[Host] Got it. Next.`)
    lines.push('')
  })
  lines.push(`[Mentor] Recap once more tonight — that's how it embeds.`)
  lines.push(`[Host] Thanks for studying with us.`)
  return lines.join('\n')
}

function buildMemoryPalace(facts: string[], subject: string): string {
  const rooms = ['entry hall', 'sunlit library', 'spiral stair', 'observatory', 'quiet vault', 'garden door', 'mirror gallery', 'rooftop path']
  const lines = [
    `Memory Palace · ${subject || 'Lesson'}`,
    '',
    'You open a familiar door. Each room holds one idea.',
    '',
  ]
  facts.forEach((f, i) => {
    const room = rooms[i % rooms.length]
    lines.push(`In the ${room}, you place: ${f}`)
    lines.push('Touch the object once, then walk on.')
    lines.push('')
  })
  lines.push('Walk the path backward once — each room returns its fact.')
  return lines.join('\n')
}

function buildAnalogy(facts: string[], subject: string, age: number): string {
  const { address, pace } = ageTone(age)
  const lines = [
    `Simple Analogy (ELI5) · ${subject || 'Lesson'} · ${pace}`,
    '',
    `Imagine explaining ${subject || 'this topic'} to a ${address} with one clear picture.`,
    '',
  ]
  facts.forEach((f, i) => {
    lines.push(`Picture ${i + 1}: ${f}`)
    lines.push(`In everyday terms: it's like stacking building blocks — each piece supports the next.`)
    lines.push('')
  })
  lines.push('If you can retell the picture, you own the concept.')
  return lines.join('\n')
}

function buildScript(
  style: StudyLearningStyle,
  facts: string[],
  subject: string,
  age: number,
  language: StudyLanguageCode,
): string {
  let body: string
  switch (style) {
    case 'activeRecall':
      body = buildActiveRecall(facts, subject, age)
      break
    case 'rhyme':
      body = buildRhyme(facts, subject)
      break
    case 'song':
      body = buildSong(facts, subject)
      break
    case 'podcast':
      body = buildPodcast(facts, subject, age)
      break
    case 'memoryPalace':
      body = buildMemoryPalace(facts, subject)
      break
    case 'analogy':
    default:
      body = buildAnalogy(facts, subject, age)
      break
  }
  const header = `Language: ${langNote(language)} · Age ${age}\n`
  return `${header}${body}`
}

function buildQuiz(facts: string[]): StudyQuizItem[] {
  const items: StudyQuizItem[] = []
  for (let i = 0; i < Math.min(5, facts.length); i++) {
    const f = facts[i]!
    items.push({
      id: `qz_${i + 1}`,
      question: `Recall: what is the key idea in — “${f.slice(0, 70)}${f.length > 70 ? '…' : ''}”?`,
      answer: f,
    })
  }
  while (items.length < 5 && facts[0]) {
    const f = facts[0]
    items.push({
      id: `qz_${items.length + 1}`,
      question: `Self-test ${items.length + 1}: restate the main lesson in one sentence.`,
      answer: f,
    })
  }
  if (items.length === 0) {
    items.push({
      id: 'qz_1',
      question: 'What is one fact you can teach someone else from this lesson?',
      answer: 'Review your notes and pick the clearest sentence.',
    })
  }
  return items.slice(0, 5)
}

/** Generate highlights, styled study script, and flash quiz from lesson text. */
export async function generateStudyLesson(
  input: StudyGenerateInput,
): Promise<StudyGenerationResult> {
  const text = input.lessonText.trim()
  if (!text) {
    throw new Error('Add or scan lesson text before generating.')
  }

  // Yield to UI (feels async; ready for remote LLM swap)
  await new Promise((r) => setTimeout(r, 280))

  const keyHighlights = extractHighlights(text, 8)
  const facts = topFacts(keyHighlights, 8)
  const studyScript = buildScript(
    input.style,
    facts,
    input.subject.trim() || 'General studies',
    input.age,
    input.language,
  )
  const flashQuiz = buildQuiz(facts)

  return { keyHighlights, studyScript, flashQuiz }
}
