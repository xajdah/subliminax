import { useEffect, useMemo, useState } from 'react'
import { psychoEngine } from '../audio/PsychoacousticEngine'
import { lucidCueInjector, ceilingPctToDb } from '../audio/LucidCueInjector'
import {
  defaultLucidCueConfig,
  type LucidCueConfig,
  type LucidCueKind,
} from '../types/remscribe'

interface GoalOpt {
  id: string
  title: string
}

interface Props {
  open: boolean
  goals: GoalOpt[]
  affirmations: string[]
  initial?: LucidCueConfig
  onCancel: () => void
  onComplete: (config: LucidCueConfig) => void
}

const CUES: { id: LucidCueKind; label: string; blurb: string }[] = [
  { id: 'chime528', label: '528 Hz Crystal Chime', blurb: 'Bright solfeggio sparkle' },
  { id: 'bowl432', label: '432 Hz Tibetan Bowl', blurb: 'Warm bowl resonance' },
  { id: 'whisper', label: 'Whispered Lucidity Phrase', blurb: 'Soft spoken dream cue' },
]

const CHECKS = [
  {
    id: 1,
    title: 'Reality Check 1 · Count your fingers',
    body: 'Look at your hands. Count each finger slowly. When you hear the cue, say quietly: “Am I dreaming?”',
  },
  {
    id: 2,
    title: 'Reality Check 2 · Check your breathing',
    body: 'Pinch your nose and try to breathe. In a dream, air often still flows. Pair this with the same cue.',
  },
]

export function LucidPrimerModal({
  open,
  goals,
  affirmations,
  initial,
  onCancel,
  onComplete,
}: Props) {
  const [step, setStep] = useState(0) // 0 cue, 1 link, 2–3 checks, 4 done
  const [config, setConfig] = useState<LucidCueConfig>(() => initial ?? defaultLucidCueConfig())
  const [secondsLeft, setSecondsLeft] = useState(90)
  const [previewing, setPreviewing] = useState(false)
  const [checkDone, setCheckDone] = useState<Record<number, boolean>>({ 1: false, 2: false })

  useEffect(() => {
    if (!open) return
    setStep(0)
    setSecondsLeft(90)
    setCheckDone({ 1: false, 2: false })
    setConfig({ ...(initial ?? defaultLucidCueConfig()), enabled: true })
    const t0 = Date.now()
    const id = window.setInterval(() => {
      const left = Math.max(0, 90 - Math.floor((Date.now() - t0) / 1000))
      setSecondsLeft(left)
    }, 250)
    return () => window.clearInterval(id)
  }, [open, initial])

  const canFinish = useMemo(
    () => checkDone[1] && checkDone[2] && config.cueKind != null,
    [checkDone, config.cueKind],
  )

  const previewCue = async () => {
    if (previewing) return
    setPreviewing(true)
    try {
      if (!psychoEngine.isPlaying()) {
        await psychoEngine.start({ withDemoSources: false })
      }
      const phrase =
        config.linkedAffirmation?.trim() ||
        config.whisperPhrase ||
        'You are dreaming—look at your hands'
      const h = await lucidCueInjector.inject({
        cueKind: config.cueKind,
        whisperPhrase: phrase,
        ceilingPct: Math.max(0.2, config.ceilingPct),
        durationSec: 4.5,
      })
      await h.completed
    } finally {
      setPreviewing(false)
    }
  }

  if (!open) return null

  return (
    <div className="lucid-primer-root" role="dialog" aria-modal="true" aria-labelledby="lucid-primer-title">
      <button type="button" className="lucid-primer-backdrop" aria-label="Cancel" onClick={onCancel} />
      <div className="lucid-primer-panel panel">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze-soft">
              Lucid Dream Cueing
            </p>
            <h2 id="lucid-primer-title" className="panel-title mt-1 text-xl">
              Pre-Sleep Conditioning Ritual
            </h2>
          </div>
          <p className="font-display tabular-nums text-sm text-muted">{secondsLeft}s</p>
        </div>
        <p className="mt-2 text-sm text-muted">
          Pair your signature cue with waking reality checks so REM playback can trigger lucidity without
          waking you.
        </p>

        {step === 0 && (
          <section className="mt-4 space-y-3">
            <h3 className="font-display text-sm font-semibold">1 · Signature Lucidity Cue</h3>
            <div className="grid gap-2">
              {CUES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="chip justify-start"
                  data-active={config.cueKind === c.id}
                  onClick={() => setConfig((x) => ({ ...x, cueKind: c.id }))}
                >
                  <span className="font-semibold">{c.label}</span>
                  <span className="ml-2 text-xs opacity-70">{c.blurb}</span>
                </button>
              ))}
            </div>
            {config.cueKind === 'whisper' && (
              <label className="block">
                <span className="field-label">Whisper phrase</span>
                <input
                  className="field-input mt-1 w-full"
                  value={config.whisperPhrase}
                  onChange={(e) => setConfig((x) => ({ ...x, whisperPhrase: e.target.value }))}
                />
              </label>
            )}
            <label className="block">
              <span className="field-label">
                Sub-awakening ceiling {Math.round(config.ceilingPct * 100)}% (~
                {ceilingPctToDb(config.ceilingPct)} dBFS)
              </span>
              <input
                type="range"
                min={10}
                max={50}
                value={Math.round(config.ceilingPct * 100)}
                className="field-range mt-1 w-full"
                onChange={(e) =>
                  setConfig((x) => ({ ...x, ceilingPct: Number(e.target.value) / 100 }))
                }
              />
            </label>
            <button type="button" className="btn btn-teal" disabled={previewing} onClick={() => void previewCue()}>
              {previewing ? 'Playing cue…' : 'Preview cue'}
            </button>
          </section>
        )}

        {step === 1 && (
          <section className="mt-4 space-y-3">
            <h3 className="font-display text-sm font-semibold">2 · Link a goal or affirmation</h3>
            <p className="text-sm text-muted">Reactivated softly during REM as targeted memory reactivation.</p>
            {goals.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {goals.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className="chip"
                    data-active={config.linkedGoalId === g.id}
                    onClick={() =>
                      setConfig((x) => ({
                        ...x,
                        linkedGoalId: g.id,
                        linkedGoalTitle: g.title,
                      }))
                    }
                  >
                    {g.title}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">No Vision Board goals yet — you can still use an affirmation.</p>
            )}
            {affirmations.length > 0 && (
              <div className="space-y-1">
                <p className="field-label">Affirmation</p>
                {affirmations.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className="chip block w-full justify-start text-left"
                    data-active={config.linkedAffirmation === a}
                    onClick={() => setConfig((x) => ({ ...x, linkedAffirmation: a }))}
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {(step === 2 || step === 3) && (
          <section className="mt-4 space-y-3">
            <h3 className="font-display text-sm font-semibold">
              {CHECKS[step - 2]!.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted">{CHECKS[step - 2]!.body}</p>
            <button
              type="button"
              className="btn btn-teal"
              disabled={previewing}
              onClick={() => void previewCue()}
            >
              {previewing ? 'Cue playing…' : 'Play cue with this check'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const n = step - 1
                setCheckDone((d) => ({ ...d, [n]: true }))
                setConfig((x) => ({
                  ...x,
                  realityChecksCompleted: Object.values({ ...checkDone, [n]: true }).filter(Boolean)
                    .length,
                }))
                setStep((s) => s + 1)
              }}
            >
              I paired the cue ✓
            </button>
          </section>
        )}

        {step >= 4 && (
          <section className="mt-4 space-y-2">
            <p className="text-sm text-ink">
              Conditioning complete. Cues stay locked out for the first 75 minutes, then fire only in
              high-confidence REM windows with arousal abort protection.
            </p>
          </section>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          {step > 0 && step < 4 && (
            <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          )}
          {step < 2 && (
            <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)}>
              Next
            </button>
          )}
          {step >= 4 && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canFinish}
              onClick={() =>
                onComplete({
                  ...config,
                  enabled: true,
                  realityChecksCompleted: 2,
                })
              }
            >
              Begin night with Lucid Cueing
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
