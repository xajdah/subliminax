/**
 * Persist REMscribe session reports (metadata) in localStorage.
 * Audio clip object URLs are session-local; transcripts & metrics persist.
 */

import type { RemScribeSession } from '../types/remscribe'

const KEY = 'subliminax.remscribe.sessions.v1'

type Listener = (sessions: RemScribeSession[]) => void
const listeners = new Set<Listener>()

function read(): RemScribeSession[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RemScribeSession[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(sessions: RemScribeSession[]) {
  // Strip ephemeral blob URLs before persist (they won't survive reload)
  const sanitized = sessions.map((s) => ({
    ...s,
    events: s.events.map((e) => ({
      ...e,
      clipUrl: e.clipUrl?.startsWith('blob:') ? undefined : e.clipUrl,
    })),
    dreams: s.dreams.map((d) => ({
      ...d,
      clipUrl: d.clipUrl?.startsWith('blob:') ? undefined : d.clipUrl,
    })),
  }))
  localStorage.setItem(KEY, JSON.stringify(sanitized.slice(0, 40)))
  listeners.forEach((fn) => fn(read()))
}

export const remscribeStorage = {
  subscribe(fn: Listener) {
    listeners.add(fn)
    fn(read())
    return () => listeners.delete(fn)
  },
  list(): RemScribeSession[] {
    return read()
  },
  get(id: string) {
    return read().find((s) => s.id === id) ?? null
  },
  upsert(session: RemScribeSession) {
    const all = read()
    const i = all.findIndex((s) => s.id === session.id)
    if (i >= 0) all[i] = session
    else all.unshift(session)
    write(all)
  },
  remove(id: string) {
    write(read().filter((s) => s.id !== id))
  },
}
