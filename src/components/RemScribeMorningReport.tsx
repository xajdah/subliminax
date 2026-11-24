import { useMemo, useState } from 'react'
import { interpretDream } from '../services/dreamInterpreter'
import {
  ACOUSTIC_EVENT_LABELS,
  type AcousticEvent,
  type AcousticEventKind,
  type DreamLog,
  type HypnogramSample,
  type RemScribeSession,
  type SleepStage,
} from '../types/remscribe'

interface Props {
  session: RemScribeSession
  onBack: () => void
  onUpdateDream: (dream: DreamLog) => void
}

const STAGE_COLOR: Record<SleepStage, string> = {
  awake: '#a8a29e',
  light: '#5eead4',
  deep: '#1e3a5f',
  rem: '#c4a484',
}

const STAGE_Y: Record<SleepStage, number> = {
  awake: 8,
  light: 28,
  rem: 48,
  deep: 68,
}

function formatClock(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRel(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

export function RemScribeMorningReport({ session, onBack, onUpdateDream }: Props) {
  const [selectedEvent, setSelectedEvent] = useState<AcousticEvent | null>(null)
  const [interpretingId, setInterpretingId] = useState<string | null>(null)
  const metrics = session.metrics
  const durationSec = session.endedAt
    ? (session.endedAt - session.startedAt) / 1000
    : session.config.durationHours * 3600

  const hypnoPath = useMemo(
    () => buildHypnogramPath(session.hypnogram, durationSec),
    [session.hypnogram, durationSec],
  )

  const interpret = async (dream: DreamLog) => {
    setInterpretingId(dream.id)
    // Brief async feel for UX
    await new Promise((r) => setTimeout(r, 450))
    const interpretation = interpretDream({
      transcript: dream.transcript,
      language: dream.language,
      affirmations: session.config.linkedAffirmations,
      goalNames: session.config.linkedGoalNames,
    })
    onUpdateDream({ ...dream, interpretation })
    setInterpretingId(null)
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← REMscribe
        </button>
        <div>
          <h1 className="font-display text-2xl font-extrabold">Morning Sleep & Subconscious Report</h1>
          <p className="text-sm text-muted">
            {new Date(session.startedAt).toLocaleString()} ·{' '}
            {session.config.durationHours.toFixed(1)}h session · {session.config.language}
          </p>
        </div>
      </header>

      {metrics && (
        <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total Sleep" value={`${metrics.totalSleepMin} min`} />
          <MetricCard label="Deep Delta" value={`${metrics.deepPct}%`} />
          <MetricCard label="REM" value={`${metrics.remPct}%`} />
          <MetricCard
            label="Efficiency"
            value={`${metrics.efficiencyScore}`}
            hint={`${metrics.noiseDisturbanceCount} noise events`}
          />
        </section>
      )}

      <section className="panel mb-6 space-y-3 p-5">
        <h2 className="panel-title text-lg">Overnight Hypnogram & Event Timeline</h2>
        <p className="text-sm text-muted">
          Estimated stages from the adaptive sleep curve, with acoustic event pins.
        </p>
        <div className="relative overflow-x-auto">
          <svg viewBox="0 0 800 100" className="h-40 w-full min-w-[640px]" role="img" aria-label="Hypnogram">
            <rect x="0" y="0" width="800" height="100" fill="var(--panel)" />
            {(['awake', 'light', 'rem', 'deep'] as SleepStage[]).map((st) => (
              <text
                key={st}
                x="4"
                y={STAGE_Y[st] + 4}
                fill="var(--muted)"
                fontSize="9"
                fontFamily="var(--font-display)"
              >
                {st}
              </text>
            ))}
            <path d={hypnoPath} fill="none" stroke="var(--accent)" strokeWidth="2.2" />
            {session.events.map((ev) => {
              const x = 48 + (ev.relativeSec / Math.max(1, durationSec)) * 740
              return (
                <g key={ev.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedEvent(ev)}>
                  <circle cx={x} cy={12} r="5" fill={eventColor(ev.kind)} />
                  <title>{ACOUSTIC_EVENT_LABELS[ev.kind]}</title>
                </g>
              )
            })}
          </svg>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted">
          {(Object.keys(STAGE_COLOR) as SleepStage[]).map((st) => (
            <span key={st} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: STAGE_COLOR[st] }} />
              {st}
            </span>
          ))}
        </div>
        {selectedEvent && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display font-semibold text-ink">
                {ACOUSTIC_EVENT_LABELS[selectedEvent.kind]}
              </p>
              <p className="text-xs text-muted">
                {formatClock(selectedEvent.timestamp)} · +{formatRel(selectedEvent.relativeSec)}
              </p>
            </div>
            {selectedEvent.clipUrl ? (
              <audio className="mt-2 w-full" controls src={selectedEvent.clipUrl} />
            ) : (
              <p className="mt-2 text-sm text-muted">No clip retained for this event.</p>
            )}
          </div>
        )}
      </section>

      <section className="panel space-y-4 p-5">
        <h2 className="panel-title text-lg">Dream Transcripts</h2>
        {session.dreams.length === 0 ? (
          <p className="text-sm text-muted">
            No dreams captured. Say the wake word “Record” (or your language equivalent) during the night.
          </p>
        ) : (
          session.dreams.map((dream) => (
            <article
              key={dream.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-display font-semibold text-ink">
                  Dream · {formatClock(dream.timestamp)}
                </p>
                <span className="text-xs text-muted">+{formatRel(dream.relativeSec)}</span>
              </div>
              {dream.clipUrl && <audio className="mb-3 w-full" controls src={dream.clipUrl} />}
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{dream.transcript}</p>
              {dream.interpretation ? (
                <div className="mt-3 space-y-2 rounded-md border border-[color-mix(in_oklab,var(--accent)_35%,transparent)] bg-[color-mix(in_oklab,var(--accent)_8%,transparent)] p-3 text-sm">
                  <p className="font-display font-semibold">Interpretation</p>
                  <p>
                    <span className="text-muted">Tone:</span> {dream.interpretation.emotionalTone}
                  </p>
                  {dream.interpretation.symbols.length > 0 && (
                    <p>
                      <span className="text-muted">Symbols:</span>{' '}
                      {dream.interpretation.symbols.join(', ')}
                    </p>
                  )}
                  <p className="leading-relaxed">{dream.interpretation.summary}</p>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary mt-3"
                  disabled={interpretingId === dream.id}
                  onClick={() => void interpret(dream)}
                >
                  {interpretingId === dream.id ? 'Interpreting…' : '✨ Interpret Dream'}
                </button>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  )
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="panel p-4">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

function eventColor(kind: AcousticEventKind): string {
  switch (kind) {
    case 'dreamRecorded':
      return '#c4a484'
    case 'gasping':
      return '#b91c1c'
    case 'snoring':
      return '#64748b'
    case 'catMeow':
      return '#ea580c'
    case 'bellChime':
      return '#eab308'
    default:
      return '#0d9488'
  }
}

function buildHypnogramPath(samples: HypnogramSample[], durationSec: number): string {
  if (samples.length === 0 || durationSec <= 0) {
    return 'M 48 28 L 788 28'
  }
  const pts = samples.map((s) => {
    const x = 48 + (s.relativeSec / durationSec) * 740
    const y = STAGE_Y[s.stage]
    return `${x.toFixed(1)},${y}`
  })
  return `M ${pts.join(' L ')}`
}
