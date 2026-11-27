/**
 * Local persistence for completed subliminal mixes (Saved Tracks).
 * Session config only — recorded mic blobs are not stored across reloads.
 */

import { getIssue } from '../data/issues'
import { getTrack } from '../data/moodTracks'
import { newSavedMixId, type SavedMix, type SavedMixStore } from '../types/savedMix'
import type { CreateSession } from '../types/studio'

const STORAGE_KEY = 'subliminax.savedMixes.v1'
/** Last create snapshot — used by REMscribe for affirmation hints */
export const LAST_CREATE_SESSION_KEY = 'subliminax.createSession.v1'

const EMPTY: SavedMixStore = { version: 1, mixes: [] }

function readStore(): SavedMixStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(EMPTY)
    const parsed = JSON.parse(raw) as SavedMixStore
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.mixes)) {
      return structuredClone(EMPTY)
    }
    return { version: 1, mixes: parsed.mixes }
  } catch {
    return structuredClone(EMPTY)
  }
}

function writeStore(store: SavedMixStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

type Listener = (mixes: SavedMix[]) => void
const listeners = new Set<Listener>()

function emit() {
  const mixes = readStore().mixes
  listeners.forEach((fn) => fn(mixes))
}

export function titleForSession(session: CreateSession): string {
  const custom = session.custom.name.trim()
  if (custom) return custom
  if (session.issueId) {
    const issue = getIssue(session.issueId)
    if (issue?.label) return issue.label
  }
  const track = getTrack(session.soundtrack.trackId)
  if (track?.name) return track.name
  return 'Untitled Mix'
}

export function writeLastCreateSession(session: CreateSession) {
  try {
    localStorage.setItem(LAST_CREATE_SESSION_KEY, JSON.stringify(session))
  } catch {
    /* quota / private mode */
  }
}

export const savedMixStorage = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn)
    fn(readStore().mixes)
    return () => {
      listeners.delete(fn)
    }
  },

  list(): SavedMix[] {
    return readStore().mixes
  },

  get(id: string): SavedMix | undefined {
    return readStore().mixes.find((m) => m.id === id)
  },

  /** Insert or update a completed mix. Returns the saved record. */
  save(opts: {
    id?: string
    title?: string
    session: CreateSession
  }): SavedMix {
    const store = readStore()
    const now = Date.now()
    const session: CreateSession = {
      ...structuredClone(opts.session),
      completed: true,
      step: 'mix',
    }
    const title = (opts.title?.trim() || titleForSession(session)).slice(0, 120)
    const existingIdx = opts.id ? store.mixes.findIndex((m) => m.id === opts.id) : -1

    let mix: SavedMix
    if (existingIdx >= 0) {
      const prev = store.mixes[existingIdx]!
      mix = {
        ...prev,
        title,
        updatedAt: now,
        session,
      }
      store.mixes[existingIdx] = mix
    } else {
      mix = {
        id: opts.id ?? newSavedMixId(),
        title,
        createdAt: now,
        updatedAt: now,
        session,
      }
      store.mixes.unshift(mix)
    }

    // Cap library size
    store.mixes = store.mixes.slice(0, 80)
    writeStore(store)
    writeLastCreateSession(session)
    emit()
    return mix
  },

  rename(id: string, title: string) {
    const store = readStore()
    const i = store.mixes.findIndex((m) => m.id === id)
    if (i < 0) return
    store.mixes[i] = {
      ...store.mixes[i]!,
      title: title.trim().slice(0, 120) || store.mixes[i]!.title,
      updatedAt: Date.now(),
    }
    writeStore(store)
    emit()
  },

  remove(id: string) {
    const store = readStore()
    store.mixes = store.mixes.filter((m) => m.id !== id)
    writeStore(store)
    emit()
  },

  /** Duplicate a mix as a new Saved Track (copy). */
  clone(id: string): SavedMix | undefined {
    const src = this.get(id)
    if (!src) return undefined
    const base = src.title.replace(/\s*\(copy(?:\s+\d+)?\)\s*$/i, '').trim() || 'Untitled Mix'
    const siblings = this.list().filter((m) => m.title === base || m.title.startsWith(`${base} (copy`))
    const title =
      siblings.length <= 1 ? `${base} (copy)` : `${base} (copy ${siblings.length})`
    return this.save({
      title,
      session: structuredClone(src.session),
    })
  },
}
