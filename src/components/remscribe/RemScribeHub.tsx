import { useCallback, useEffect, useMemo, useState } from 'react'
import { nightAcousticMonitor } from '../../audio/NightAcousticMonitor'
import { psychoEngine } from '../../audio/PsychoacousticEngine'
import { sleepCurveScheduler } from '../../audio/SleepCurveScheduler'
import { tracksForMood } from '../../data/moodTracks'
import { useTheme } from '../../hooks/useTheme'
import { visionBoardStorage } from '../../services/visionBoardStorage'
import { remscribeStorage } from '../../services/remscribeStorage'
import {
  DREAM_LANGUAGES,
  estimateMetrics,
  newRemId,
  type AcousticEvent,
  type DreamLanguageCode,
  type DreamLog,
  type HypnogramSample,
  type RemScribeSession,
  type SessionDurationPreset,
  type SleepCurvePhase,
} from '../../types/remscribe'
import { ThemeToggle } from '../ThemeToggle'
import { RemScribeMorningReport } from '../RemScribeMorningReport'
import { RemScribeNightMode } from '../RemScribeNightMode'

const CALMING_BEDS = tracksForMood('calming')
const DEFAULT_CALMING_TRACK_ID = CALMING_BEDS[0]?.id ?? 'tranquility'

interface Props {
  onHome: () => void
}

type HubPhase = 'setup' | 'night' | 'morning'

const DURATION_PILLS: { id: SessionDurationPreset; label: string; hours?: number }[] = [
  { id: 4, label: '4h', hours: 4 },
  { id: 5, label: '5h', hours: 5 },
  { id: 7, label: '7h', hours: 7 },
  { id: 9, label: '9h', hours: 9 },
  { id: 'custom', label: 'Custom Wake' },
]

function hoursUntilWake(wakeAtMs: number): number {
  const now = Date.now()
  let delta = wakeAtMs - now
  if (delta < 15 * 60 * 1000) delta += 24 * 3600 * 1000
  return Math.max(0.25, delta / 3600000)
}

export function RemScribeHub({ onHome }: Props) {
  const { theme, toggleTheme } = useTheme()
  const [hubPhase, setHubPhase] = useState<HubPhase>('setup')
  const [durationPreset, setDurationPreset] = useState<SessionDurationPreset>(7)
  const [customWake, setCustomWake] = useState(() => {
    const d = new Date()
    d.setHours(7, 0, 0, 0)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const [language, setLanguage] = useState<DreamLanguageCode>('en-US')
  const [musicTrackId, setMusicTrackId] = useState(DEFAULT_CALMING_TRACK_ID)
  const [session, setSession] = useState<RemScribeSession | null>(null)
  const [remainingMs, setRemainingMs] = useState(0)
  const [phase, setPhase] = useState<SleepCurvePhase>('descent')
  const [beatHz, setBeatHz] = useState(10)
  const [listening, setListening] = useState(false)
  const [dreamCapturing, setDreamCapturing] = useState(false)
  const [speechHint, setSpeechHint] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const goals = useMemo(() => visionBoardStorage.getAll().goals.slice(0, 5), [])
  const affirmations = useMemo(() => {
    try {
      // Pull sample lines from last create session if present
      const raw = localStorage.getItem('subliminax.createSession.v1')
      if (!raw) return [] as string[]
      const parsed = JSON.parse(raw) as { voice?: { script?: string } }
      const script = parsed.voice?.script?.trim()
      if (!script) return []
      return script
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4)
    } catch {
      return []
    }
  }, [])

  const resolvedHours = useMemo(() => {
    if (durationPreset !== 'custom') return durationPreset
    const [hh, mm] = customWake.split(':').map(Number)
    const wake = new Date()
    wake.setHours(hh || 7, mm || 0, 0, 0)
    return hoursUntilWake(wake.getTime())
  }, [durationPreset, customWake])

  const persist = useCallback((next: RemScribeSession) => {
    setSession(next)
    remscribeStorage.upsert(next)
  }, [])

  const endNight = useCallback(async () => {
    sleepCurveScheduler.stop(false)
    await nightAcousticMonitor.stop()
    psychoEngine.stop()
    setSession((prev) => {
      if (!prev) return prev
      const endedAt = Date.now()
      const durationSec = (endedAt - prev.startedAt) / 1000
      const metrics = estimateMetrics(prev.hypnogram, prev.events, durationSec)
      const next: RemScribeSession = {
        ...prev,
        endedAt,
        status: 'ended',
        metrics,
      }
      remscribeStorage.upsert(next)
      return next
    })
    setHubPhase('morning')
  }, [])

  const startNight = async () => {
    if (starting) return
    setStarting(true)
    setError(null)
    try {
      const startedAt = Date.now()
      const customWakeAtMs =
        durationPreset === 'custom'
          ? (() => {
              const [hh, mm] = customWake.split(':').map(Number)
              const wake = new Date()
              wake.setHours(hh || 7, mm || 0, 0, 0)
              if (wake.getTime() <= Date.now()) wake.setDate(wake.getDate() + 1)
              return wake.getTime()
            })()
          : null

      const next: RemScribeSession = {
        id: newRemId('session'),
        config: {
          durationHours: resolvedHours,
          customWakeAtMs,
          language,
          linkedAffirmations: affirmations,
          linkedGoalNames: goals.map((g) => g.title),
          musicTrackId,
        },
        startedAt,
        endedAt: null,
        events: [],
        dreams: [],
        hypnogram: [],
        metrics: null,
        status: 'running',
      }
      persist(next)
      setHubPhase('night')
      setRemainingMs(resolvedHours * 3600000)
      setPhase('descent')
      setBeatHz(10)

      sleepCurveScheduler.configure(resolvedHours)
      await sleepCurveScheduler.start(
        {
          onTick: ({ remainingMs: rem, phase: ph, beatHz: hz }) => {
            setRemainingMs(rem)
            setPhase(ph)
            setBeatHz(hz)
          },
          onHypnogram: (sample: HypnogramSample) => {
            setSession((prev) => {
              if (!prev) return prev
              const updated = { ...prev, hypnogram: [...prev.hypnogram, sample] }
              remscribeStorage.upsert(updated)
              return updated
            })
          },
          onComplete: () => {
            void endNight()
          },
        },
        { musicTrackId },
      )

      await nightAcousticMonitor.start(language, startedAt, {
        onListening: setListening,
        onDreamCapturing: setDreamCapturing,
        onSpeechPartial: (t) => setSpeechHint(t.slice(-80)),
        onError: (msg) => setError(msg),
        onEvent: (event: AcousticEvent) => {
          setSession((prev) => {
            if (!prev) return prev
            const updated = { ...prev, events: [...prev.events, event] }
            remscribeStorage.upsert(updated)
            return updated
          })
        },
        onDream: (dream: DreamLog) => {
          setSession((prev) => {
            if (!prev) return prev
            const updated = { ...prev, dreams: [...prev.dreams, dream] }
            remscribeStorage.upsert(updated)
            return updated
          })
        },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start REMscribe night.')
      setHubPhase('setup')
    } finally {
      setStarting(false)
    }
  }

  useEffect(() => {
    return () => {
      sleepCurveScheduler.stop(false)
      void nightAcousticMonitor.stop()
    }
  }, [])

  if (hubPhase === 'night') {
    return (
      <RemScribeNightMode
        remainingMs={remainingMs}
        phase={phase}
        beatHz={beatHz}
        listening={listening}
        dreamCapturing={dreamCapturing}
        speechHint={speechHint}
        onEndNight={() => void endNight()}
      />
    )
  }

  if (hubPhase === 'morning' && session) {
    return (
      <RemScribeMorningReport
        session={session}
        onBack={() => {
          setHubPhase('setup')
          setSession(null)
        }}
        onUpdateDream={(dream) => {
          setSession((prev) => {
            if (!prev) return prev
            const dreams = prev.dreams.map((d) => (d.id === dream.id ? dream : d))
            const updated = { ...prev, dreams }
            remscribeStorage.upsert(updated)
            return updated
          })
        }}
      />
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          ← Home
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold">
            REM<span className="text-teal">scribe</span>
          </h1>
          <p className="text-sm text-muted">
            Overnight entrainment · acoustic sensing · dream journaling
          </p>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <section className="panel mb-5 space-y-4 p-5">
        <h2 className="panel-title text-lg">Session Duration</h2>
        <div className="flex flex-wrap gap-2">
          {DURATION_PILLS.map((p) => (
            <button
              key={String(p.id)}
              type="button"
              className="chip"
              data-active={durationPreset === p.id}
              onClick={() => setDurationPreset(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {durationPreset === 'custom' && (
          <label className="block">
            <span className="field-label">Wake time</span>
            <input
              type="time"
              className="field-input mt-1"
              value={customWake}
              onChange={(e) => setCustomWake(e.target.value)}
            />
          </label>
        )}
        <p className="text-sm text-muted">
          Adaptive curve length: <span className="text-ink">{resolvedHours.toFixed(2)} hours</span>
        </p>
      </section>

      <section className="panel mb-5 space-y-4 p-5">
        <h2 className="panel-title text-lg">Calming Night Bed</h2>
        <p className="text-sm text-muted">
          Same calming soundtrack beds as Studio — loops quietly under the sleep curve.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CALMING_BEDS.map((track) => (
            <button
              key={track.id}
              type="button"
              className="chip justify-start text-left"
              data-active={musicTrackId === track.id}
              onClick={() => setMusicTrackId(track.id)}
            >
              <span className="min-w-0">
                <span className="block font-medium text-ink">{track.name}</span>
                <span className="block text-xs text-muted">{track.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel mb-5 space-y-4 p-5">
        <h2 className="panel-title text-lg">Dream Recognition Language</h2>
        <p className="text-sm text-muted">
          Wake word “Record” plus localized equivalents. Speech recognition runs in the selected locale.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DREAM_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className="chip justify-start"
              data-active={language === lang.code}
              onClick={() => setLanguage(lang.code)}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel mb-5 space-y-3 p-5">
        <h2 className="panel-title text-lg">Sleep Curve Preview</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
          <li>
            <span className="text-ink">Descent (0–15%)</span> — 16→5 Hz + Breath Sync 4-7-8
          </li>
          <li>
            <span className="text-ink">Deep Delta (15–50%)</span> — 1.5–2.5 Hz · LPF 450 Hz · Brown noise
          </li>
          <li>
            <span className="text-ink">REM Cycles (50–85%)</span> — 90-min waves 2↔6.5 Hz
          </li>
          <li>
            <span className="text-ink">Pre-Dawn (85–100%)</span> — LPF opens · 12–15 Hz · morning swell
          </li>
        </ol>
        {(affirmations.length > 0 || goals.length > 0) && (
          <p className="text-xs text-muted">
            Morning interpreter will link dreams to{' '}
            {affirmations.length > 0 && `${affirmations.length} affirmation line(s)`}
            {affirmations.length > 0 && goals.length > 0 && ' · '}
            {goals.length > 0 && `${goals.length} vision goal(s)`}.
          </p>
        )}
      </section>

      {error && (
        <p className="mb-4 rounded-lg border border-[color-mix(in_oklab,#b91c1c_40%,transparent)] bg-[color-mix(in_oklab,#b91c1c_10%,transparent)] px-3 py-2 text-sm">
          {error}
        </p>
      )}

      <button
        type="button"
        className="btn btn-primary w-full px-6 py-3 text-base"
        disabled={starting}
        onClick={() => void startNight()}
      >
        {starting ? 'Preparing night…' : 'Begin Night Session'}
      </button>
      <p className="mt-3 text-center text-xs text-muted">
        OLED night mode dims the screen. Mic uses echo cancellation so sleep audio is ignored.
      </p>
    </div>
  )
}
