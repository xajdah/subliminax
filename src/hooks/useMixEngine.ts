import { useCallback, useEffect, useState } from 'react'
import { mixEngine, type MixSnapshot } from '../audio/MixEngine'
import type { CreateSession } from '../types/studio'

export function useMixEngine() {
  const [snap, setSnap] = useState<MixSnapshot>(() => mixEngine.snap())

  useEffect(() => {
    return mixEngine.subscribe(setSnap)
  }, [])

  return {
    ...snap,
    play: useCallback((s: CreateSession) => void mixEngine.play(s), []),
    playSoundtrackSolo: useCallback(
      (s: CreateSession) => void mixEngine.playSoundtrackSolo(s),
      [],
    ),
    pause: useCallback(() => void mixEngine.pause(), []),
    stop: useCallback(() => mixEngine.stop(), []),
    setMasterVolume: useCallback((v: number) => mixEngine.setMasterVolume(v), []),
    sync: useCallback((s: CreateSession) => mixEngine.sync(s), []),
  }
}
