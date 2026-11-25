/**
 * Persist Account & Neuro-Profile Hub state in localStorage.
 * Exposes getUserVoiceSampleUrl() for Studio / Study / REMscribe.
 */

import {
  createDefaultAccountStore,
  type AccountPreferences,
  type AccountProfile,
  type AccountStore,
  type ListeningCategory,
  type MatrixCard,
  type PlanTier,
  type TrackListenRecord,
} from '../types/account'

const STORAGE_KEY = 'subliminax.account.v1'
const VOICE_DB = 'subliminax.voice.v1'
const VOICE_STORE = 'samples'
const VOICE_KEY = 'master'

type Listener = (store: AccountStore) => void
const listeners = new Set<Listener>()

/** Live object URL for the master voice WAV (session + after IDB hydrate). */
let liveVoiceUrl: string | null = null

function openVoiceDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(VOICE_DB, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(VOICE_STORE)) db.createObjectStore(VOICE_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbPutVoice(blob: Blob): Promise<void> {
  const db = await openVoiceDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(VOICE_STORE, 'readwrite')
    tx.objectStore(VOICE_STORE).put(blob, VOICE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

async function idbGetVoice(): Promise<Blob | null> {
  try {
    const db = await openVoiceDb()
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(VOICE_STORE, 'readonly')
      const req = tx.objectStore(VOICE_STORE).get(VOICE_KEY)
      req.onsuccess = () => resolve((req.result as Blob) ?? null)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return blob
  } catch {
    return null
  }
}

async function idbClearVoice(): Promise<void> {
  try {
    const db = await openVoiceDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(VOICE_STORE, 'readwrite')
      tx.objectStore(VOICE_STORE).delete(VOICE_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    /* noop */
  }
}

function revokeLiveVoice() {
  if (liveVoiceUrl?.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(liveVoiceUrl)
    } catch {
      /* noop */
    }
  }
  liveVoiceUrl = null
}

function dayKey(ts = Date.now()): string {
  return new Date(ts).toISOString().slice(0, 10)
}

function readStore(): AccountStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultAccountStore()
    const parsed = JSON.parse(raw) as AccountStore
    if (!parsed || parsed.version !== 1) return createDefaultAccountStore()
    return {
      ...createDefaultAccountStore(),
      ...parsed,
      profile: { ...createDefaultAccountStore().profile, ...parsed.profile },
      preferences: { ...createDefaultAccountStore().preferences, ...parsed.preferences },
      modeHours: { ...createDefaultAccountStore().modeHours, ...parsed.modeHours },
      subscription: { ...createDefaultAccountStore().subscription, ...parsed.subscription },
      trackHistory: Array.isArray(parsed.trackHistory) ? parsed.trackHistory : [],
      matrixCards: Array.isArray(parsed.matrixCards) ? parsed.matrixCards : [],
    }
  } catch {
    return createDefaultAccountStore()
  }
}

function writeStore(store: AccountStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  listeners.forEach((fn) => fn(withLiveVoice(structuredClone(store))))
}

function bumpStreak(store: AccountStore): AccountStore {
  const today = dayKey()
  if (store.lastActiveDay === today) return store
  const yesterday = dayKey(Date.now() - 86400000)
  const nextStreak =
    store.lastActiveDay === yesterday ? store.dailyStreak + 1 : store.dailyStreak > 0 ? 1 : 1
  return { ...store, dailyStreak: Math.max(1, nextStreak), lastActiveDay: today }
}

/** Global voice sample URL for Studio, Subliminal Study, and REMscribe. */
export function getUserVoiceSampleUrl(): string | null {
  if (liveVoiceUrl) return liveVoiceUrl
  const url = readStore().profile.userVoiceSampleUrl
  if (!url || url === 'idb:master' || url.startsWith('blob:')) return null
  return url
}

function withLiveVoice(store: AccountStore): AccountStore {
  if (!liveVoiceUrl) return store
  return {
    ...store,
    profile: { ...store.profile, userVoiceSampleUrl: liveVoiceUrl },
  }
}

export const accountStorage = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn)
    fn(withLiveVoice(readStore()))
    return () => {
      listeners.delete(fn)
    }
  },

  get(): AccountStore {
    return withLiveVoice(readStore())
  },

  updateProfile(patch: Partial<AccountProfile>) {
    const store = readStore()
    store.profile = { ...store.profile, ...patch }
    writeStore(store)
  },

  updatePreferences(patch: Partial<AccountPreferences>) {
    const store = readStore()
    store.preferences = { ...store.preferences, ...patch }
    writeStore(store)
  },

  async setVoiceSample(blob: Blob, durationSec: number) {
    const store = readStore()
    revokeLiveVoice()
    const url = URL.createObjectURL(blob)
    liveVoiceUrl = url
    try {
      await idbPutVoice(blob)
    } catch {
      /* quota / private mode — keep session URL only */
    }
    // Persist a stable marker — live blob URL stays in memory / getUserVoiceSampleUrl()
    store.profile.userVoiceSampleUrl = 'idb:master'
    store.profile.voiceSampleCalibratedAt = Date.now()
    store.profile.voiceSampleDurationSec = durationSec
    store.subscription.voiceCloneUsed = Math.min(
      store.subscription.voiceCloneSlots,
      Math.max(1, store.subscription.voiceCloneUsed),
    )
    writeStore(store)
  },

  async clearVoiceSample() {
    const store = readStore()
    revokeLiveVoice()
    await idbClearVoice()
    store.profile.userVoiceSampleUrl = null
    store.profile.voiceSampleCalibratedAt = null
    store.profile.voiceSampleDurationSec = null
    writeStore(store)
  },

  /** Restore WAV object URL from IndexedDB after reload. */
  async hydrateVoiceSample() {
    const store = readStore()
    if (!store.profile.voiceSampleCalibratedAt && store.profile.userVoiceSampleUrl !== 'idb:master') {
      return
    }
    if (liveVoiceUrl) return
    const blob = await idbGetVoice()
    if (!blob) {
      if (
        store.profile.userVoiceSampleUrl?.startsWith('blob:') ||
        store.profile.userVoiceSampleUrl === 'idb:master'
      ) {
        store.profile.userVoiceSampleUrl = null
        store.profile.voiceSampleCalibratedAt = null
        writeStore(store)
      }
      return
    }
    liveVoiceUrl = URL.createObjectURL(blob)
    listeners.forEach((fn) =>
      fn({
        ...structuredClone(store),
        profile: { ...store.profile, userVoiceSampleUrl: liveVoiceUrl },
      }),
    )
  },

  logListening(opts: {
    seconds: number
    category: ListeningCategory
    trackTitle: string
    mixId?: string
  }) {
    let store = bumpStreak(readStore())
    const hours = Math.max(0, opts.seconds) / 3600
    if (opts.category === 'manifestation') store.modeHours.manifestation += hours
    else if (opts.category === 'remscribe') store.modeHours.remscribe += hours
    else if (opts.category === 'focusShield') store.modeHours.focusShield += hours
    else if (opts.category === 'study') store.modeHours.study += hours

    const existing = store.trackHistory.find(
      (t) => t.trackTitle === opts.trackTitle && t.category === opts.category,
    )
    if (existing) {
      existing.totalSeconds += opts.seconds
      existing.lastSessionAt = Date.now()
      if (opts.mixId) existing.mixId = opts.mixId
    } else {
      const row: TrackListenRecord = {
        id: `trk_${Date.now().toString(36)}`,
        trackTitle: opts.trackTitle,
        category: opts.category,
        totalSeconds: opts.seconds,
        lastSessionAt: Date.now(),
        mixId: opts.mixId,
      }
      store.trackHistory.unshift(row)
    }
    store.trackHistory = store.trackHistory.slice(0, 120)
    writeStore(store)
  },

  upsertMatrixCard(card: MatrixCard) {
    const store = readStore()
    const i = store.matrixCards.findIndex((c) => c.id === card.id)
    if (i >= 0) store.matrixCards[i] = card
    else store.matrixCards.unshift(card)
    writeStore(store)
  },

  removeMatrixCard(id: string) {
    const store = readStore()
    store.matrixCards = store.matrixCards.filter((c) => c.id !== id)
    writeStore(store)
  },

  setPlan(tier: PlanTier) {
    const store = readStore()
    const limits =
      tier === 'studio'
        ? { voiceCloneSlots: 5, aiGenerationsPerMonth: 500, cloudTrackMb: 5000 }
        : tier === 'pro'
          ? { voiceCloneSlots: 3, aiGenerationsPerMonth: 120, cloudTrackMb: 1000 }
          : { voiceCloneSlots: 1, aiGenerationsPerMonth: 20, cloudTrackMb: 100 }
    store.subscription = {
      ...store.subscription,
      ...limits,
      tier,
      renewalAt: tier === 'free' ? null : Date.now() + 30 * 86400000,
    }
    writeStore(store)
  },

  /** Seed light demo telemetry once so Analytics isn’t an empty shell. */
  ensureDemoTelemetry() {
    const store = readStore()
    if (store.trackHistory.length > 0 || totalMode(store) > 0) return
    store.modeHours = {
      manifestation: 4.2,
      remscribe: 11.5,
      focusShield: 2.1,
      study: 1.4,
    }
    store.dailyStreak = 3
    store.lastActiveDay = dayKey()
    store.trackHistory = [
      {
        id: 'demo_1',
        trackTitle: 'Tranquility · Clarity',
        category: 'manifestation',
        totalSeconds: 5400,
        lastSessionAt: Date.now() - 86400000,
      },
      {
        id: 'demo_2',
        trackTitle: 'REMscribe · 7h night',
        category: 'remscribe',
        totalSeconds: 25200,
        lastSessionAt: Date.now() - 3600000,
      },
      {
        id: 'demo_3',
        trackTitle: 'Study · Biology',
        category: 'study',
        totalSeconds: 2400,
        lastSessionAt: Date.now() - 7200000,
      },
    ]
    if (store.matrixCards.length === 0) {
      store.matrixCards = [
        {
          id: 'mc_demo',
          title: 'Morning Focus DNA',
          blurb: 'Sample Matrix Card — SMR bed + clarity affirmations',
          accent: '#14b8a6',
          createdAt: Date.now() - 86400000 * 3,
          source: 'sonicDna',
        },
      ]
    }
    writeStore(store)
  },
}

function totalMode(store: AccountStore) {
  const m = store.modeHours
  return m.manifestation + m.remscribe + m.focusShield + m.study
}
