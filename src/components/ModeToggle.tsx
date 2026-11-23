import type { StudioMode } from '../types/studio'

interface ModeToggleProps {
  mode: StudioMode
  onChange: (mode: StudioMode) => void
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div
      role="group"
      aria-label="Studio mode"
      className="inline-flex rounded-xl border border-border bg-bg/40 p-1"
    >
      <button
        type="button"
        className="chip chip-teal border-0"
        data-active={mode === 'simple'}
        onClick={() => onChange('simple')}
      >
        Simple
      </button>
      <button
        type="button"
        className="chip chip-teal border-0"
        data-active={mode === 'advanced'}
        onClick={() => onChange('advanced')}
      >
        Advanced
      </button>
    </div>
  )
}
