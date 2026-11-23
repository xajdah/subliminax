import { useCallback, useEffect, useState } from 'react'
import { audioEngine, type EngineSnapshot } from '../audio/AudioEngine'
import type { StudioState } from '../types/studio'

export function useAudioEngine() {
  const [snap, setSnap] = useState<EngineSnapshot>(() => audioEngine.snapshot())

  useEffect(() => audioEngine.subscribe(setSnap), [])

  const play = useCallback(() => void audioEngine.play(), [])
  const pause = useCallback(() => void audioEngine.pause(), [])
  const stop = useCallback(() => audioEngine.stop(), [])
  const setMasterVolume = useCallback((v: number) => audioEngine.setMasterVolume(v), [])
  const syncFromState = useCallback((s: StudioState) => audioEngine.syncFromState(s), [])
  const updateElapsed = useCallback((ms: number) => audioEngine.updateElapsed(ms), [])
  const loadSoundscapeFile = useCallback(
    (file: File) => audioEngine.loadSoundscapeFile(file),
    [],
  )
  const clearSoundscapeFile = useCallback(() => audioEngine.clearSoundscapeFile(), [])

  return {
    ...snap,
    play,
    pause,
    stop,
    setMasterVolume,
    syncFromState,
    updateElapsed,
    loadSoundscapeFile,
    clearSoundscapeFile,
  }
}
