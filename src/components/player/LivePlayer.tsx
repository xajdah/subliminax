import { useState } from 'react'
import { STUDIO_PRESETS } from '../../data/studioPresets'
import { usePsychoEngine } from '../../hooks/usePsychoEngine'
import { useTheme } from '../../hooks/useTheme'
import { GanzfeldEntrainmentOverlay } from '../GanzfeldEntrainmentOverlay'
import { SubliminaXLogo } from '../shared/SubliminaXLogo'
import { ThemeToggle } from '../ThemeToggle'
import { PsychoacousticTunerRack } from '../psycho/PsychoacousticTunerRack'
import { SubliminalXRay } from '../psycho/SubliminalXRay'

interface Props {
  onHome: () => void
}

/** Live Player — X-Ray, tuners, and Ganzfeld Visual Sync launch. */
export function LivePlayer({ onHome }: Props) {
  const { theme, toggleTheme } = useTheme()
  const eng = usePsychoEngine()
  const maskDb = eng.state.buses.music + eng.state.breath.envelopeMaskDb
  const [ganzfeldOpen, setGanzfeldOpen] = useState(false)

  return (
    <div className="hero-shell relative isolate min-h-screen">
      <div className="hero-atmosphere psycho-studio-atmosphere" aria-hidden />
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <button type="button" className="btn btn-ghost text-sm" onClick={onHome}>
            ← Home
          </button>
          <SubliminaXLogo size="nav" />
          <div>
            <p className="font-display text-lg font-bold">
              Sublimina<span className="text-teal">x</span> Player
            </p>
            <p className="text-xs text-muted">Live entrainment · X-Ray · Ganzfeld Sync</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!eng.playing ? (
            <button type="button" className="btn btn-primary" onClick={() => void eng.start()}>
              Start Engine
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => eng.stop()}>
              Stop
            </button>
          )}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-7xl gap-4 px-5 pb-16 sm:px-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <section className="panel p-4">
            <h2 className="panel-title mb-3 text-sm">Quick Presets</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {STUDIO_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 text-left transition hover:border-[var(--accent)]"
                  onClick={() => eng.applyPreset(p.state)}
                >
                  <p className="font-display text-sm font-semibold text-ink">{p.label}</p>
                  <p className="mt-1 text-xs text-muted">{p.blurb}</p>
                </button>
              ))}
            </div>
          </section>

          <SubliminalXRay
            analysers={eng.analysers}
            maskingThresholdDb={maskDb}
            liveBeatHz={eng.state.liveBeatHz}
            ultrasonicHz={eng.state.breath.ultrasonicCarrierHz}
            ultrasonicOn={eng.state.breath.ultrasonic}
            isolateVoice={eng.state.isolateVoice}
            checkMasking={eng.state.checkMasking}
            onIsolateVoice={eng.setIsolateVoice}
            onCheckMasking={eng.setCheckMasking}
            onOpenGanzfeld={() => {
              if (!eng.playing) void eng.start()
              setGanzfeldOpen(true)
            }}
          />
        </div>

        <PsychoacousticTunerRack
          state={eng.state}
          onPatch={eng.patch}
          onBusDb={eng.setBusDb}
        />
      </main>

      <GanzfeldEntrainmentOverlay open={ganzfeldOpen} onClose={() => setGanzfeldOpen(false)} />
    </div>
  )
}
