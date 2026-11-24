import { listAureviaLetters } from './aureviaStorage'

const SKIP = new Set([
  'that', 'this', 'with', 'from', 'have', 'were', 'been', 'they', 'them', 'your', 'you',
  'and', 'the', 'was', 'for', 'are', 'but', 'not', 'what', 'when', 'into', 'about',
  'shown', 'show', 'already', 'ready', 'next', 'true', 'step', 'myself', 'itself',
])

function wordsOf(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z']{3,}/g) ?? []).filter((word) => !SKIP.has(word))
}

/** One line made only from letters the person has kept. */
export function letterOracle(): string | null {
  const letters = listAureviaLetters()
  if (letters.length < 3) return null

  const nights = new Map<string, Set<string>>()
  for (const letter of letters) {
    const night = letter.createdAt.slice(0, 10)
    for (const word of new Set(wordsOf(letter.letter))) {
      const bag = nights.get(word) ?? new Set<string>()
      bag.add(night)
      nights.set(word, bag)
    }
  }

  const repeated = [...nights.entries()]
    .filter(([, days]) => days.size >= 2)
    .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([word]) => word)

  const chosen =
    repeated.length > 0
      ? repeated
      : [...new Set(letters.flatMap((letter) => wordsOf(letter.letter)))].slice(0, 3)

  if (chosen.length === 0) return null
  const nightCount = new Set(letters.map((letter) => letter.createdAt.slice(0, 10))).size
  const span = nightCount === 1 ? 'one night' : `${nightCount} nights`
  return `You wrote this across ${span}: ${chosen.join(', ')}.`
}
