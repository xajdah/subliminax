import { useEffect, useState } from 'react'
import { getMoodPreset } from '../presets/moods'
import { useAudioEngine } from '../hooks/useAudioEngine'
import { useSessionTimer } from '../hooks/useSessionTimer'
import { useTheme } from '../hooks/useTheme'
import type {
  AffirmationTrack,
  MatrixHaloConfig,
  MoodId,
  SessionNotes,
  StudioMode,
  XenapseConfig,
} from '../types/studio'
import { MatrixHaloPanel } from './matrixhalo/MatrixHaloPanel'
import { ModeToggle } from './ModeToggle'
import { MoodPresets } from './MoodPresets'
import { REMscribePanel } from './remscribe/REMscribePanel'
import { ThemeToggle } from './ThemeToggle'
import { TransportBar } from './TransportBar'
import { XenapsePanel } from './xenapse/XenapsePanel'

const DEFAULT_XENAPSE: XenapseConfig = {
  mode: 'binaural',
  carrierHz: 200,
  beatHz: 10,
  pulseHz: 8,
  toneGain: 0.15,
  ambient: 'pink',
  ambientGain: 0.2,
  ambientFilterHz: 1000,
  useSolfeggio: false,
  solfeggioHz: null,
}

const DEFAULT_HALO: MatrixHaloConfig = {
  intensity: 1,
  reduceMotion: false,
  showRings: true,
  showCymatics: true,
}

function makeTrack(text: string, i: number): AffirmationTrack {
  return {
    id: `seed-${i}`,
    text,
    volume: 0.7,
    pan: 0,
    rate: 0.95,
    pitch: 1,
    loop: true,
    muted: false,
    subliminal: i > 0,
  }
}

export function StudioShell() {
  const { theme, toggleTheme } = useTheme()
  const engine = useAudioEngine()
  const elapsedMs = useSessionTimer(engine.transport)

  const [studioMode, setStudioMode] = useState<StudioMode>('simple')
  const [moodId, setMoodId] = useState<MoodId | null>('focus')
  const [xenapse, setXenapse] = useState<XenapseConfig>(DEFAULT_XENAPSE)
  const [halo, setHalo] = useState<MatrixHaloConfig>(() => {
    const prefersReduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return { ...DEFAULT_HALO, reduceMotion: prefersReduce }
  })
  const [affirmations, setAffirmations] = useState<AffirmationTrack[]>(() =>
    (getMoodPreset('focus')?.sampleAffirmations ?? []).map(makeTrack),
  )
  const [notes, setNotes] = useState<SessionNotes>({
    title: 'Focus session',
    body: '',
    updatedAt: Date.now(),
  })

  // Sync engine params
  useEffect(() => {
    engine.setXenapseConfig(xenapse)
  }, [xenapse, engine.setXenapseConfig])

  useEffect(() => {
    engine.setAffirmations(affirmations)
  }, [affirmations, engine.setAffirmations])

  useEffect(() => {
    engine.setMasterVolume(engine.masterVolume)
  }, [])

  const applyMood = (id: MoodId) => {
    const preset = getMoodPreset(id)
    if (!preset) return
    setMoodId(id)
    setXenapse((prev) => ({ ...prev, ...preset.xenapse }))
    engine.setMasterVolume(preset.masterVolume)
    setAffirmations(preset.sampleAffirmations.map(makeTrack))
    setNotes((n) => ({
      ...n,
      title: `${preset.label} session`,
      updatedAt: Date.now(),
    }))
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <header className="animate-rise flex flex-wrap items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/logo-mark.svg" alt="" className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-[1.75rem]">
              Subliminax
            </h1>
            <p className="mt-0.5 truncate text-sm text-muted">
              Psychoacoustic & subliminal soundtrack studio
            </p>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ModeToggle mode={studioMode} onChange={setStudioMode} />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <TransportBar
        transport={engine.transport}
        masterVolume={engine.masterVolume}
        elapsedMs={elapsedMs}
        onPlay={engine.play}
        onPause={engine.pause}
        onStop={engine.stop}
        onVolume={engine.setMasterVolume}
      />

      <MoodPresets activeId={moodId} onSelect={applyMood} />

      {studioMode === 'simple' ? (
        <div className="grid flex-1 gap-4 lg:grid-cols-2">
          <XenapsePanel config={xenapse} compact onChange={setXenapse} />
          <div className="flex flex-col gap-4">
            <REMscribePanel
              tracks={affirmations}
              notes={notes}
              speechSupported={engine.speechSupported}
              compact
              onChange={setAffirmations}
              onNotesChange={setNotes}
            />
            <MatrixHaloPanel
              config={halo}
              getAnalyser={engine.getAnalyser}
              transportPlaying={engine.transport === 'playing'}
              onChange={setHalo}
            />
          </div>
        </div>
      ) : (
        <div className="grid flex-1 gap-4 xl:grid-cols-3">
          <REMscribePanel
            tracks={affirmations}
            notes={notes}
            speechSupported={engine.speechSupported}
            onChange={setAffirmations}
            onNotesChange={setNotes}
          />
          <XenapsePanel config={xenapse} onChange={setXenapse} />
          <MatrixHaloPanel
            config={halo}
            getAnalyser={engine.getAnalyser}
            transportPlaying={engine.transport === 'playing'}
            onChange={setHalo}
          />
        </div>
      )}

      <footer className="pb-4 pt-2 text-center text-xs text-muted">
        Subliminax · headphones recommended for binaural beats · audio unlocks on Play
      </footer>
    </div>
  )
}
