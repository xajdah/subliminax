import { useEffect, useState } from 'react'
import { focusShieldController } from '../../audio/FocusShieldController'
import type { ManifestationMode } from '../../audio/manifestationCalibration'
import { STUDIO_PRESETS } from '../../data/studioPresets'
import { usePsychoEngine } from '../../hooks/usePsychoEngine'
import { useTheme } from '../../hooks/useTheme'
import { FocusShieldPanel } from '../FocusShieldPanel'
import { MixBalanceDeck } from '../MixBalanceDeck'
import { SubliminaXLogo } from '../shared/SubliminaXLogo'
import { ThemeToggle } from '../ThemeToggle'
import { PsychoacousticTunerRack } from '../psycho/PsychoacousticTunerRack'
import { SubliminalXRay } from '../psycho/SubliminalXRay'

interface Props {
  onHome: () => void
}

/**
 * Legacy live psycho demo (unused by Home routing).
 * Home → Subliminal Player opens saved mixes; Ganzfeld is its own hub card.
 */
export function LivePlayer({ onHome }: Props) {
  const { theme, toggleTheme } = useTheme()
  const eng = usePsychoEngine()
  const maskDb = eng.state.buses.music + eng.state.breath.envelopeMaskDb
  const [calMode, setCalMode] = useState<ManifestationMode>('standard')

  useEffect(() => {
    return () => {
      if (focusShieldController.isActive()) focusShieldController.disable()
    }
  }, [])

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
            <p className="text-xs text-muted">Live entrainment · Focus Shield · X-Ray</p>
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
          <FocusShieldPanel />

          <MixBalanceDeck
            title="Player mix deck"
            mode={calMode}
            levels={{
              soundtrackDb: eng.state.buses.music,
              ambientDb: eng.state.buses.soundscape,
              frequencyDb: eng.state.buses.frequency,
              voiceDb: eng.state.buses.voice,
            }}
            onChange={(bus, db) => {
              const map = {
                soundtrack: 'music',
                ambient: 'soundscape',
                frequency: 'frequency',
                voice: 'voice',
              } as const
              eng.setBusDb(map[bus], db)
            }}
            onApplyMode={(mode) => {
              setCalMode(mode)
              eng.applyManifestationCalibration(mode)
            }}
            onOptimalReset={() => {
              setCalMode('standard')
              eng.applyManifestationCalibration('standard')
            }}
          />

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
          />
        </div>

        <PsychoacousticTunerRack
          state={eng.state}
          onPatch={eng.patch}
          onBusDb={eng.setBusDb}
        />
      </main>
    </div>
  )
}
