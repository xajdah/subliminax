import { useCallback, useEffect, useState } from 'react'
import {
  psychoEngine,
  type BusAnalysers,
  type BusId,
} from '../audio/PsychoacousticEngine'
import type { PsychoacousticState } from '../types/psychoacoustic'

export function usePsychoEngine() {
  const [state, setState] = useState<PsychoacousticState>(() => psychoEngine.getState())
  const [playing, setPlaying] = useState(() => psychoEngine.isPlaying())
  const [analysers, setAnalysers] = useState<BusAnalysers | null>(null)

  useEffect(() => {
    return psychoEngine.subscribe((s) => {
      setState(s)
      setPlaying(psychoEngine.isPlaying())
      setAnalysers(psychoEngine.getAnalysers())
    })
  }, [])

  return {
    state,
    playing,
    analysers,
    start: useCallback(async () => {
      await psychoEngine.start()
      setPlaying(true)
      setAnalysers(psychoEngine.getAnalysers())
    }, []),
    stop: useCallback(() => {
      psychoEngine.stop()
      setPlaying(false)
      setAnalysers(null)
    }, []),
    patch: useCallback((p: Parameters<typeof psychoEngine.patch>[0]) => psychoEngine.patch(p), []),
    setBusDb: useCallback((bus: BusId, db: number) => psychoEngine.setBusDb(bus, db), []),
    setIsolateVoice: useCallback((on: boolean) => psychoEngine.setIsolateVoice(on), []),
    setCheckMasking: useCallback((on: boolean) => psychoEngine.setCheckMasking(on), []),
    applyPreset: useCallback(
      (s: PsychoacousticState) => psychoEngine.applyPreset(s),
      [],
    ),
    triggerAffirmation: useCallback(() => psychoEngine.triggerAffirmation(), []),
  }
}
