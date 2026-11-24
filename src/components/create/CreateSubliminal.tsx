import { useEffect, useMemo, useRef, useState } from 'react'
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
  linearGainToDbFs,
  type ManifestationMode,
} from '../../audio/manifestationCalibration'
import { applyOptimalMixLevels } from '../../data/mixLevels'
import { savedMixStorage, titleForSession } from '../../services/savedMixStorage'
import type { SavedMix } from '../../types/savedMix'
import type { PsychoacousticState } from '../../types/psychoacoustic'
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
  type TransportState,
} from '../../types/studio'
import { MixBalanceDeck, type MixBusKey } from '../MixBalanceDeck'
import { ThemeToggle } from '../ThemeToggle'
import { AdvancedEngineeringPanel } from './AdvancedEngineeringPanel'
import { AiScriptArchitect } from './AiScriptArchitect'
import { VoiceDeliveryPanel } from './VoiceDeliveryPanel'

interface Props {
  onHome: () => void
  /** Re-open a mix from Saved Tracks */
  initialMix?: SavedMix | null
  onOpenSaved?: () => void
}

export function CreateSubliminal({ onHome, initialMix = null, onOpenSaved }: Props) {
  const { theme, toggleTheme } = useTheme()
  const engine = useMixEngine()
  const psycho = usePsychoEngine()
  const mixIdRef = useRef<string | undefined>(initialMix?.id)
  const [session, setSession] = useState<CreateSession>(() =>
    normalizeSession(
      initialMix ? structuredClone(initialMix.session) : createDefaultSession(),
    ),
  )
  const [issueQuery, setIssueQuery] = useState('')
  const [completeFlash, setCompleteFlash] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
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

  const patch = (p: Partial<CreateSession>) =>
    setSession((s) => ({
      ...s,
      ...p,
      // Any manual level edit clears the Optimal preset flag unless explicitly set
      optimalLevels:
        p.optimalLevels !== undefined
          ? p.optimalLevels
          : p.masterVolume !== undefined ||
              p.ambientBusGain !== undefined ||
              p.soundtrack !== undefined ||
              p.frequency !== undefined ||
              p.voice !== undefined
            ? false
            : s.optimalLevels,
    }))
  const go = (step: CreateStep) => patch({ step })

  const applyOptimal = (mode: ManifestationMode = 'standard') => {
    setSession((s) => {
      const next = applyOptimalMixLevels(s, mode)
      next.advancedPsycho = {
        ...next.advancedPsycho,
        buses: {
          music: linearGainToDbFs(next.soundtrack.volume),
          soundscape: linearGainToDbFs(next.ambientBusGain),
          frequency: linearGainToDbFs(next.frequency.volume),
          voice: linearGainToDbFs(next.voice.volume),
        },
      }
      return next
    })
    psychoEngine.applyManifestationCalibration(mode)
  }

  const sessionMixLevels = {
    soundtrackDb: linearGainToDbFs(session.soundtrack.volume),
    ambientDb: linearGainToDbFs(session.ambientBusGain),
    frequencyDb: linearGainToDbFs(session.frequency.volume),
    voiceDb: linearGainToDbFs(session.voice.volume),
  }

  const onMixBusChange = (bus: MixBusKey, db: number) => {
    const lin = Math.pow(10, db / 20)
    if (bus === 'soundtrack') {
      patch({ soundtrack: { ...session.soundtrack, volume: lin } })
      if (psycho.playing) psychoEngine.setBusDb('music', db)
    } else if (bus === 'ambient') {
      patch({ ambientBusGain: lin })
      if (psycho.playing) psychoEngine.setBusDb('soundscape', db)
    } else if (bus === 'frequency') {
      patch({ frequency: { ...session.frequency, volume: lin } })
      if (psycho.playing) psychoEngine.setBusDb('frequency', db)
    } else {
      patch({ voice: { ...session.voice, volume: lin } })
      if (psycho.playing) psychoEngine.setBusDb('voice', db)
    }
  }

  const previewWithTools = async (overridePsycho?: PsychoacousticState) => {
    const psychoState = overridePsycho ?? session.advancedPsycho
    await engine.play(session)
    const ctx = mixEngine.getContext()
    if (!psycho.playing) {
      // MixEngine already supplies the audible beds — skip demo oscillators (they were the buzz)
      await psychoEngine.start({ withDemoSources: false, context: ctx ?? undefined })
    }
    psychoEngine.applyPreset(psychoState)
    const tap = psychoEngine.getMixTap()
    if (tap) mixEngine.connectAdvancedTap(tap)
  }

  const applyAdvancedLive = (advancedPsycho: PsychoacousticState) => {
    patch({ advancedPsycho })
    if (psycho.playing) psychoEngine.applyPreset(advancedPsycho)
  }

  const stopPreview = () => {
    mixEngine.connectAdvancedTap(null)
    engine.stop()
    psycho.stop()
  }

  const completeTrack = () => {
    const next: CreateSession = { ...session, completed: true, step: 'mix' }
    setSession(next)
    const saved = savedMixStorage.save({
      id: mixIdRef.current,
      title: titleForSession(next),
      session: next,
    })
    mixIdRef.current = saved.id
    setCompleteFlash(true)
    setSaveMsg(`Saved “${saved.title}” to Saved Tracks on this device.`)
    window.setTimeout(() => setCompleteFlash(false), 5000)
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
      <div className="panel mb-3 flex flex-wrap items-center gap-3 px-4 py-3">
        {engine.transport === 'playing' ? (
          <button type="button" className="btn btn-primary btn-icon" aria-label="Pause" onClick={engine.pause}>
            ❚❚
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-icon"
            aria-label="Play"
            onClick={() => {
              // On Soundtrack step, play only the selected bed — never frequency/voice
              if (session.step === 'soundtrack') {
                void engine.playSoundtrackSolo(session)
                return
              }
              void engine.play(session)
            }}
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
      </div>

      <div className="panel mb-5 flex flex-wrap items-center gap-3 px-4 py-3">
        <label className="flex min-w-[12rem] flex-1 items-center gap-2">
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
          <span className="w-10 text-right text-xs tabular-nums text-muted">
            {Math.round(session.masterVolume * 100)}%
          </span>
        </label>
      </div>

      {exportMsg ? (
        <p className="mb-4 text-[12px] text-muted" role="status">
          {exportMsg}
        </p>
      ) : null}

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
          transport={engine.transport}
          onChange={(soundtrack) => patch({ soundtrack })}
          onPlay={() => void engine.playSoundtrackSolo(session)}
          onPause={engine.pause}
          onStop={stopPreview}
          onAuditionTrack={(trackId) => {
            const next: CreateSession = {
              ...session,
              soundtrack: { ...session.soundtrack, trackId },
            }
            setSession(next)
            const sameSolo =
              engine.transport === 'playing' &&
              engine.soundtrackSolo &&
              session.soundtrack.trackId === trackId
            if (sameSolo) {
              stopPreview()
              return
            }
            void engine.playSoundtrackSolo(next)
          }}
          onNext={() => go('ambient')}
        />
      )}

      {session.step === 'ambient' && (
        <AmbientStep
          session={session}
          transport={engine.transport}
          onChange={(ambients) => patch({ ambients })}
          onPlay={() => void engine.play(session)}
          onPause={engine.pause}
          onStop={stopPreview}
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
          mixLevels={sessionMixLevels}
          manifestationMode={session.manifestationMode ?? 'standard'}
          onMixBusChange={onMixBusChange}
          onApplyCalibration={applyOptimal}
          onPatch={patch}
          onPlay={() => engine.play(session)}
          psychoPlaying={psycho.playing}
          analysers={psycho.analysers}
          isolateVoice={psycho.state.isolateVoice}
          checkMasking={psycho.state.checkMasking}
          onIsolateVoice={psycho.setIsolateVoice}
          onCheckMasking={psycho.setCheckMasking}
          onPreview={previewWithTools}
          onApplyAdvanced={applyAdvancedLive}
          onStopPreview={stopPreview}
          onComplete={completeTrack}
          onOpenSaved={onOpenSaved}
          saveMsg={saveMsg}
          completeFlash={completeFlash}
        />
      )}
    </div>
  )
}

function normalizeSession(raw: CreateSession): CreateSession {
  const withDefaults: CreateSession = {
    ...raw,
    ambientBusGain: raw.ambientBusGain ?? 0.36,
    optimalLevels: raw.optimalLevels ?? false,
    masterVolume: raw.masterVolume ?? 0.8,
    manifestationMode: raw.manifestationMode ?? 'standard',
  }
  // Legacy saves without manifestationMode → snap to standard calibration once
  if (raw.manifestationMode == null && raw.optimalLevels !== false) {
    return applyOptimalMixLevels(withDefaults, 'standard')
  }
  return withDefaults
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
      <label className="block max-w-xs">
        <span className="field-label">Frequency volume</span>
        <input
          className="field-range"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={f.volume}
          onChange={(e) => patch({ volume: Number(e.target.value) })}
        />
      </label>
      <button type="button" className="btn btn-primary" onClick={onNext}>
        Next · Soundtrack
      </button>
    </section>
  )
}

function StepPreviewControls({
  transport,
  onPlay,
  onPause,
  onStop,
}: {
  transport: TransportState
  onPlay: () => void
  onPause: () => void
  onStop: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {transport === 'playing' ? (
        <button type="button" className="btn btn-primary" onClick={onPause}>
          ❚❚ Pause preview
        </button>
      ) : (
        <button type="button" className="btn btn-primary" onClick={onPlay}>
          ▶ Play track
        </button>
      )}
      <button type="button" className="btn btn-ghost" onClick={onStop}>
        ■ Stop
      </button>
    </div>
  )
}

function SoundtrackStep({
  session,
  transport,
  onChange,
  onPlay,
  onPause,
  onStop,
  onAuditionTrack,
  onNext,
}: {
  session: CreateSession
  transport: TransportState
  onChange: (s: CreateSession['soundtrack']) => void
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onAuditionTrack: (trackId: string) => void
  onNext: () => void
}) {
  const moods = Object.keys(MOOD_LABELS) as MoodCategory[]
  const tracks = tracksForMood(session.soundtrack.mood)
  return (
    <section className="panel space-y-4 p-5">
      <h2 className="panel-title text-lg">Step 4 · Soundtrack by Mood</h2>
      <p className="text-sm text-muted">
        Each mood lists only its own beds — Calming and Energizing show their real music tracks;
        other moods use synth beds. ▶ on a tile (or Play track) auditions that bed alone — no
        frequency tone and no narration. Full mix plays later on Ambient / Mix. On cloud VMs
        without speakers, use <span className="text-ink">Download 12s WAV</span>.
      </p>
      <StepPreviewControls
        transport={transport}
        onPlay={onPlay}
        onPause={onPause}
        onStop={onStop}
      />
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
        {tracks.map((t) => {
          const selected = session.soundtrack.trackId === t.id
          const auditioning = selected && transport === 'playing'
          return (
            <div
              key={t.id}
              className="chip track-tile flex items-stretch gap-2 px-2 py-2 text-left"
              data-active={selected}
              data-auditioning={auditioning}
            >
              <button
                type="button"
                className="track-tile-play"
                aria-label={auditioning ? `Stop ${t.name}` : `Play ${t.name}`}
                title={auditioning ? 'Stop preview' : 'Preview this track'}
                onClick={(e) => {
                  e.stopPropagation()
                  onAuditionTrack(t.id)
                }}
              >
                {auditioning ? '❚❚' : '▶'}
              </button>
              <button
                type="button"
                className="flex min-w-0 flex-1 flex-col items-start rounded-md px-1 py-1 text-left"
                onClick={() => onChange({ ...session.soundtrack, trackId: t.id })}
              >
                <span className="font-display text-sm font-bold">
                  {t.name}
                  {t.audioSrc ? (
                    <span className="ml-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-teal">
                      Audio
                    </span>
                  ) : (
                    <span className="ml-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
                      Synth
                    </span>
                  )}
                </span>
                <span className="text-[0.7rem] text-muted">{t.blurb}</span>
              </button>
            </div>
          )
        })}
      </div>
      <label className="block max-w-xs">
        <span className="field-label">Track volume</span>
        <input
          className="field-range"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={session.soundtrack.volume}
          onChange={(e) =>
            onChange({ ...session.soundtrack, volume: Number(e.target.value) })
          }
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <StepPreviewControls
          transport={transport}
          onPlay={onPlay}
          onPause={onPause}
          onStop={onStop}
        />
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Next · Ambient
        </button>
      </div>
    </section>
  )
}

function AmbientStep({
  session,
  transport,
  onChange,
  onPlay,
  onPause,
  onStop,
  onNext,
}: {
  session: CreateSession
  transport: TransportState
  onChange: (a: CreateSession['ambients']) => void
  onPlay: () => void
  onPause: () => void
  onStop: () => void
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
      <p className="text-sm text-muted">
        Multi-select with per-sound gain. Ambient bus volume is in Mix levels above.
      </p>
      <StepPreviewControls
        transport={transport}
        onPlay={onPlay}
        onPause={onPause}
        onStop={onStop}
      />
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
      <div className="flex flex-wrap gap-2">
        <StepPreviewControls
          transport={transport}
          onPlay={onPlay}
          onPause={onPause}
          onStop={onStop}
        />
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Next · Voice
        </button>
      </div>
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
  mixLevels,
  manifestationMode,
  onMixBusChange,
  onApplyCalibration,
  onPatch,
  onPlay,
  psychoPlaying,
  analysers,
  isolateVoice,
  checkMasking,
  onIsolateVoice,
  onCheckMasking,
  onPreview,
  onApplyAdvanced,
  onStopPreview,
  onComplete,
  onOpenSaved,
  saveMsg,
  completeFlash,
}: {
  session: CreateSession
  mixLevels: {
    soundtrackDb: number
    ambientDb: number
    frequencyDb: number
    voiceDb: number
  }
  manifestationMode: ManifestationMode
  onMixBusChange: (bus: MixBusKey, db: number) => void
  onApplyCalibration: (mode: ManifestationMode) => void
  onPatch: (p: Partial<CreateSession>) => void
  onPlay: () => void
  psychoPlaying: boolean
  analysers: ReturnType<typeof usePsychoEngine>['analysers']
  isolateVoice: boolean
  checkMasking: boolean
  onIsolateVoice: (on: boolean) => void
  onCheckMasking: (on: boolean) => void
  onPreview: (overridePsycho?: PsychoacousticState) => void
  onApplyAdvanced: (advancedPsycho: PsychoacousticState) => void
  onStopPreview: () => void
  onComplete: () => void
  onOpenSaved?: () => void
  saveMsg: string | null
  completeFlash: boolean
}) {
  const issue = session.issueId ? getIssue(session.issueId) : null
  const track = getTrack(session.soundtrack.trackId)
  const p = session.psycho
  return (
    <div className="space-y-5">
      <MixBalanceDeck
        title="Optimal Manifestation Calibration"
        mode={manifestationMode}
        levels={mixLevels}
        onChange={onMixBusChange}
        onApplyMode={onApplyCalibration}
        onOptimalReset={() => onApplyCalibration('standard')}
      />

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
            <button type="button" className="btn btn-teal" onClick={() => onPreview()}>
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
          <div className="space-y-2 rounded-lg border border-[color-mix(in_oklab,var(--accent)_40%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] px-3 py-2 text-sm text-ink">
            <p>
              {saveMsg ??
                'Track locked with your advanced engineering chain and saved on this device.'}
            </p>
            {onOpenSaved ? (
              <button type="button" className="btn btn-teal text-xs" onClick={onOpenSaved}>
                Open Saved Tracks
              </button>
            ) : null}
          </div>
        )}
      </section>

      <section className="panel space-y-4 p-5">
        <AdvancedEngineeringPanel
          advanced={session.advancedPsycho}
          onChange={onApplyAdvanced}
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
