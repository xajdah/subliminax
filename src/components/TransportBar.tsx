import { formatElapsed } from '../hooks/useSessionTimer'
import type { TransportState } from '../types/studio'

interface TransportBarProps {
  transport: TransportState
  masterVolume: number
  elapsedMs: number
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onVolume: (v: number) => void
}

export function TransportBar({
  transport,
  masterVolume,
  elapsedMs,
  onPlay,
  onPause,
  onStop,
  onVolume,
}: TransportBarProps) {
  return (
    <div className="panel flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="flex items-center gap-2">
        {transport === 'playing' ? (
          <button type="button" className="btn btn-primary btn-icon" aria-label="Pause" onClick={onPause}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-icon" aria-label="Play" onClick={onPlay}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5.5v13l11-6.5-11-6.5Z" />
            </svg>
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-icon" aria-label="Stop" onClick={onStop}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <rect x="6" y="6" width="12" height="12" rx="1.5" />
          </svg>
        </button>
      </div>

      <div className="min-w-[7rem] font-display text-lg tracking-tight tabular-nums text-ink">
        {formatElapsed(elapsedMs)}
      </div>

      <div className="ml-auto flex min-w-[12rem] flex-1 items-center gap-3 sm:max-w-xs">
        <label className="field-label mb-0 shrink-0" htmlFor="master-vol">
          Master
        </label>
        <input
          id="master-vol"
          className="field-range"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={masterVolume}
          onChange={(e) => onVolume(Number(e.target.value))}
          aria-valuetext={`${Math.round(masterVolume * 100)}%`}
        />
        <span className="w-10 text-right text-sm text-muted tabular-nums">
          {Math.round(masterVolume * 100)}%
        </span>
      </div>

      <span
        className="rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-wider"
        style={{
          color: transport === 'playing' ? 'var(--accent-2)' : 'var(--muted)',
          background: 'color-mix(in oklab, var(--surface-solid) 80%, transparent)',
          border: '1px solid var(--border)',
        }}
      >
        {transport}
      </span>
    </div>
  )
}
