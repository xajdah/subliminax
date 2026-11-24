/**
 * AI Subliminal Script Generator
 * Client-side architect that weaves intake answers into Short / Medium / Long
 * formats using subconscious phrasing principles. Swap `generateSubliminalScripts`
 * body for a remote LLM route when an API key is bound.
 */

export interface ScriptIntake {
  feeling: string
  facing: string
  achieve: string
}

export type ScriptFormat = 'short' | 'medium' | 'long'

export interface GeneratedScripts {
  short: string
  medium: string
  long: string
}

export const NARRATOR_WORD_LIMIT = 100
export const NARRATOR_CONDENSE_TARGET = 95

export function countWords(text: string): number {
  const t = text.trim()
  if (!t) return 0
  return t.split(/\s+/).filter(Boolean).length
}

function cleanPhrase(raw: string, fallback: string): string {
  const t = raw.trim().replace(/\s+/g, ' ')
  if (!t) return fallback
  return t.replace(/[.!?]+$/g, '').trim()
}

function softLabel(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\bi am\b/gi, '')
    .replace(/\bi feel\b/gi, '')
    .replace(/\bfeeling\b/gi, '')
    .trim()
}

/** Strip common negative framing into positive residue where possible */
function positivize(text: string): string {
  return text
    .replace(/\bnot\s+stuck\b/gi, 'free to move')
    .replace(/\bcan't\b/gi, 'can')
    .replace(/\bcannot\b/gi, 'can')
    .replace(/\bwon't\b/gi, 'will')
    .replace(/\bnever\b/gi, 'always open to')
    .replace(/\banxious\b/gi, 'settling into calm')
    .replace(/\bstuck\b/gi, 'opening')
    .replace(/\bunmotivated\b/gi, 'gathering steady energy')
}

function trimToWordBudget(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return text.trim()
  let cut = words.slice(0, maxWords).join(' ')
  // Prefer ending on a sentence boundary when possible
  const lastStop = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'))
  if (lastStop > cut.length * 0.55) cut = cut.slice(0, lastStop + 1)
  else if (!/[.!?]$/.test(cut)) cut = `${cut}.`
  return cut.trim()
}

function padToMinWords(text: string, minWords: number, pads: string[]): string {
  let out = text.trim()
  let i = 0
  while (countWords(out) < minWords && i < pads.length * 4) {
    out = `${out} ${pads[i % pads.length]}`
    i++
  }
  return out.trim()
}

/**
 * Generate three subliminal script formats from the guided intake.
 * Present tense · positive framing · I am / You are reinforcement · sensory anchors.
 */
export async function generateSubliminalScripts(intake: ScriptIntake): Promise<GeneratedScripts> {
  // Soft async so UI can show a loading state (and so a future fetch can drop in here)
  await new Promise((r) => setTimeout(r, 520))

  const feeling = positivize(cleanPhrase(intake.feeling, 'a quiet readiness'))
  const facing = positivize(cleanPhrase(intake.facing, 'this moment of change'))
  const achieve = positivize(cleanPhrase(intake.achieve, 'calm confident clarity'))

  const feelSoft = softLabel(feeling)
  const faceSoft = softLabel(facing)
  const goalSoft = softLabel(achieve)

  const shortCore = [
    `I am grounded. I am safe. I am open.`,
    `You are settling. You are clear. You are becoming ${goalSoft}.`,
    `I breathe warmth into my chest. I release ${faceSoft}.`,
    `I am ${feelSoft} transforming into calm strength.`,
    `You are here. You are enough. You are rising.`,
    `I am aligned. I am focused. I am free.`,
  ].join(' ')

  const mediumCore = [
    `I am present in my body, feeling the floor hold me as I breathe slowly and fully.`,
    `Where I once met ${faceSoft}, I now meet soft space and choice.`,
    `I am releasing the weight of ${feelSoft} with every exhale.`,
    `You are safe to open. You are worthy of ${goalSoft}.`,
    `I see myself already living as someone who embodies ${goalSoft} with ease.`,
    `Warm light fills my chest. My mind is clear. My voice is steady.`,
    `I am becoming ${goalSoft} now. You are becoming ${goalSoft} now.`,
    `This feeling settles into quiet confidence that stays with me.`,
  ].join(' ')

  const longCore = [
    `I close my eyes and feel the air cool at my nostrils, warm as it leaves.`,
    `With each breath I sink a little deeper into calm awareness.`,
    `I notice ${feelSoft} as sensation only — waves that soften as I watch them.`,
    `I am safe in this body. You are safe in this body.`,
    `The story of ${faceSoft} loosens its grip; I thank it and let it drift behind me.`,
    `In its place, a clear pathway opens toward ${goalSoft}.`,
    `I walk that path now. My shoulders drop. My jaw softens. My heart expands.`,
    `I am the person who lives ${goalSoft} in ordinary moments — speaking, resting, choosing.`,
    `You are already that person. You feel it in your hands, your breath, your spine.`,
    `I install this belief gently: I am capable. I am calm. I am becoming.`,
    `Future me turns, smiles, and says: you made it here by trusting this feeling.`,
    `I carry that smile forward. Every cell remembers ease.`,
    `I am aligned with ${goalSoft}. You are aligned with ${goalSoft}.`,
    `Peace is my default. Clarity is my language. Confidence is my rhythm.`,
    `I return to the room refreshed, steady, and quietly powerful.`,
  ].join(' ')

  const shortPads = [
    'I am calm.',
    'You are calm.',
    'I am clear.',
    'You are clear.',
    'I am rising.',
  ]
  const mediumPads = [
    'I am rooted in this breath.',
    'You are held by this moment.',
    'I choose ease again.',
  ]
  const longPads = [
    'I deepen into trust with every heartbeat.',
    'You deepen into trust with every heartbeat.',
    'This new identity settles into my nervous system as familiar truth.',
  ]

  let short = padToMinWords(shortCore, 45, shortPads)
  short = trimToWordBudget(short, 60)

  let medium = padToMinWords(mediumCore, 85, mediumPads)
  medium = trimToWordBudget(medium, 95)

  let long = padToMinWords(longCore, 200, longPads)
  long = trimToWordBudget(long, 250)

  // Guarantee medium stays under narrator hard cap
  if (countWords(medium) > NARRATOR_WORD_LIMIT) {
    medium = trimToWordBudget(medium, NARRATOR_CONDENSE_TARGET)
  }

  return { short, medium, long }
}

/** Trim / summarize active script to ≤ target words for Narrator TTS. */
export function condenseScriptToLimit(
  text: string,
  target = NARRATOR_CONDENSE_TARGET,
): string {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length <= target) return text.trim()

  // Prefer keeping I am / You are lines
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const priority = sentences.filter((s) => /\b(I am|You are|I feel|You feel)\b/i.test(s))
  const rest = sentences.filter((s) => !priority.includes(s))
  const ordered = [...priority, ...rest]

  const kept: string[] = []
  let total = 0
  for (const s of ordered) {
    const w = countWords(s)
    if (total + w > target) continue
    kept.push(s)
    total += w
  }

  if (kept.length === 0) return trimToWordBudget(text, target)

  // Re-order roughly by original appearance
  kept.sort((a, b) => text.indexOf(a) - text.indexOf(b))
  let out = kept.join(' ')
  if (countWords(out) > target) out = trimToWordBudget(out, target)
  return out
}
