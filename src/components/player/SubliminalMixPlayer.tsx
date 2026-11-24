import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  linearGainToDbFs,
  type ManifestationMode,
} from '../../audio/manifestationCalibration'
import { mixEngine } from '../../audio/MixEngine'
import { psychoEngine } from '../../audio/PsychoacousticEngine'
import { applyOptimalMixLevels } from '../../data/mixLevels'
import { getTrack } from '../../data/moodTracks'
import { useMixEngine } from '../../hooks/useMixEngine'
import { usePsychoEngine } from '../../hooks/usePsychoEngine'
import { useTheme } from '../../hooks/useTheme'
import { savedMixStorage } from '../../services/savedMixStorage'
import type { PsychoacousticState } from '../../types/psychoacoustic'
import type { SavedMix } from '../../types/savedMix'
import type { CreateSession } from '../../types/studio'
import { AdvancedEngineeringPanel } from '../create/AdvancedEngineeringPanel'
import { MixBalanceDeck, type MixBusKey } from '../MixBalanceDeck'
import { SubliminalXRay } from '../psycho/SubliminalXRay'
import { ThemeToggle } from '../ThemeToggle'
import { FrequencyCymatics } from './FrequencyCymatics'

type VizMode = 'cymatics' | 'xray'

interface Props {
  mixId: string | null
  onHome: () => void
  onOpenSaved: () => void
  onSelectMix: (id: string) => void
}

export function SubliminalMixPlayer({ mixId, onHome, onOpenSaved, onSelectMix }: Props) {
  const { theme, toggleTheme } = useTheme()
  const mixSnap = useMixEngine()
  const psycho = usePsychoEngine()
  const [mixes, setMixes] = useState<SavedMix[]>(() => savedMixStorage.list())
  const [session, setSession] = useState<CreateSession | null>(null)
  const [title, setTitle] = useState('')
  const [viz, setViz] = useState<VizMode>('cymatics')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => savedMixStorage.subscribe(setMixes), [])

  const activeMix = useMemo(
    () => (mixId ? mixes.find((m) => m.id === mixId) ?? null : null),
    [mixId, mixes],
  )

  useEffect(() => {
    if (!activeMix) {
      setSession(null)
      setTitle('')
      return
    }
    setSession(structuredClone(activeMix.session))
    setTitle(activeMix.title)
  }, [activeMix?.id, activeMix?.updatedAt])

  const stopAll = useCallback(() => {
    mixEngine.connectAdvancedTap(null)
    mixEngine.stop()
    psychoEngine.stop()
  }, [])

  useEffect(() => () => stopAll(), [stopAll])

  const persistSession = (next: CreateSession) => {
    setSession(next)
    if (!activeMix) return
    savedMixStorage.save({
      id: activeMix.id,
      title: activeMix.title,
      session: next,
    })
  }

  const startPlayback = async (overridePsycho?: PsychoacousticState) => {
    if (!session || busy) return
    setBusy(true)
    setNote(null)
    try {
      const psychoState = overridePsycho ?? session.advancedPsycho
      await mixEngine.play(session)
      const ctx = mixEngine.getContext()
      if (!psychoEngine.isPlaying()) {
        await psychoEngine.start({ withDemoSources: false, context: ctx ?? undefined })
      }
      psychoEngine.applyPreset(psychoState)
      const tap = psychoEngine.getMixTap()
      if (tap) mixEngine.connectAdvancedTap(tap)
      psychoEngine.updateEntrainment(session.frequency.beatHz, session.frequency.hz)
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Could not start playback.')
    } finally {
      setBusy(false)
    }
  }

  const stopPlayback = () => stopAll()

  const patchSession = (partial: Partial<CreateSession>) => {
    if (!session) return
    const next: CreateSession = {
      ...session,
      ...partial,
      optimalLevels:
        partial.optimalLevels !== undefined
          ? partial.optimalLevels
          : partial.masterVolume !== undefined ||
              partial.ambientBusGain !== undefined ||
              partial.soundtrack !== undefined ||
              partial.frequency !== undefined ||
              partial.voice !== undefined
            ? false
            : session.optimalLevels,
    }
    persistSession(next)
    if (mixSnap.transport === 'playing') {
      mixEngine.sync(next)
      if (partial.voice?.rate != null) mixEngine.restartVoice()
    }
  }

  const onMixBusChange = (bus: MixBusKey, db: number) => {
    if (!session) return
    const lin = Math.pow(10, db / 20)
    if (bus === 'soundtrack') {
      patchSession({ soundtrack: { ...session.soundtrack, volume: lin } })
      if (psycho.playing) psychoEngine.setBusDb('music', db)
    } else if (bus === 'ambient') {
      patchSession({ ambientBusGain: lin })
      if (psycho.playing) psychoEngine.setBusDb('soundscape', db)
    } else if (bus === 'frequency') {
      patchSession({ frequency: { ...session.frequency, volume: lin } })
      if (psycho.playing) psychoEngine.setBusDb('frequency', db)
    } else {
      patchSession({ voice: { ...session.voice, volume: lin } })
      if (psycho.playing) psychoEngine.setBusDb('voice', db)
    }
  }

  const applyCalibration = (mode: ManifestationMode) => {
    if (!session) return
    let next = applyOptimalMixLevels(session, mode)
    next = {
      ...next,
      advancedPsycho: {
        ...next.advancedPsycho,
        buses: {
          music: linearGainToDbFs(next.soundtrack.volume),
          soundscape: linearGainToDbFs(next.ambientBusGain),
          frequency: linearGainToDbFs(next.frequency.volume),
          voice: linearGainToDbFs(next.voice.volume),
        },
      },
    }
    persistSession(next)
    psychoEngine.applyManifestationCalibration(mode)
    if (mixSnap.transport === 'playing') mixEngine.sync(next)
  }

  const applyAdvanced = (advancedPsycho: PsychoacousticState) => {
    if (!session) return
    persistSession({ ...session, advancedPsycho })
    if (psycho.playing) psychoEngine.applyPreset(advancedPsycho)
  }

  const playing = mixSnap.transport === 'playing'
  const track = session ? getTrack(session.soundtrack.trackId) : null
  const mixLevels = session
    ? {
        soundtrackDb: linearGainToDbFs(session.soundtrack.volume),
        ambientDb: linearGainToDbFs(session.ambientBusGain),
        frequencyDb: linearGainToDbFs(session.frequency.volume),
        voiceDb: linearGainToDbFs(session.voice.volume),
      }
    : null
  const maskDb = session
    ? session.advancedPsycho.buses.music + session.advancedPsycho.breath.envelopeMaskDb
    : -32

  if (!activeMix || !session || !mixLevels) {
    return (
      <div className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-6">
        <header className="mb-6 flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-ghost" onClick={onHome}>
            ← Home
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold">Subliminal Player</h1>
            <p className="text-sm text-muted">
              Pick a completed mix for cymatics, X-Ray EQ, and live mix controls.
            </p>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </header>

        {mixes.length === 0 ? (
          <div className="panel space-y-3 p-6">
            <h2 className="panel-title text-lg">No saved mixes yet</h2>
            <p className="text-sm text-muted">
              Complete a track in Create Subliminal, then return here to play it.
            </p>
            <button type="button" className="btn btn-primary" onClick={onOpenSaved}>
              Open Saved Tracks
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {mixes.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="panel flex w-full items-center justify-between gap-3 p-4 text-left transition hover:border-[var(--border-strong)]"
                  onClick={() => onSelectMix(m.id)}
                >
                  <span>
                    <span className="block font-display font-semibold text-ink">{m.title}</span>
                    <span className="text-xs text-muted">
                      {getTrack(m.session.soundtrack.trackId)?.name ?? 'Soundtrack'} ·{' '}
                      {m.session.frequency.hz} Hz
                    </span>
                  </span>
                  <span className="btn btn-teal text-xs">Open</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-5 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            stopPlayback()
            onSelectMix('')
          }}
        >
          ← Mixes
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-extrabold sm:text-2xl">{title}</h1>
          <p className="text-sm text-muted">
            {track?.name ?? 'Soundtrack'} · {session.frequency.hz} Hz · {session.frequency.entrainment}{' '}
            · beat {session.frequency.beatHz} Hz
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!playing ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void startPlayback()}
            >
              {busy ? 'Loading…' : 'Play'}
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={stopPlayback}>
              Stop
            </button>
          )}
          <button type="button" className="btn btn-ghost text-sm" onClick={onHome}>
            Home
          </button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      {note && (
        <p className="panel mb-4 px-4 py-3 text-sm" role="status">
          {note}
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Visualizer mode">
        <button
          type="button"
          className={`btn text-sm ${viz === 'cymatics' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setViz('cymatics')}
        >
          Cymatics
        </button>
        <button
          type="button"
          className={`btn text-sm ${viz === 'xray' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setViz('xray')}
        >
          X-Ray Equalizer
        </button>
      </div>

      {viz === 'cymatics' ? (
        <FrequencyCymatics
          carrierHz={session.frequency.hz}
          beatHz={session.frequency.beatHz}
          analyser={psycho.analysers?.frequency ?? null}
          playing={playing}
          className="mb-5"
        />
      ) : (
        <div className="mb-5">
          <SubliminalXRay
            analysers={psycho.analysers}
            maskingThresholdDb={maskDb}
            liveBeatHz={session.frequency.beatHz}
            ultrasonicHz={session.advancedPsycho.breath.ultrasonicCarrierHz}
            ultrasonicOn={session.advancedPsycho.breath.ultrasonic}
            isolateVoice={psycho.state.isolateVoice}
            checkMasking={psycho.state.checkMasking}
            onIsolateVoice={psycho.setIsolateVoice}
            onCheckMasking={psycho.setCheckMasking}
          />
        </div>
      )}

      <MixBalanceDeck
        title="Mix volumes"
        mode={session.manifestationMode ?? 'standard'}
        levels={mixLevels}
        onChange={onMixBusChange}
        onApplyMode={applyCalibration}
        onOptimalReset={() => applyCalibration('standard')}
        className="mb-4"
      />

      <section className="panel mb-4 space-y-3 p-4 sm:p-5">
        <label className="block">
          <span className="field-label">Affirmation speed · {session.voice.rate.toFixed(2)}×</span>
          <input
            className="field-range mt-1 w-full"
            type="range"
            min={0.55}
            max={1.35}
            step={0.01}
            value={session.voice.rate}
            onChange={(e) =>
              patchSession({
                voice: { ...session.voice, rate: Number(e.target.value) },
              })
            }
          />
        </label>
        <p className="text-xs text-muted">
          Soundtrack, frequency, ambient, and affirmation volumes sit above. Optimal Mix Reset
          restores the Standard sweet-spot preset for those four.
        </p>
      </section>

      <section className="panel mb-8 p-4 sm:p-5">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setAdvancedOpen((o) => !o)}
          aria-expanded={advancedOpen}
        >
          <span>
            <span className="panel-title block text-base">Advanced configurations</span>
            <span className="text-sm text-muted">
              All psychoacoustic options from Create Subliminal
            </span>
          </span>
          <span className="btn btn-ghost text-xs">{advancedOpen ? 'Hide' : 'Show'}</span>
        </button>
        {advancedOpen && (
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <AdvancedEngineeringPanel
              advanced={session.advancedPsycho}
              onChange={applyAdvanced}
              analysers={psycho.analysers}
              enginePlaying={psycho.playing}
              onPreview={(next) => void startPlayback(next)}
              onStopPreview={stopPlayback}
              isolateVoice={psycho.state.isolateVoice}
              checkMasking={psycho.state.checkMasking}
              onIsolateVoice={psycho.setIsolateVoice}
              onCheckMasking={psycho.setCheckMasking}
            />
          </div>
        )}
      </section>
    </div>
  )
}
