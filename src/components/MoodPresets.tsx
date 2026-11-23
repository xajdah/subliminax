import { MOOD_PRESETS } from '../presets/moods'
import type { MoodId } from '../types/studio'

interface MoodPresetsProps {
  activeId: MoodId | null
  onSelect: (id: MoodId) => void
}

export function MoodPresets({ activeId, onSelect }: MoodPresetsProps) {
  return (
    <section className="panel animate-rise p-4" aria-labelledby="mood-heading">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 id="mood-heading" className="panel-title text-lg text-ink">
            Mood presets
          </h2>
          <p className="mt-1 text-sm text-muted">Quick-mix starting points for your session.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {MOOD_PRESETS.map((mood) => (
          <button
            key={mood.id}
            type="button"
            className="chip flex min-h-[4.5rem] flex-col items-start justify-center gap-1 px-3 py-2 text-left"
            data-active={activeId === mood.id}
            onClick={() => onSelect(mood.id)}
          >
            <span className="font-display text-sm font-bold">{mood.label}</span>
            <span className="line-clamp-2 text-[0.7rem] leading-snug text-muted">
              {mood.description}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
