import { useCallback, useRef, useState } from 'react'
import { mixEngine } from '../audio/MixEngine'
import { psychoEngine } from '../audio/PsychoacousticEngine'
import type { SavedMix } from '../types/savedMix'
import type { CreateSession } from '../types/studio'
import { useMixEngine } from './useMixEngine'

/**
 * Persistent saved-mix playback — survives view changes so audio can keep
 * running under a corner mini-player (no dedicated player page).
 */
export function useSavedMixPlayback() {
  const mixSnap = useMixEngine()
  const [activeMixId, setActiveMixId] = useState<string | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const sessionRef = useRef<CreateSession | null>(null)

  const stop = useCallback(() => {
    mixEngine.connectAdvancedTap(null)
    mixEngine.stop()
    psychoEngine.stop()
    sessionRef.current = null
    setActiveMixId(null)
    setNote(null)
  }, [])

  const playMix = useCallback(async (mix: SavedMix) => {
    setActiveMixId(mix.id)
    setMinimized(false)
    setBusy(true)
    setNote(null)
    sessionRef.current = mix.session
    try {
      await mixEngine.play(mix.session)
      const ctx = mixEngine.getContext()
      if (!psychoEngine.isPlaying()) {
        await psychoEngine.start({ withDemoSources: false, context: ctx ?? undefined })
      }
      psychoEngine.applyPreset(mix.session.advancedPsycho)
      const tap = psychoEngine.getMixTap()
      if (tap) mixEngine.connectAdvancedTap(tap)
      psychoEngine.updateEntrainment(mix.session.frequency.beatHz, mix.session.frequency.hz)
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Could not start playback.')
      mixEngine.stop()
      psychoEngine.stop()
      sessionRef.current = null
    } finally {
      setBusy(false)
    }
  }, [])

  const togglePause = useCallback(async () => {
    if (mixSnap.transport === 'playing') {
      await mixEngine.pause()
      return
    }
    if (mixSnap.transport === 'paused' && sessionRef.current) {
      await mixEngine.play(sessionRef.current)
    }
  }, [mixSnap.transport])

  return {
    activeMixId,
    minimized,
    setMinimized,
    busy,
    note,
    transport: mixSnap.transport,
    playMix,
    togglePause,
    stop,
  }
}

export type SavedMixPlayback = ReturnType<typeof useSavedMixPlayback>
