/** Saved Mixes — completed Create sessions persisted locally */

import type { CreateSession } from './studio'

export interface SavedMix {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  session: CreateSession
}

export interface SavedMixStore {
  version: 1
  mixes: SavedMix[]
}

export function newSavedMixId(): string {
  return `mix_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
