import { useEffect, useMemo, useState } from 'react'
import { AMBIENT_GROUPS, AMBIENTS } from '../../data/ambients'
import { INTENT_CATEGORIES, getIssue, issuesForCategory } from '../../data/issues'
import { MOOD_LABELS, getTrack, tracksForMood } from '../../data/moodTracks'
import { mixEngine } from '../../audio/MixEngine'
import { psychoEngine } from '../../audio/PsychoacousticEngine'
import { downloadPreviewWav } from '../../audio/previewExport'
import { useMixEngine } from '../../hooks/useMixEngine'
import { usePsychoEngine } from '../../hooks/usePsychoEngine'
import { useSessionTimer, formatElapsed } from '../../hooks/useSessionTimer'
import { useTheme } from '../../hooks/useTheme'
import {
  BRAINWAVE_RANGES,
  CREATE_STEPS,
  SOLFEGGIO_HZ,
  createDefaultSession,
  type BrainwaveBand,
  type CreateSession,
  type CreateStep,
  type EntrainmentType,
  type IntentCategory,
  type MoodCategory,
} from '../../types/studio'
import { ThemeToggle } from '../ThemeToggle'
import { AdvancedEngineeringPanel } from './AdvancedEngineeringPanel'
import { AiScriptArchitect } from './AiScriptArchitect'
import { VoiceDeliveryPanel } from './VoiceDeliveryPanel'

interface Props {
  onHome: () => void
}

export function CreateSubliminal({ onHome }: Props) {
  const { theme, toggleTheme } = useTheme()
  const engine = useMixEngine()
  const psycho = usePsychoEngine()
  const [session, setSession] = useState<CreateSession>(() => createDefaultSession())
  const [issueQuery, setIssueQuery] = useState('')
  const [completeFlash, setCompleteFlash] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState<string | null>(null)
  const elapsed = useSessionTimer(engine.transport)

  const exportWav = async () => {
    if (exporting) return
    setExporting(true)
    setExportMsg('Rendering 12s preview WAV…')
    try {
      await downloadPreviewWav(session, 12)
      setExportMsg('Downloaded — open the WAV on your computer to hear it.')
    } catch {
      setExportMsg('Could not export preview WAV.')
    } finally {
      setExporting(false)
      window.setTimeout(() => setExportMsg(null), 6000)
    }
  }

  useEffect(() => {
    engine.sync(session)
  }, [session, engine.sync])

  useEffect(() => {
    if (psycho.playing) psychoEngine.applyPreset(session.advancedPsycho)
  }, [session.advancedPsycho, psycho.playing])

  const patch = (p: Partial<CreateSession>) => setSession((s) => ({ ...s, ...p }))
  const go = (step: CreateStep) => patch({ step })

  const previewWithTools = async () => {
    await engine.play(session)
    const ctx = mixEngine.getContext()
    if (!psycho.playing) {
      await psychoEngine.start({ withDemoSources: true, context: ctx ?? undefined })
    }
    psychoEngine.applyPreset(session.advancedPsycho)
    const tap = psychoEngine.getMixTap()
    if (tap) mixEngine.connectAdvancedTap(tap)
  }

  const stopPreview = () => {
    mixEngine.connectAdvancedTap(null)
    engine.stop()
    psycho.stop()
  }

  const completeTrack = () => {
    patch({ completed: true })
    setCompleteFlash(true)
    window.setTimeout(() => setCompleteFlash(false), 4000)
  }

  const issues = useMemo(() => {
    if (!session.category || session.category === 'custom') return []
    const list = issuesForCategory(session.category)
    const q = issueQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter((x) => x.label.toLowerCase().includes(q))
  }, [session.category, issueQuery])

  const selectIssue = (id: string) => {
    const issue = getIssue(id)
    if (!issue) return
    patch({
      issueId: id,
      frequency: {
        ...session.frequency,
        hz: issue.recommendedHz[0] ?? 528,
        band: issue.recommendedBand,
        beatHz:
          issue.recommendedBand === 'custom'
            ? session.frequency.beatHz
            : BRAINWAVE_RANGES[issue.recommendedBand].hz,
      },
      voice: {
        ...session.voice,
        script: issue.sampleAffirmations.join(' '),
      },
      step: 'frequency',
    })
  }

  const stepIndex = CREATE_STEPS.findIndex((s) => s.id === session.step)

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            stopPreview()
            onHome()
          }}
        >
          ← Home
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-extrabold">Create Subliminal</h1>
          <p className="text-sm text-muted">Sculpt Your Subconscious. · Own Your Frequency.</p>
        </div>
        <div className="ml-auto">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      {/* Step nav — jump allowed */}
      <nav className="mb-5 flex flex-wrap gap-1.5" aria-label="Creation steps">
        {CREATE_STEPS.map((s, i) => {
          const locked =
            s.id === 'issue' && (!session.category || session.category === 'custom')
          const done = i < stepIndex
          return (
            <button
              key={s.id}
              type="button"
              className="chip"
              data-active={session.step === s.id}
              disabled={locked && s.id === 'issue'}
              onClick={() => {
                if (s.id === 'issue' && session.category === 'custom') {
                  go('frequency')
                  return
                }
                go(s.id)
              }}
            >
              <span className="opacity-70">{s.n}.</span> {s.label}
              {done ? ' ✓' : ''}
            </button>
          )
        })}
      </nav>

      {/* Transport strip */}
      <div className="panel mb-5 flex flex-wrap items-center gap-3 px-4 py-3">
        {engine.transport === 'playing' ? (
          <button type="button" className="btn btn-primary btn-icon" aria-label="Pause" onClick={engine.pause}>
            ❚❚
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-icon"
            aria-label="Play"
            onClick={() => engine.play(session)}
          >
            ▶
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label="Stop"
          onClick={stopPreview}
        >
          ■
        </button>
        <span className="font-display tabular-nums">{formatElapsed(elapsed)}</span>
        <button
          type="button"
          className="btn btn-teal text-xs"
          disabled={exporting}
          onClick={() => void exportWav()}
        >
          {exporting ? 'Rendering…' : 'Download 12s WAV'}
        </button>
        <label className="ml-auto flex min-w-[12rem] items-center gap-2">
          <span className="field-label mb-0">Master</span>
          <input
            className="field-range"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={session.masterVolume}
            onChange={(e) => {
              const v = Number(e.target.value)
              patch({ masterVolume: v })
              engine.setMasterVolume(v)
            }}
          />
          <span className="text-[11px] tabular-nums text-muted">
            {Math.round(session.masterVolume * 100)}%
          </span>
        </label>
      </div>
      <div className="mb-4 rounded-xl border border-[color-mix(in_oklab,#fbbf24_35%,transparent)] bg-[color-mix(in_oklab,#fbbf24_8%,transparent)] px-3 py-2 text-[12px] leading-snug text-ink">
        This cloud machine has <strong>no speakers</strong>, so ▶ playback cannot be heard here.
        Use <strong>Download 12s WAV</strong> and open the file on your computer to audition the
        mix.
        {exportMsg ? <span className="mt-1 block text-muted">{exportMsg}</span> : null}
      </div>

      {/* Steps */}
      {session.step === 'intent' && (
        <section className="panel p-5">
          <h2 className="panel-title mb-1 text-lg">Step 1 · Choose Intent</h2>
          <p className="mb-4 text-sm text-muted">Pick a category or define a custom intent.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {INTENT_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className="chip flex min-h-[5.5rem] flex-col items-start justify-center px-4 py-3 text-left"
                data-active={session.category === c.id}
                onClick={() => {
                  const next: Partial<CreateSession> = {
                    category: c.id as IntentCategory,
                    issueId: null,
                  }
                  if (c.id === 'custom') {
                    next.step = 'frequency'
                  } else {
                    next.step = 'issue'
                  }
                  patch(next)
                }}
              >
                <span className="font-display font-bold">{c.label}</span>
                <span className="text-xs text-muted">{c.blurb}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {session.step === 'issue' && session.category && session.category !== 'custom' && (
        <section className="panel p-5">
          <h2 className="panel-title mb-1 text-lg">Step 2 · Specific Issue</h2>
          <p className="mb-3 text-sm text-muted">
            {INTENT_CATEGORIES.find((c) => c.id === session.category)?.label} — search and select.
          </p>
          <input
            className="field-input mb-4 max-w-md"
            placeholder="Filter issues…"
            value={issueQuery}
            onChange={(e) => setIssueQuery(e.target.value)}
          />
          <div className="grid max-h-[28rem] gap-2 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
            {issues.map((issue) => (
              <button
                key={issue.id}
                type="button"
                className="chip flex flex-col items-start px-3 py-2.5 text-left"
                data-active={session.issueId === issue.id}
                onClick={() => selectIssue(issue.id)}
              >
                <span className="text-sm font-semibold">{issue.label}</span>
                <span className="text-[0.7rem] text-muted">
                  Rec: {issue.recommendedHz.join(' / ')} Hz · {issue.recommendedBand}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {session.step === 'frequency' && (
        <FrequencyStep
          session={session}
          onChange={(frequency) => patch({ frequency })}
          onNext={() => go('soundtrack')}
          custom={session.category === 'custom'}
          customName={session.custom.name}
          customLines={session.custom.affirmations}
          onCustom={(custom) => patch({ custom })}
        />
      )}

      {session.step === 'soundtrack' && (
        <SoundtrackStep
          session={session}
          onChange={(soundtrack) => patch({ soundtrack })}
          onNext={() => go('ambient')}
        />
      )}

      {session.step === 'ambient' && (
        <AmbientStep
          session={session}
          onChange={(ambients) => patch({ ambients })}
          onNext={() => go('voice')}
        />
      )}

      {session.step === 'voice' && (
        <VoiceStep
          session={session}
          onChange={(voice) => patch({ voice })}
          onNext={() => go('mix')}
        />
      )}

      {session.step === 'mix' && (
        <MixStep
          session={session}
          onPatch={patch}
          onPlay={() => engine.play(session)}
          psychoPlaying={psycho.playing}
          analysers={psycho.analysers}
          isolateVoice={psycho.state.isolateVoice}
          checkMasking={psycho.state.checkMasking}
          onIsolateVoice={psycho.setIsolateVoice}
          onCheckMasking={psycho.setCheckMasking}
          onPreview={previewWithTools}
          onStopPreview={stopPreview}
          onComplete={completeTrack}
          completeFlash={completeFlash}
        />
      )}
    </div>
  )
}

function FrequencyStep({
  session,
  onChange,
  onNext,
  custom,
  customName,
  customLines,
  onCustom,
}: {
  session: CreateSession
  onChange: (f: CreateSession['frequency']) => void
  onNext: () => void
  custom: boolean
  customName: string
  customLines: string[]
  onCustom: (c: CreateSession['custom']) => void
}) {
  const f = session.frequency
  const patch = (p: Partial<typeof f>) => onChange({ ...f, ...p })
  return (
    <section className="panel space-y-4 p-5">
      <h2 className="panel-title text-lg">Step 3 · Frequency & Entrainment</h2>
      {custom && (
        <div className="rounded-xl border border-border bg-bg/40 p-3">
          <label className="field-label">Custom intent name</label>
          <input
            className="field-input mb-2"
            value={customName}
            onChange={(e) => onCustom({ name: e.target.value, affirmations: customLines, targetHz: f.hz })}
          />
          <label className="field-label">Affirmation lines</label>
          <textarea
            className="field-textarea min-h-[5rem]"
            value={customLines.join('\n')}
            onChange={(e) =>
              onCustom({
                name: customName,
                affirmations: e.target.value.split('\n'),
                targetHz: f.hz,
              })
            }
          />
        </div>
      )}
      <div>
        <span className="field-label">Solfeggio & healing</span>
        <div className="flex flex-wrap gap-1.5">
          {SOLFEGGIO_HZ.map((hz) => (
            <button
              key={hz}
              type="button"
              className="chip"
              data-active={f.hz === hz}
              onClick={() => patch({ hz })}
            >
              {hz} Hz
            </button>
          ))}
        </div>
      </div>
      <label className="block max-w-xs">
        <span className="field-label">Custom Hz</span>
        <input
          className="field-input"
          type="number"
          min={1}
          max={20000}
          step={0.01}
          value={f.hz}
          onChange={(e) => patch({ hz: Number(e.target.value) })}
        />
      </label>
      <button
        type="button"
        className="chip"
        data-active={f.harmonicShimmer}
        onClick={() => patch({ harmonicShimmer: !f.harmonicShimmer })}
      >
        Harmonic shimmer
      </button>
      <div>
        <span className="field-label">Entrainment</span>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['off', 'Off'],
              ['binaural', 'Binaural Beats'],
              ['monaural', 'Monaural Beats'],
              ['isochronic', 'Isochronic Pulses'],
              ['pure', 'Pure Harmonic Tone'],
            ] as [EntrainmentType, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="chip chip-teal"
              data-active={f.entrainment === id}
              onClick={() => patch({ entrainment: id })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="field-label">Brainwave band</span>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(BRAINWAVE_RANGES) as Exclude<BrainwaveBand, 'custom'>[]).map((b) => (
            <button
              key={b}
              type="button"
              className="chip"
              data-active={f.band === b}
              onClick={() =>
                patch({ band: b, beatHz: BRAINWAVE_RANGES[b].hz })
              }
            >
              {BRAINWAVE_RANGES[b].label}
            </button>
          ))}
        </div>
      </div>
      <label className="block max-w-xs">
        <span className="field-label">Custom beat Hz</span>
        <input
          className="field-input"
          type="number"
          min={0.5}
          max={100}
          step={0.01}
          value={f.beatHz}
          onChange={(e) => patch({ band: 'custom', beatHz: Number(e.target.value) })}
        />
      </label>
      <button
        type="button"
        className="chip"
        data-active={f.progressiveRamp}
        onClick={() => patch({ progressiveRamp: !f.progressiveRamp })}
      >
        Progressive ramp
      </button>
      {f.progressiveRamp && (
        <div className="flex flex-wrap gap-3">
          <label>
            <span className="field-label">Start Hz</span>
            <input
              className="field-input w-24"
              type="number"
              value={f.rampStartHz}
              onChange={(e) => patch({ rampStartHz: Number(e.target.value) })}
            />
          </label>
          <label>
            <span className="field-label">End Hz</span>
            <input
              className="field-input w-24"
              type="number"
              value={f.rampEndHz}
              onChange={(e) => patch({ rampEndHz: Number(e.target.value) })}
            />
          </label>
        </div>
      )}
      <button type="button" className="btn btn-primary" onClick={onNext}>
        Next · Soundtrack
      </button>
    </section>
  )
}

function SoundtrackStep({
  session,
  onChange,
  onNext,
}: {
  session: CreateSession
  onChange: (s: CreateSession['soundtrack']) => void
  onNext: () => void
}) {
  const moods = Object.keys(MOOD_LABELS) as MoodCategory[]
  const tracks = tracksForMood(session.soundtrack.mood)
  return (
    <section className="panel space-y-4 p-5">
      <h2 className="panel-title text-lg">Step 4 · Soundtrack by Mood</h2>
      <p className="text-sm text-muted">
        Calming includes real music beds. Other moods use procedural synth beds. Press ▶ Play to hear
        the selection.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {moods.map((m) => (
          <button
            key={m}
            type="button"
            className="chip chip-teal"
            data-active={session.soundtrack.mood === m}
            onClick={() => {
              const first = tracksForMood(m)[0]
              onChange({
                ...session.soundtrack,
                mood: m,
                trackId: first?.id ?? session.soundtrack.trackId,
              })
            }}
          >
            {MOOD_LABELS[m]}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {tracks.map((t) => (
          <button
            key={t.id}
            type="button"
            className="chip flex flex-col items-start px-3 py-3 text-left"
            data-active={session.soundtrack.trackId === t.id}
            onClick={() => onChange({ ...session.soundtrack, trackId: t.id })}
          >
            <span className="font-display text-sm font-bold">
              {t.name}
              {t.audioSrc ? (
                <span className="ml-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-teal">
                  Audio
                </span>
              ) : null}
            </span>
            <span className="text-[0.7rem] text-muted">{t.blurb}</span>
          </button>
        ))}
      </div>
      <label className="block max-w-xs">
        <span className="field-label">Track volume</span>
        <input
          className="field-range"
          type="range"
          min={0}
          max={0.7}
          step={0.01}
          value={session.soundtrack.volume}
          onChange={(e) =>
            onChange({ ...session.soundtrack, volume: Number(e.target.value) })
          }
        />
      </label>
      <button type="button" className="btn btn-primary" onClick={onNext}>
        Next · Ambient
      </button>
    </section>
  )
}

function AmbientStep({
  session,
  onChange,
  onNext,
}: {
  session: CreateSession
  onChange: (a: CreateSession['ambients']) => void
  onNext: () => void
}) {
  const toggle = (id: string) => {
    const existing = session.ambients.find((a) => a.id === id)
    if (existing) {
      onChange(
        session.ambients.map((a) =>
          a.id === id ? { ...a, enabled: !a.enabled } : a,
        ),
      )
    } else {
      onChange([...session.ambients, { id, enabled: true, gain: 0.2 }])
    }
  }
  const setGain = (id: string, gain: number) => {
    onChange(
      session.ambients.map((a) => (a.id === id ? { ...a, gain } : a)),
    )
  }
  return (
    <section className="panel space-y-5 p-5">
      <h2 className="panel-title text-lg">Step 5 · Ambient Sounds</h2>
      <p className="text-sm text-muted">Multi-select with per-sound gain.</p>
      {AMBIENT_GROUPS.map((g) => (
        <div key={g.id}>
          <h3 className="mb-2 text-sm font-semibold text-teal">{g.label}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {AMBIENTS.filter((a) => a.group === g.id).map((a) => {
              const st = session.ambients.find((x) => x.id === a.id)
              const on = !!st?.enabled
              return (
                <div key={a.id} className="rounded-xl border border-border bg-bg/35 p-3">
                  <button
                    type="button"
                    className="chip w-full justify-start"
                    data-active={on}
                    onClick={() => toggle(a.id)}
                  >
                    {a.label}
                  </button>
                  {on && (
                    <input
                      className="field-range mt-2"
                      type="range"
                      min={0}
                      max={0.6}
                      step={0.01}
                      value={st?.gain ?? 0.2}
                      onChange={(e) => setGain(a.id, Number(e.target.value))}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-primary" onClick={onNext}>
        Next · Voice
      </button>
    </section>
  )
}

function VoiceStep({
  session,
  onChange,
  onNext,
}: {
  session: CreateSession
  onChange: (v: CreateSession['voice']) => void
  onNext: () => void
}) {
  const v = session.voice
  return (
    <section className="panel space-y-5 p-5">
      <div>
        <h2 className="panel-title text-lg">Step 6 · Voice / Narration</h2>
        <p className="mt-1 text-sm text-muted">
          Architect your script, then route it through Record, Clone, or Narrator into the Voice bus.
        </p>
      </div>

      <AiScriptArchitect
        intake={v.intake}
        generated={v.generated}
        activeFormat={v.activeFormat}
        onIntakeChange={(intake) => onChange({ ...v, intake })}
        onGenerated={(generated) => onChange({ ...v, generated })}
        onUseScript={(format, text) =>
          onChange({ ...v, script: text, activeFormat: format })
        }
      />

      <VoiceDeliveryPanel voice={v} onChange={onChange} />

      <button type="button" className="btn btn-primary" onClick={onNext}>
        Next · Mix
      </button>
    </section>
  )
}

function MixStep({
  session,
  onPatch,
  onPlay,
  psychoPlaying,
  analysers,
  isolateVoice,
  checkMasking,
  onIsolateVoice,
  onCheckMasking,
  onPreview,
  onStopPreview,
  onComplete,
  completeFlash,
}: {
  session: CreateSession
  onPatch: (p: Partial<CreateSession>) => void
  onPlay: () => void
  psychoPlaying: boolean
  analysers: ReturnType<typeof usePsychoEngine>['analysers']
  isolateVoice: boolean
  checkMasking: boolean
  onIsolateVoice: (on: boolean) => void
  onCheckMasking: (on: boolean) => void
  onPreview: () => void
  onStopPreview: () => void
  onComplete: () => void
  completeFlash: boolean
}) {
  const issue = session.issueId ? getIssue(session.issueId) : null
  const track = getTrack(session.soundtrack.trackId)
  const p = session.psycho
  return (
    <div className="space-y-5">
      <section className="panel space-y-4 p-5">
        <h2 className="panel-title text-lg">Mix · Preview & Complete</h2>
        <ul className="space-y-1 text-sm text-muted">
          <li>
            Intent:{' '}
            <span className="text-ink">
              {session.category === 'custom'
                ? session.custom.name || 'Custom'
                : issue?.label ?? session.category}
            </span>
          </li>
          <li>
            Carrier: <span className="text-ink">{session.frequency.hz} Hz</span> ·{' '}
            {session.frequency.entrainment}
          </li>
          <li>
            Soundtrack: <span className="text-ink">{track?.name}</span>
          </li>
          <li>
            Ambients:{' '}
            <span className="text-ink">
              {session.ambients.filter((a) => a.enabled).length || 'none'}
            </span>
          </li>
          <li>
            Voice: <span className="text-ink">{session.voice.mode}</span>
          </li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="chip"
            data-active={p.autoDuck}
            onClick={() => onPatch({ psycho: { ...p, autoDuck: !p.autoDuck } })}
          >
            Auto-duck / spectral tuck
          </button>
          <button
            type="button"
            className="chip"
            data-active={p.multiLayerStack}
            onClick={() => onPatch({ psycho: { ...p, multiLayerStack: !p.multiLayerStack } })}
          >
            Multi-layer whisper stack
          </button>
          <button
            type="button"
            className="chip"
            data-active={p.highCarrierMod}
            onClick={() => onPatch({ psycho: { ...p, highCarrierMod: !p.highCarrierMod } })}
          >
            High-carrier modulation
          </button>
          {(['static', 'bilateral', 'hrtf'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className="chip chip-teal"
              data-active={p.spatial === m}
              onClick={() => onPatch({ psycho: { ...p, spatial: m } })}
            >
              {m === 'hrtf' ? '3D HRTF Orbit' : m === 'bilateral' ? 'Bilateral Drift' : 'Static Stereo'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={onPlay}>
            Play base mix
          </button>
          {!psychoPlaying ? (
            <button type="button" className="btn btn-teal" onClick={onPreview}>
              Preview with tools
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={onStopPreview}>
              Stop preview
            </button>
          )}
          <button type="button" className="btn btn-primary px-6" onClick={onComplete}>
            {session.completed ? 'Track completed ✓' : 'Complete track'}
          </button>
        </div>
        {(completeFlash || session.completed) && (
          <p className="rounded-lg border border-[color-mix(in_oklab,var(--accent)_40%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] px-3 py-2 text-sm text-ink">
            Track locked with your advanced engineering chain. Reopen anytime from Saved Mixes.
          </p>
        )}
      </section>

      <section className="panel space-y-4 p-5">
        <AdvancedEngineeringPanel
          advanced={session.advancedPsycho}
          onChange={(advancedPsycho) => onPatch({ advancedPsycho })}
          analysers={analysers}
          enginePlaying={psychoPlaying}
          onPreview={onPreview}
          onStopPreview={onStopPreview}
          isolateVoice={isolateVoice}
          checkMasking={checkMasking}
          onIsolateVoice={onIsolateVoice}
          onCheckMasking={onCheckMasking}
        />
      </section>
    </div>
  )
}
