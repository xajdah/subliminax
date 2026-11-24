export interface DreamLetter {
  id: string
  image: string
  seen: string
  createdAt: string
  answeredAt: string | null
}

const KEY = 'subliminax.dreams.v1'

function localDay(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function read(): DreamLetter[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (row): row is DreamLetter =>
        !!row &&
        typeof row === 'object' &&
        typeof (row as DreamLetter).id === 'string' &&
        typeof (row as DreamLetter).image === 'string',
    )
  } catch {
    return []
  }
}

function write(rows: DreamLetter[]) {
  localStorage.setItem(KEY, JSON.stringify(rows))
}

export function listDreamLetters(): DreamLetter[] {
  return read().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function saveDreamLetter(image: string): DreamLetter {
  const letter: DreamLetter = {
    id: crypto.randomUUID(),
    image: image.trim() || 'Show me the room where I feel free.',
    seen: '',
    createdAt: new Date().toISOString(),
    answeredAt: null,
  }
  write([letter, ...read()])
  return letter
}

export function morningDream(now = new Date()): DreamLetter | null {
  const today = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
  return (
    read().find((row) => !row.answeredAt && localDay(row.createdAt) !== today) ?? null
  )
}

export function answerDream(id: string, seen: string): DreamLetter | null {
  const text = seen.trim()
  if (!text) return null
  let updated: DreamLetter | null = null
  const next = read().map((row) => {
    if (row.id !== id || row.answeredAt) return row
    updated = { ...row, seen: text, answeredAt: new Date().toISOString() }
    return updated
  })
  if (!updated) return null
  write(next)
  return updated
}

export function latestDreamSeen(): string | null {
  const row = read().find((item) => item.seen.trim())
  return row?.seen ?? null
}
