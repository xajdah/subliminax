import { useEffect, useState } from 'react'
import { downloadPreviewWav } from '../../audio/previewExport'
import { getTrack } from '../../data/moodTracks'
import { useTheme } from '../../hooks/useTheme'
import { savedMixStorage } from '../../services/savedMixStorage'
import type { SavedMix } from '../../types/savedMix'
import { ThemeToggle } from '../ThemeToggle'

interface Props {
  onHome: () => void
  onEdit: (mix: SavedMix) => void
  onCreate: () => void
  onPlayInPlayer: (mix: SavedMix) => void
}

function formatWhen(ts: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(ts))
  } catch {
    return new Date(ts).toLocaleString()
  }
}

export function SavedMixesHub({ onHome, onEdit, onCreate, onPlayInPlayer }: Props) {
  const { theme, toggleTheme } = useTheme()
  const [mixes, setMixes] = useState<SavedMix[]>(() => savedMixStorage.list())
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => savedMixStorage.subscribe(setMixes), [])

  const exportMix = async (mix: SavedMix) => {
    if (exportingId) return
    setExportingId(mix.id)
    setNote('Rendering 12s preview WAV…')
    try {
      await downloadPreviewWav(mix.session, 12)
      setNote(`Downloaded preview for “${mix.title}”.`)
    } catch {
      setNote('Could not export preview WAV.')
    } finally {
      setExportingId(null)
      window.setTimeout(() => setNote(null), 5000)
    }
  }

  const removeMix = (mix: SavedMix) => {
    if (!window.confirm(`Delete “${mix.title}” from Saved Tracks?`)) return
    savedMixStorage.remove(mix.id)
    setNote(`Removed “${mix.title}”.`)
    window.setTimeout(() => setNote(null), 4000)
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-5 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          ← Home
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-extrabold">Saved Tracks</h1>
          <p className="text-sm text-muted">
            Mixes you complete in Create stay here on this device.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="btn btn-primary" onClick={onCreate}>
            New mix
          </button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      {note && (
        <p className="panel mb-4 px-4 py-3 text-sm text-ink" role="status">
          {note}
        </p>
      )}

      {mixes.length === 0 ? (
        <div className="panel space-y-4 p-6">
          <h2 className="panel-title text-lg">No saved mixes yet</h2>
          <p className="text-sm text-muted">
            Finish a session in Create Subliminal and tap <strong>Complete track</strong> — it will
            appear here so you can play, edit, or export it later.
          </p>
          <button type="button" className="btn btn-primary" onClick={onCreate}>
            Create Subliminal
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {mixes.map((mix) => {
            const track = getTrack(mix.session.soundtrack.trackId)
            const ambientsOn = mix.session.ambients.filter((a) => a.enabled).length
            return (
              <li key={mix.id} className="panel p-4 sm:p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-bold text-ink">{mix.title}</h2>
                    <p className="mt-1 text-xs text-muted">
                      Updated {formatWhen(mix.updatedAt)} · {mix.session.frequency.hz} Hz ·{' '}
                      {track?.name ?? 'Soundtrack'} · {ambientsOn} ambient
                      {ambientsOn === 1 ? '' : 's'} · Voice {mix.session.voice.mode}
                    </p>
                    {mix.session.voice.script.trim() ? (
                      <p className="mt-2 line-clamp-2 text-sm text-muted">
                        {mix.session.voice.script.trim()}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-teal"
                      onClick={() => onPlayInPlayer(mix)}
                    >
                      Open Player
                    </button>
                    <button type="button" className="btn btn-primary" onClick={() => onEdit(mix)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={exportingId === mix.id}
                      onClick={() => void exportMix(mix)}
                    >
                      {exportingId === mix.id ? 'Exporting…' : 'Export 12s'}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => removeMix(mix)}>
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
