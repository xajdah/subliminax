import { useState } from 'react'
import { getTrack } from '../../data/moodTracks'
import { usePsychoEngine } from '../../hooks/usePsychoEngine'
import type { SavedMixPlayback } from '../../hooks/useSavedMixPlayback'
import type { EntrainmentType } from '../../types/studio'
import { AdvancedEngineeringPanel } from '../create/AdvancedEngineeringPanel'
import { SubliminalXRay } from '../psycho/SubliminalXRay'
import { FrequencyCymatics } from './FrequencyCymatics'

type VizMode = 'cymatics' | 'xray'

const ENTRAINMENT: [EntrainmentType, string][] = [
  ['off', 'Off'],
  ['binaural', 'Binaural'],
  ['monaural', 'Monaural'],
  ['isochronic', 'Isochronic'],
  ['pure', 'Pure'],
]

interface Props {
  playback: SavedMixPlayback
  onOpenSaved: () => void
}

export function SavedMixMiniPlayer({ playback, onOpenSaved }: Props) {
  const {
    activeMixId,
    title,
    session,
    minimized,
    setMinimized,
    busy,
    note,
    transport,
    togglePause,
    stop,
    playNext,
    playPrev,
    setEntrainment,
    setBusLinear,
    setVoiceRate,
    applyAdvanced,
    restoreSaved,
    restoreRecommended,
    restartPreview,
  } = playback
  const psycho = usePsychoEngine()
  const [viz, setViz] = useState<VizMode>('xray')
  const [psychoOpen, setPsychoOpen] = useState(true)

  if (!activeMixId || !session) return null

  const track = getTrack(session.soundtrack.trackId)
  const playing = transport === 'playing'
  const paused = transport === 'paused'
  const maskDb =
    session.advancedPsycho.buses.music + session.advancedPsycho.breath.envelopeMaskDb

  if (minimized) {
    return (
      <div className="saved-mini-player" data-minimized="true">
        <div className="saved-mini-dock" role="group" aria-label="Now playing">
          <button
            type="button"
            className="saved-mini-expand"
            onClick={() => setMinimized(false)}
            aria-label={`Expand player · ${title}`}
            title={title}
          >
            <span className="saved-mini-player-dot" data-live={playing || paused ? '1' : '0'} />
            <span className="saved-mini-dock-title">{title || 'Now playing'}</span>
          </button>
          <button
            type="button"
            className="saved-mini-icon-btn"
            disabled={busy}
            onClick={() => void togglePause()}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {busy ? '…' : playing ? '❚❚' : '▶'}
          </button>
          <button
            type="button"
            className="saved-mini-icon-btn"
            onClick={playNext}
            aria-label="Next mix"
          >
            ⏭
          </button>
        </div>
      </div>
    )
  }

  return (
    <aside className="saved-mini-player panel" data-minimized="false" aria-label="Now playing">
      <div className="saved-mini-player-head">
        <div className="min-w-0 flex-1">
          <p className="saved-mini-player-kicker">Now playing</p>
          <p className="saved-mini-player-title">{title}</p>
          <p className="saved-mini-player-meta">
            {track?.name ?? 'Soundtrack'} · {session.frequency.hz} Hz ·{' '}
            {session.frequency.entrainment}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={onOpenSaved}
            title="Open library"
          >
            Library
          </button>
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={() => setMinimized(true)}
            aria-label="Minimize player"
          >
            Min
          </button>
        </div>
      </div>

      {note && (
        <p className="mb-2 text-xs text-muted" role="status">
          {note}
        </p>
      )}

      <div className="saved-mini-viz-tabs" role="group" aria-label="Visualizer">
        <button
          type="button"
          className={`btn text-xs ${viz === 'cymatics' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setViz('cymatics')}
        >
          Cymatics
        </button>
        <button
          type="button"
          className={`btn text-xs ${viz === 'xray' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setViz('xray')}
        >
          X-Ray EQ
        </button>
      </div>

      {viz === 'cymatics' ? (
        <FrequencyCymatics
          carrierHz={session.frequency.hz}
          beatHz={session.frequency.beatHz}
          analyser={psycho.analysers?.frequency ?? null}
          playing={playing}
          className="saved-mini-cymatics mb-3"
        />
      ) : (
        <SubliminalXRay
          compact
          className="mb-3"
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
      )}

      <div className="saved-mini-transport" role="group" aria-label="Transport">
        <button
          type="button"
          className="saved-mini-icon-btn"
          onClick={playPrev}
          aria-label="Previous mix"
        >
          ⏮
        </button>
        <button
          type="button"
          className="saved-mini-play"
          disabled={busy}
          onClick={() => void togglePause()}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {busy ? '…' : playing ? '❚❚' : '▶'}
        </button>
        <button type="button" className="saved-mini-stop" onClick={stop} aria-label="Stop">
          ■
        </button>
        <button
          type="button"
          className="saved-mini-icon-btn"
          onClick={playNext}
          aria-label="Next mix"
        >
          ⏭
        </button>
      </div>

      <div className="saved-mini-pills" role="group" aria-label="Entrainment">
        {ENTRAINMENT.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="chip chip-teal"
            data-active={session.frequency.entrainment === id}
            onClick={() => setEntrainment(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="saved-mini-sliders">
        <label className="saved-mini-slider">
          <span className="saved-mini-slider-meta">
            <span>Affirmation speed</span>
            <span>{session.voice.rate.toFixed(2)}×</span>
          </span>
          <input
            className="field-range saved-mini-range"
            type="range"
            min={0.55}
            max={1.35}
            step={0.01}
            value={session.voice.rate}
            onChange={(e) => setVoiceRate(Number(e.target.value))}
          />
        </label>
        <label className="saved-mini-slider">
          <span className="saved-mini-slider-meta">
            <span>Affirmation volume</span>
            <span>{Math.round(session.voice.volume * 100)}%</span>
          </span>
          <input
            className="field-range saved-mini-range"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={session.voice.volume}
            onChange={(e) => setBusLinear('voice', Number(e.target.value))}
          />
        </label>
        <label className="saved-mini-slider">
          <span className="saved-mini-slider-meta">
            <span>Soundtrack volume</span>
            <span>{Math.round(session.soundtrack.volume * 100)}%</span>
          </span>
          <input
            className="field-range saved-mini-range"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={session.soundtrack.volume}
            onChange={(e) => setBusLinear('soundtrack', Number(e.target.value))}
          />
        </label>
        <label className="saved-mini-slider">
          <span className="saved-mini-slider-meta">
            <span>Ambient volume</span>
            <span>{Math.round(session.ambientBusGain * 100)}%</span>
          </span>
          <input
            className="field-range saved-mini-range"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={session.ambientBusGain}
            onChange={(e) => setBusLinear('ambient', Number(e.target.value))}
          />
        </label>
        <label className="saved-mini-slider">
          <span className="saved-mini-slider-meta">
            <span>Frequency volume</span>
            <span>{Math.round(session.frequency.volume * 100)}%</span>
          </span>
          <input
            className="field-range saved-mini-range"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={session.frequency.volume}
            onChange={(e) => setBusLinear('frequency', Number(e.target.value))}
          />
        </label>
      </div>

      <div className="saved-mini-presets" role="group" aria-label="Restore presets">
        <button type="button" className="btn btn-ghost text-xs" onClick={restoreSaved}>
          Restore saved
        </button>
        <button
          type="button"
          className="btn btn-teal text-xs"
          onClick={() => restoreRecommended('standard')}
        >
          Recommended
        </button>
      </div>

      <section className="saved-mini-psycho">
        <button
          type="button"
          className="saved-mini-psycho-toggle"
          aria-expanded={psychoOpen}
          onClick={() => setPsychoOpen((o) => !o)}
        >
          <span>
            <span className="panel-title block text-sm">Psychoacoustics</span>
            <span className="text-xs text-muted">All advanced mix tools</span>
          </span>
          <span className="btn btn-ghost text-xs">{psychoOpen ? 'Hide' : 'Show'}</span>
        </button>
        {psychoOpen && (
          <div className="mt-3 border-t border-[var(--border)] pt-3">
            <AdvancedEngineeringPanel
              compact
              hideXRay
              advanced={session.advancedPsycho}
              onChange={applyAdvanced}
              analysers={psycho.analysers}
              enginePlaying={psycho.playing || playing}
              onPreview={(next) => void restartPreview(next)}
              onStopPreview={stop}
              isolateVoice={psycho.state.isolateVoice}
              checkMasking={psycho.state.checkMasking}
              onIsolateVoice={psycho.setIsolateVoice}
              onCheckMasking={psycho.setCheckMasking}
            />
          </div>
        )}
      </section>
    </aside>
  )
}
