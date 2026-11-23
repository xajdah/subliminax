import { formatElapsed } from '../hooks/useSessionTimer'
import type { TransportState } from '../types/studio'

interface Props {
  transport: TransportState
  masterVolume: number
  elapsedMs: number
  lengthMinutes: number
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onVolume: (v: number) => void
  onLength: (minutes: number) => void
}

export function TransportBar({
  transport,
  masterVolume,
  elapsedMs,
  lengthMinutes,
  onPlay,
  onPause,
  onStop,
  onVolume,
  onLength,
}: Props) {
  const totalMs = lengthMinutes * 60 * 1000
  const progress = Math.min(1, elapsedMs / Math.max(1, totalMs))

  return (
    <div className="panel flex flex-col gap-3 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
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

        <div className="font-display text-lg tabular-nums tracking-tight">
          {formatElapsed(elapsedMs)}
          <span className="mx-1 text-muted">/</span>
          <span className="text-muted">{formatElapsed(totalMs)}</span>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted">
          Length
          <input
            className="field-input w-20"
            type="number"
            min={1}
            max={720}
            value={lengthMinutes}
            onChange={(e) => onLength(Math.max(1, Math.min(720, Number(e.target.value) || 1)))}
          />
          <span>min</span>
        </label>

        <div className="ml-auto flex min-w-[10rem] flex-1 items-center gap-3 sm:max-w-xs">
          <span className="field-label mb-0">Master</span>
          <input
            className="field-range"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterVolume}
            onChange={(e) => onVolume(Number(e.target.value))}
          />
          <span className="w-10 text-right text-sm tabular-nums text-muted">
            {Math.round(masterVolume * 100)}%
          </span>
        </div>

        <span
          className="rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-wider"
          style={{
            color: transport === 'playing' ? 'var(--accent-2)' : 'var(--muted)',
            border: '1px solid var(--border)',
          }}
        >
          {transport}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-bg/60">
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, var(--accent-2), var(--accent))',
          }}
        />
      </div>
    </div>
  )
}
