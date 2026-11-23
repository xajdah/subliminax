import { useEffect, useState } from 'react'
import { useAudioEngine } from '../hooks/useAudioEngine'
import { useSessionTimer } from '../hooks/useSessionTimer'
import { useTheme } from '../hooks/useTheme'
import {
  createDefaultStudioState,
  INTENT_PRESETS,
  type AppSurface,
  type BrainwaveBand,
  type IntentId,
  type StudioState,
  type VisualMode,
} from '../types/studio'
import { AudioLabRack } from './rack/AudioLabRack'
import { SessionMixer } from './mixer/SessionMixer'
import { ThemeToggle } from './ThemeToggle'
import { TransportBar } from './TransportBar'
import { MasterVisualizer } from './visualizer/MasterVisualizer'

export function StudioShell() {
  const { theme, toggleTheme } = useTheme()
  const engine = useAudioEngine()
  const [state, setState] = useState<StudioState>(() => {
    const s = createDefaultStudioState()
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      s.visual.reduceMotion = true
    }
    return s
  })
  const [rackOpen, setRackOpen] = useState(true)

  const elapsedMs = useSessionTimer(engine.transport)

  useEffect(() => {
    setState((s) => ({ ...s, clock: { ...s.clock, elapsedMs }, transport: engine.transport }))
  }, [elapsedMs, engine.transport])

  useEffect(() => {
    engine.syncFromState({ ...state, clock: { ...state.clock, elapsedMs } })
    engine.updateElapsed(elapsedMs)
  }, [state, elapsedMs, engine.syncFromState, engine.updateElapsed])

  useEffect(() => {
    engine.setMasterVolume(state.masterVolume)
  }, [state.masterVolume, engine.setMasterVolume])

  const patch = (p: Partial<StudioState>) => setState((s) => ({ ...s, ...p }))

  const applyIntent = (id: IntentId) => {
    const intent = INTENT_PRESETS.find((i) => i.id === id)
    if (!intent) return
    setState((s) => ({
      ...s,
      intentId: id,
      carrier: { ...s.carrier, hz: intent.carrierHz, band: null },
      soundscape: { ...s.soundscape, id: intent.soundscape },
      clock: { ...s.clock, lengthMinutes: intent.lengthMinutes },
      affirmations: { lines: [...intent.affirmations], activeIndex: 0 },
    }))
  }

  const setSurface = (surface: AppSurface) => patch({ surface })

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <header className="animate-rise flex flex-wrap items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/logo-mark.svg" alt="" className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-[1.75rem]">
              Subliminax
            </h1>
            <p className="mt-0.5 truncate text-sm text-muted">Studio — build your session</p>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-border bg-bg/40 p-1" role="group" aria-label="Surface">
            <button
              type="button"
              className="chip chip-teal border-0"
              data-active={state.surface === 'simple'}
              onClick={() => setSurface('simple')}
            >
              Simple
            </button>
            <button
              type="button"
              className="chip chip-teal border-0"
              data-active={state.surface === 'studio'}
              onClick={() => setSurface('studio')}
            >
              Studio
            </button>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <TransportBar
        transport={engine.transport}
        masterVolume={state.masterVolume}
        elapsedMs={elapsedMs}
        lengthMinutes={state.clock.lengthMinutes}
        onPlay={engine.play}
        onPause={engine.pause}
        onStop={engine.stop}
        onVolume={(v) => patch({ masterVolume: v })}
        onLength={(m) =>
          patch({ clock: { ...state.clock, lengthMinutes: m } })
        }
      />

      <MasterVisualizer
        analyser={engine.analyser}
        bed={engine.bedAnalyser}
        carrier={engine.carrierAnalyser}
        voice={engine.voiceAnalyser}
        visual={
          state.lab.xrayFocus ? { ...state.visual, mode: 'xray' } : state.visual
        }
        playing={engine.transport === 'playing'}
        xrayFocus={state.lab.xrayFocus}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="field-label mb-0">Visual</span>
        {(['cymatics', 'aura', 'xray', 'off'] as VisualMode[]).map((m) => (
          <button
            key={m}
            type="button"
            className="chip"
            data-active={state.visual.mode === m && !state.lab.xrayFocus}
            onClick={() =>
              patch({
                visual: { ...state.visual, mode: m },
                lab: { ...state.lab, xrayFocus: m === 'xray' },
              })
            }
          >
            {m}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          data-active={state.visual.reduceMotion}
          onClick={() =>
            patch({ visual: { ...state.visual, reduceMotion: !state.visual.reduceMotion } })
          }
        >
          Reduce motion
        </button>
      </div>

      <section className="panel animate-rise p-4">
        <h2 className="panel-title text-lg">Intents</h2>
        <p className="mb-3 text-sm text-muted">
          Drafts only — rewrite the words. Sleep, anxiety, confidence, abundance.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {INTENT_PRESETS.map((intent) => (
            <button
              key={intent.id}
              type="button"
              className="chip flex min-h-[4.25rem] flex-col items-start justify-center px-3 py-2 text-left"
              data-active={state.intentId === intent.id}
              onClick={() => applyIntent(intent.id)}
            >
              <span className="font-display text-sm font-bold">{intent.label}</span>
              <span className="text-[0.7rem] leading-snug text-muted">{intent.description}</span>
            </button>
          ))}
        </div>
      </section>

      {state.surface === 'simple' ? (
        <div className="panel animate-rise flex flex-col items-center gap-4 p-8 text-center">
          <p className="max-w-md text-muted">
            One-press listening with your current intent defaults. Open Studio anytime to change
            carrier, soundscape, words, voice, length, or audio lab controls.
          </p>
          <button type="button" className="btn btn-primary px-8 py-3 text-base" onClick={engine.play}>
            Play session
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setSurface('studio')}>
            Open full studio
          </button>
        </div>
      ) : (
        <>
          <SessionMixer
            carrier={state.carrier}
            soundscape={state.soundscape}
            affirmations={state.affirmations}
            narration={state.narration}
            onCarrier={(carrier) => patch({ carrier })}
            onSoundscape={(soundscape) => patch({ soundscape })}
            onAffirmations={(affirmations) => patch({ affirmations })}
            onNarration={(narration) => patch({ narration })}
            onUploadBed={(file) => void engine.loadSoundscapeFile(file)}
            onClearBed={engine.clearSoundscapeFile}
          />

          <AudioLabRack
            open={rackOpen}
            lab={state.lab}
            onToggleOpen={() => setRackOpen((o) => !o)}
            onChange={(lab) => patch({ lab })}
            activeBand={state.carrier.band}
            onBand={(band: BrainwaveBand | null) =>
              patch({
                carrier: {
                  ...state.carrier,
                  band,
                },
              })
            }
          />
        </>
      )}

      <footer className="pb-4 pt-2 text-center text-xs text-muted">
        Subliminax Studio · wellbeing practice tool, not a medical device · headphones recommended
        for binaural / Iso-Pan
      </footer>
    </div>
  )
}
