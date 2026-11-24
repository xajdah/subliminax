/**
 * Local persistence for Vision Boards.
 * Goals + progress in localStorage; images stored as compressed data URLs.
 */

import type { ProgressEntry, VisionBoardStore, VisionGoal } from '../types/visionBoard'
import { captureLocalDateMeta, newId } from '../types/visionBoard'

const STORAGE_KEY = 'subliminax.visionBoard.v1'

const EMPTY: VisionBoardStore = { goals: [], progress: [], version: 1 }

function readStore(): VisionBoardStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(EMPTY)
    const parsed = JSON.parse(raw) as VisionBoardStore
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.goals)) {
      return structuredClone(EMPTY)
    }
    return {
      version: 1,
      goals: parsed.goals,
      progress: Array.isArray(parsed.progress) ? parsed.progress : [],
    }
  } catch {
    return structuredClone(EMPTY)
  }
}

function writeStore(store: VisionBoardStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

type Listener = (store: VisionBoardStore) => void
const listeners = new Set<Listener>()

function emit() {
  const snap = readStore()
  listeners.forEach((fn) => fn(snap))
}

export const visionBoardStorage = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn)
    fn(readStore())
    return () => {
      listeners.delete(fn)
    }
  },

  getAll(): VisionBoardStore {
    return readStore()
  },

  upsertGoal(goal: VisionGoal) {
    const store = readStore()
    const i = store.goals.findIndex((g) => g.id === goal.id)
    if (i >= 0) store.goals[i] = goal
    else store.goals.unshift(goal)
    writeStore(store)
    emit()
  },

  deleteGoal(id: string) {
    const store = readStore()
    store.goals = store.goals.filter((g) => g.id !== id)
    store.progress = store.progress.filter((p) => p.goalId !== id)
    writeStore(store)
    emit()
  },

  updateGoal(id: string, patch: Partial<VisionGoal>) {
    const store = readStore()
    const i = store.goals.findIndex((g) => g.id === id)
    if (i < 0) return
    store.goals[i] = { ...store.goals[i]!, ...patch }
    writeStore(store)
    emit()
  },

  addProgress(entry: Omit<ProgressEntry, 'id' | 'timestamp' | 'localDateString' | 'timezone'> & {
    id?: string
  }): ProgressEntry {
    const meta = captureLocalDateMeta()
    const full: ProgressEntry = {
      id: entry.id ?? newId('pe'),
      goalId: entry.goalId,
      timestamp: meta.timestamp,
      localDateString: meta.localDateString,
      timezone: meta.timezone,
      note: entry.note,
      audioNoteUrl: entry.audioNoteUrl,
      audioDurationSec: entry.audioDurationSec,
      attachments: entry.attachments ?? [],
      milestoneScore: Math.min(10, Math.max(1, entry.milestoneScore)),
    }
    const store = readStore()
    store.progress.unshift(full)
    writeStore(store)
    emit()
    return full
  },

  getProgressForGoal(goalId: string): ProgressEntry[] {
    return readStore().progress.filter((p) => p.goalId === goalId)
  },

  clearAll() {
    writeStore(structuredClone(EMPTY))
    emit()
  },
}

/** Resize + JPEG-compress a File into a data URL for durable local storage. */
export async function fileToVisionImage(file: File, maxEdge = 1280, quality = 0.78): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', quality)
}
