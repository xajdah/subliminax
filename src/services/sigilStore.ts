const KEY = 'subliminax.sigil.v1'

export function sigilStrokes(): number {
  try {
    const n = Number(localStorage.getItem(KEY) ?? '0')
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  } catch {
    return 0
  }
}

export function addSigilStroke(): number {
  const next = sigilStrokes() + 1
  localStorage.setItem(KEY, String(next))
  return next
}
