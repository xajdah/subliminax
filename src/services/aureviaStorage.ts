import type { AureviaPathId } from '../data/aureviaPhases'

export interface AureviaLetter {
  id: string
  question: string
  letter: string
  spoken: string
  path: AureviaPathId
  createdAt: string
}

const STORAGE_KEY = 'subliminax.aurevia.v1'

function read(): AureviaLetter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (row): row is AureviaLetter =>
        !!row &&
        typeof row === 'object' &&
        typeof (row as AureviaLetter).id === 'string' &&
        typeof (row as AureviaLetter).letter === 'string',
    )
  } catch {
    return []
  }
}

function write(letters: AureviaLetter[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(letters))
}

export function listAureviaLetters(): AureviaLetter[] {
  return read().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function saveAureviaLetter(
  input: Omit<AureviaLetter, 'id' | 'createdAt'>,
): AureviaLetter {
  const letter: AureviaLetter = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  const next = [letter, ...read()]
  write(next)
  return letter
}
