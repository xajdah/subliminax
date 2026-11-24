import { useEffect, useState } from 'react'
import { psychoEngine } from '../../audio/PsychoacousticEngine'
import { usePsychoEngine } from '../../hooks/usePsychoEngine'
import { useTheme } from '../../hooks/useTheme'
import { FeatureGuidelines } from '../guide/FeatureGuidelines'
import { GanzfeldEntrainmentOverlay } from '../GanzfeldEntrainmentOverlay'
import { ThemeToggle } from '../ThemeToggle'

interface Props {
  onHome: () => void
}

/** Standalone Ganzfeld Visual Sync — launched from the Home hub (not Create). */
export function GanzfeldHub({ onHome }: Props) {
  const { theme, toggleTheme } = useTheme()
  const eng = usePsychoEngine()
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    return () => {
      psychoEngine.stop()
    }
  }, [])

  const launch = async () => {
    if (starting) return
    setStarting(true)
    try {
      if (!eng.playing) {
        await psychoEngine.start({ withDemoSources: true })
        psychoEngine.updateEntrainment(6, 200)
      }
      setOverlayOpen(true)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          ← Home
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold">
            Ganzfeld <span className="text-teal">Visual Sync</span>
          </h1>
          <p className="text-sm text-muted">
            Closed-eye photic flicker locked to the live entrainment phase clock.
          </p>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <FeatureGuidelines entryId="ganzfeld" className="mb-5" defaultOpen />

      <section className="panel space-y-4 p-5">
        <h2 className="panel-title text-lg">Session</h2>
        <p className="text-sm text-muted">
          Photosensitivity consent appears on first launch this browser session. Use a dim room and
          keep intensity moderate. This module is separate from Create Subliminal.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary px-6 py-3"
            disabled={starting}
            onClick={() => void launch()}
          >
            {starting ? 'Preparing…' : 'Enter Ganzfeld'}
          </button>
          {eng.playing && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setOverlayOpen(false)
                eng.stop()
              }}
            >
              Stop engine
            </button>
          )}
        </div>
      </section>

      <GanzfeldEntrainmentOverlay open={overlayOpen} onClose={() => setOverlayOpen(false)} />
    </div>
  )
}
