import { getTrack } from '../../data/moodTracks'
import type { SavedMixPlayback } from '../../hooks/useSavedMixPlayback'
import { savedMixStorage } from '../../services/savedMixStorage'

interface Props {
  playback: SavedMixPlayback
  onOpenSaved: () => void
}

export function SavedMixMiniPlayer({ playback, onOpenSaved }: Props) {
  const { activeMixId, minimized, setMinimized, busy, note, transport, togglePause, stop } =
    playback
  if (!activeMixId) return null

  const mix = savedMixStorage.get(activeMixId)
  if (!mix) return null

  const track = getTrack(mix.session.soundtrack.trackId)
  const playing = transport === 'playing'
  const paused = transport === 'paused'

  if (minimized) {
    return (
      <div className="saved-mini-player" data-minimized="true">
        <button
          type="button"
          className="saved-mini-player-pill"
          onClick={() => setMinimized(false)}
          aria-label={`Expand player · ${mix.title}`}
          title={mix.title}
        >
          <span className="saved-mini-player-dot" data-live={playing || paused ? '1' : '0'} />
          <span className="saved-mini-player-pill-title">{playing ? 'Playing' : paused ? 'Paused' : 'Idle'}</span>
        </button>
      </div>
    )
  }

  return (
    <aside className="saved-mini-player panel" data-minimized="false" aria-label="Now playing">
      <div className="saved-mini-player-head">
        <div className="min-w-0 flex-1">
          <p className="saved-mini-player-kicker">Now playing</p>
          <p className="saved-mini-player-title">{mix.title}</p>
          <p className="saved-mini-player-meta">
            {track?.name ?? 'Soundtrack'} · {mix.session.frequency.hz} Hz
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost text-xs"
          onClick={() => setMinimized(true)}
          aria-label="Minimize player"
          title="Minimize"
        >
          Min
        </button>
      </div>

      {note && (
        <p className="mb-2 text-xs text-muted" role="status">
          {note}
        </p>
      )}

      <div className="saved-mini-player-actions">
        <button
          type="button"
          className="btn btn-teal text-sm"
          disabled={busy || (!playing && !paused)}
          onClick={() => void togglePause()}
        >
          {busy ? 'Loading…' : playing ? 'Pause' : 'Resume'}
        </button>
        <button type="button" className="btn btn-ghost text-sm" onClick={stop}>
          Stop
        </button>
        <button type="button" className="btn btn-ghost text-sm" onClick={onOpenSaved}>
          Library
        </button>
      </div>
    </aside>
  )
}
