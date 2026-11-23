import { useCallback, useEffect, useState } from 'react'
import {
  audioEngine,
  type EngineSnapshot,
} from '../audio/AudioEngine'
import type { AffirmationTrack, XenapseConfig } from '../types/studio'

export function useAudioEngine() {
  const [snap, setSnap] = useState<EngineSnapshot>(() => audioEngine.snapshot())

  useEffect(() => {
    const unsub = audioEngine.subscribe(setSnap)
    // Keep singleton AudioContext alive across StrictMode remounts;
    // call audioEngine.dispose() only on full app teardown if needed.
    return unsub
  }, [])

  const play = useCallback(() => void audioEngine.play(), [])
  const pause = useCallback(() => void audioEngine.pause(), [])
  const stop = useCallback(() => audioEngine.stop(), [])
  const setMasterVolume = useCallback((v: number) => audioEngine.setMasterVolume(v), [])
  const setXenapseConfig = useCallback(
    (c: XenapseConfig) => audioEngine.setXenapseConfig(c),
    [],
  )
  const setAffirmations = useCallback(
    (tracks: AffirmationTrack[]) => audioEngine.setAffirmations(tracks),
    [],
  )
  const unlock = useCallback(() => audioEngine.unlock(), [])

  return {
    ...snap,
    play,
    pause,
    stop,
    setMasterVolume,
    setXenapseConfig,
    setAffirmations,
    unlock,
    speechSupported: audioEngine.getSpeechSupported(),
    getAnalyser: () => audioEngine.getAnalyser(),
  }
}
