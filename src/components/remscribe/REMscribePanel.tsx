import type { AffirmationTrack, SessionNotes } from '../../types/studio'

interface REMscribePanelProps {
  tracks: AffirmationTrack[]
  notes: SessionNotes
  speechSupported: boolean
  compact?: boolean
  onChange: (tracks: AffirmationTrack[]) => void
  onNotesChange: (notes: SessionNotes) => void
}

function uid() {
  return `aff-${Math.random().toString(36).slice(2, 9)}`
}

export function REMscribePanel({
  tracks,
  notes,
  speechSupported,
  compact = false,
  onChange,
  onNotesChange,
}: REMscribePanelProps) {
  const update = (id: string, patch: Partial<AffirmationTrack>) => {
    onChange(tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  const addTrack = () => {
    onChange([
      ...tracks,
      {
        id: uid(),
        text: '',
        volume: 0.7,
        pan: 0,
        rate: 0.95,
        pitch: 1,
        loop: true,
        muted: false,
        subliminal: false,
      },
    ])
  }

  const removeTrack = (id: string) => onChange(tracks.filter((t) => t.id !== id))

  const move = (index: number, dir: -1 | 1) => {
    const next = [...tracks]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <section className="panel animate-rise flex h-full flex-col p-4" aria-labelledby="remscribe-heading">
      <header className="mb-3">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-teal">REMscribe</p>
        <h2 id="remscribe-heading" className="panel-title text-xl text-ink">
          Affirmation sequencer
        </h2>
        <p className="mt-1 text-sm text-muted">
          Compose layered voice scripts with loop, mute, and subliminal masking.
          {!speechSupported && ' (Speech synthesis unavailable in this browser.)'}
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-auto">
        {tracks.map((track, index) => (
          <article
            key={track.id}
            className="rounded-xl border border-border bg-bg/35 p-3"
            style={{ opacity: track.muted ? 0.55 : 1 }}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-display text-sm font-bold text-muted">#{index + 1}</span>
              <button type="button" className="chip" data-active={track.loop} onClick={() => update(track.id, { loop: !track.loop })}>
                Loop
              </button>
              <button type="button" className="chip" data-active={track.muted} onClick={() => update(track.id, { muted: !track.muted })}>
                Mute
              </button>
              <button
                type="button"
                className="chip chip-teal"
                data-active={track.subliminal}
                onClick={() => update(track.id, { subliminal: !track.subliminal })}
              >
                Subliminal
              </button>
              <div className="ml-auto flex gap-1">
                <button type="button" className="btn btn-ghost btn-icon" aria-label="Move up" onClick={() => move(index, -1)}>
                  ↑
                </button>
                <button type="button" className="btn btn-ghost btn-icon" aria-label="Move down" onClick={() => move(index, 1)}>
                  ↓
                </button>
                <button type="button" className="btn btn-ghost btn-icon" aria-label="Remove" onClick={() => removeTrack(track.id)}>
                  ×
                </button>
              </div>
            </div>
            <textarea
              className="field-textarea mb-2 min-h-[4rem] resize-y"
              placeholder="I am focused, calm, and capable…"
              value={track.text}
              onChange={(e) => update(track.id, { text: e.target.value })}
            />
            {!compact && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="block">
                  <span className="field-label">Volume</span>
                  <input
                    className="field-range"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={track.volume}
                    onChange={(e) => update(track.id, { volume: Number(e.target.value) })}
                  />
                </label>
                <label className="block">
                  <span className="field-label">Pan</span>
                  <input
                    className="field-range"
                    type="range"
                    min={-1}
                    max={1}
                    step={0.01}
                    value={track.pan}
                    onChange={(e) => update(track.id, { pan: Number(e.target.value) })}
                  />
                </label>
                <label className="block">
                  <span className="field-label">Rate</span>
                  <input
                    className="field-range"
                    type="range"
                    min={0.5}
                    max={1.5}
                    step={0.01}
                    value={track.rate}
                    onChange={(e) => update(track.id, { rate: Number(e.target.value) })}
                  />
                </label>
                <label className="block">
                  <span className="field-label">Pitch</span>
                  <input
                    className="field-range"
                    type="range"
                    min={0.5}
                    max={1.5}
                    step={0.01}
                    value={track.pitch}
                    onChange={(e) => update(track.id, { pitch: Number(e.target.value) })}
                  />
                </label>
              </div>
            )}
          </article>
        ))}

        <button type="button" className="btn btn-ghost w-full" onClick={addTrack}>
          + Add affirmation
        </button>

        {!compact && (
          <div className="mt-2 rounded-xl border border-border bg-bg/35 p-3">
            <label className="field-label" htmlFor="session-notes">
              Session notes
            </label>
            <input
              className="field-input mb-2"
              placeholder="Session title"
              value={notes.title}
              onChange={(e) =>
                onNotesChange({ ...notes, title: e.target.value, updatedAt: Date.now() })
              }
            />
            <textarea
              id="session-notes"
              className="field-textarea min-h-[5rem] resize-y"
              placeholder="Intentions, observations, cycle notes…"
              value={notes.body}
              onChange={(e) =>
                onNotesChange({ ...notes, body: e.target.value, updatedAt: Date.now() })
              }
            />
          </div>
        )}
      </div>
    </section>
  )
}
