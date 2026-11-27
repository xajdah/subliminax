import { useCallback, useRef, useState } from 'react'
import {
  linearGainToDbFs,
  type ManifestationMode,
} from '../audio/manifestationCalibration'
import { mixEngine } from '../audio/MixEngine'
import { psychoEngine } from '../audio/PsychoacousticEngine'
import { applyOptimalMixLevels } from '../data/mixLevels'
import { savedMixStorage } from '../services/savedMixStorage'
import type { PsychoacousticState } from '../types/psychoacoustic'
import { DEFAULT_PSYCHO } from '../types/psychoacoustic'
import type { SavedMix } from '../types/savedMix'
import type { CreateSession, EntrainmentType } from '../types/studio'
import { useMixEngine } from './useMixEngine'

/**
 * Persistent saved-mix playback — survives view changes under the corner player.
 */
export function useSavedMixPlayback() {
  const mixSnap = useMixEngine()
  const [activeMixId, setActiveMixId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [session, setSession] = useState<CreateSession | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const baselineRef = useRef<CreateSession | null>(null)
  const sessionRef = useRef<CreateSession | null>(null)

  const stop = useCallback(() => {
    mixEngine.connectAdvancedTap(null)
    mixEngine.stop()
    psychoEngine.stop()
    sessionRef.current = null
    baselineRef.current = null
    setActiveMixId(null)
    setSession(null)
    setTitle('')
    setNote(null)
  }, [])

  const startSessionAudio = useCallback(async (next: CreateSession) => {
    await mixEngine.play(next)
    const ctx = mixEngine.getContext()
    if (!psychoEngine.isPlaying()) {
      await psychoEngine.start({ withDemoSources: false, context: ctx ?? undefined })
    }
    psychoEngine.applyPreset(next.advancedPsycho)
    const tap = psychoEngine.getMixTap()
    if (tap) mixEngine.connectAdvancedTap(tap)
    psychoEngine.updateEntrainment(next.frequency.beatHz, next.frequency.hz)
  }, [])

  const playMix = useCallback(
    async (mix: SavedMix, opts?: { keepMinimized?: boolean }) => {
      const cloned = structuredClone(mix.session)
      setActiveMixId(mix.id)
      setTitle(mix.title)
      setSession(cloned)
      sessionRef.current = cloned
      baselineRef.current = structuredClone(mix.session)
      if (!opts?.keepMinimized) setMinimized(false)
      setBusy(true)
      setNote(null)
      try {
        await startSessionAudio(cloned)
      } catch (e) {
        setNote(e instanceof Error ? e.message : 'Could not start playback.')
        mixEngine.stop()
        psychoEngine.stop()
      } finally {
        setBusy(false)
      }
    },
    [startSessionAudio],
  )

  const persistAndSync = useCallback(
    (next: CreateSession, opts?: { restartVoice?: boolean }) => {
      sessionRef.current = next
      setSession(next)
      if (activeMixId) {
        savedMixStorage.save({ id: activeMixId, title, session: next })
      }
      if (mixSnap.transport === 'playing' || mixSnap.transport === 'paused') {
        mixEngine.sync(next)
        if (opts?.restartVoice) mixEngine.restartVoice()
        if (psychoEngine.isPlaying()) {
          psychoEngine.applyPreset(next.advancedPsycho)
          psychoEngine.updateEntrainment(next.frequency.beatHz, next.frequency.hz)
          psychoEngine.setBusDb('music', linearGainToDbFs(next.soundtrack.volume))
          psychoEngine.setBusDb('soundscape', linearGainToDbFs(next.ambientBusGain))
          psychoEngine.setBusDb('frequency', linearGainToDbFs(next.frequency.volume))
          psychoEngine.setBusDb('voice', linearGainToDbFs(next.voice.volume))
        }
      }
    },
    [activeMixId, mixSnap.transport, title],
  )

  const patchSession = useCallback(
    (partial: Partial<CreateSession>, opts?: { restartVoice?: boolean }) => {
      const cur = sessionRef.current
      if (!cur) return
      const next: CreateSession = {
        ...cur,
        ...partial,
        optimalLevels:
          partial.optimalLevels !== undefined
            ? partial.optimalLevels
            : partial.masterVolume !== undefined ||
                partial.ambientBusGain !== undefined ||
                partial.soundtrack !== undefined ||
                partial.frequency !== undefined ||
                partial.voice !== undefined
              ? false
              : cur.optimalLevels,
      }
      persistAndSync(next, opts)
    },
    [persistAndSync],
  )

  const setEntrainment = useCallback(
    (entrainment: EntrainmentType) => {
      const cur = sessionRef.current
      if (!cur) return
      patchSession({ frequency: { ...cur.frequency, entrainment } })
    },
    [patchSession],
  )

  const setBusLinear = useCallback(
    (bus: 'soundtrack' | 'ambient' | 'frequency' | 'voice', linear: number) => {
      const cur = sessionRef.current
      if (!cur) return
      const v = Math.max(0, Math.min(1, linear))
      if (bus === 'soundtrack') {
        patchSession({ soundtrack: { ...cur.soundtrack, volume: v } })
      } else if (bus === 'ambient') {
        patchSession({ ambientBusGain: v })
      } else if (bus === 'frequency') {
        patchSession({ frequency: { ...cur.frequency, volume: v } })
      } else {
        patchSession({ voice: { ...cur.voice, volume: v } })
      }
    },
    [patchSession],
  )

  const setVoiceRate = useCallback(
    (rate: number) => {
      const cur = sessionRef.current
      if (!cur) return
      patchSession({ voice: { ...cur.voice, rate } }, { restartVoice: true })
    },
    [patchSession],
  )

  const applyAdvanced = useCallback(
    (advancedPsycho: PsychoacousticState) => {
      patchSession({ advancedPsycho })
    },
    [patchSession],
  )

  const restoreSaved = useCallback(() => {
    const base = baselineRef.current
    if (!base) return
    const next = structuredClone(base)
    persistAndSync(next, { restartVoice: true })
    setNote('Restored saved mix levels & psychoacoustics.')
    window.setTimeout(() => setNote(null), 3500)
  }, [persistAndSync])

  const restoreRecommended = useCallback(
    (mode: ManifestationMode = 'standard') => {
      const cur = sessionRef.current
      if (!cur) return
      let next = applyOptimalMixLevels(cur, mode)
      next = {
        ...next,
        advancedPsycho: {
          ...structuredClone(DEFAULT_PSYCHO),
          buses: {
            music: linearGainToDbFs(next.soundtrack.volume),
            soundscape: linearGainToDbFs(next.ambientBusGain),
            frequency: linearGainToDbFs(next.frequency.volume),
            voice: linearGainToDbFs(next.voice.volume),
          },
        },
      }
      persistAndSync(next, { restartVoice: true })
      setNote('Applied recommended Standard sweet-spot + default psychoacoustics.')
      window.setTimeout(() => setNote(null), 3500)
    },
    [persistAndSync],
  )

  const togglePause = useCallback(async () => {
    if (mixSnap.transport === 'playing') {
      await mixEngine.pause()
      return
    }
    if (mixSnap.transport === 'paused' && sessionRef.current) {
      await mixEngine.play(sessionRef.current)
      return
    }
    if (sessionRef.current && activeMixId) {
      setBusy(true)
      try {
        await startSessionAudio(sessionRef.current)
      } catch (e) {
        setNote(e instanceof Error ? e.message : 'Could not start playback.')
      } finally {
        setBusy(false)
      }
    }
  }, [activeMixId, mixSnap.transport, startSessionAudio])

  const playAdjacent = useCallback(
    async (dir: 1 | -1) => {
      const list = savedMixStorage.list()
      if (list.length === 0) return
      const idx = activeMixId ? list.findIndex((m) => m.id === activeMixId) : -1
      const nextIdx =
        idx < 0 ? 0 : (idx + dir + list.length * 10) % list.length
      const next = list[nextIdx]
      if (!next) return
      await playMix(next, { keepMinimized: minimized })
    },
    [activeMixId, minimized, playMix],
  )

  return {
    activeMixId,
    title,
    session,
    minimized,
    setMinimized,
    busy,
    note,
    transport: mixSnap.transport,
    playMix,
    togglePause,
    stop,
    playNext: () => void playAdjacent(1),
    playPrev: () => void playAdjacent(-1),
    setEntrainment,
    setBusLinear,
    setVoiceRate,
    applyAdvanced,
    restoreSaved,
    restoreRecommended,
    restartPreview: async (override?: PsychoacousticState) => {
      const cur = sessionRef.current
      if (!cur) return
      const next = override ? { ...cur, advancedPsycho: override } : cur
      sessionRef.current = next
      setSession(next)
      setBusy(true)
      try {
        await startSessionAudio(next)
      } catch (e) {
        setNote(e instanceof Error ? e.message : 'Could not start playback.')
      } finally {
        setBusy(false)
      }
    },
  }
}

export type SavedMixPlayback = ReturnType<typeof useSavedMixPlayback>
