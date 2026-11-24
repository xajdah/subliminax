import { useCallback, useEffect, useRef, useState } from 'react'
import type { SleepCurvePhase } from '../types/remscribe'

interface Props {
  remainingMs: number
  phase: SleepCurvePhase
  beatHz: number
  listening: boolean
  dreamCapturing: boolean
  speechHint: string | null
  onEndNight: () => void
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const PHASE_LABEL: Record<SleepCurvePhase, string> = {
  descent: 'Descent · Beta → Theta',
  delta: 'Deep Delta Core',
  rem: 'REM Cycles',
  ascent: 'Pre-Dawn Ascent',
}

export function RemScribeNightMode({
  remainingMs,
  phase,
  beatHz,
  listening,
  dreamCapturing,
  speechHint,
  onEndNight,
}: Props) {
  const [holdProgress, setHoldProgress] = useState(0)
  const holdRef = useRef<number | null>(null)
  const holding = useRef(false)

  const clearHold = useCallback(() => {
    holding.current = false
    if (holdRef.current != null) {
      window.clearInterval(holdRef.current)
      holdRef.current = null
    }
    setHoldProgress(0)
  }, [])

  const startHold = useCallback(() => {
    holding.current = true
    setHoldProgress(0)
    const started = Date.now()
    holdRef.current = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / 1400)
      setHoldProgress(p)
      if (p >= 1) {
        clearHold()
        onEndNight()
      }
    }, 40)
  }, [clearHold, onEndNight])

  useEffect(() => () => clearHold(), [clearHold])

  return (
    <div className="remscribe-night fixed inset-0 z-50 flex flex-col items-center justify-between px-6 py-10 text-[#7C2D12]">
      <div className="w-full max-w-md text-center">
        <p className="font-display text-xs uppercase tracking-[0.28em] opacity-80">REMscribe · Night</p>
        <p className="mt-2 font-display text-sm opacity-70">{PHASE_LABEL[phase]}</p>
        <p className="mt-1 font-mono text-xs tabular-nums opacity-60">{beatHz.toFixed(1)} Hz entrainment</p>
      </div>

      <div className="relative flex flex-col items-center">
        <div
          className="remscribe-breath-ring absolute rounded-full border border-[#7C2D12]/40"
          aria-hidden
        />
        <div className="relative z-10 text-center">
          <p className="font-display text-xs uppercase tracking-[0.2em] opacity-70">Wake in</p>
          <p className="mt-2 font-display text-5xl font-bold tabular-nums tracking-tight sm:text-6xl">
            {formatCountdown(remainingMs)}
          </p>
        </div>
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              listening ? 'remscribe-mic-live bg-[#9A3412]' : 'bg-[#7C2D12]/40'
            }`}
            aria-hidden
          />
          <span className="opacity-80">
            {dreamCapturing
              ? 'Capturing dream… speak freely'
              : listening
                ? 'Listening for “Record”'
                : 'Mic idle'}
          </span>
        </div>
        {speechHint && (
          <p className="max-w-sm truncate text-center text-xs opacity-50">“…{speechHint}”</p>
        )}

        <button
          type="button"
          className="remscribe-end-btn relative w-full overflow-hidden rounded-full border border-[#7C2D12]/50 px-4 py-4 text-sm font-semibold uppercase tracking-[0.18em]"
          onPointerDown={startHold}
          onPointerUp={clearHold}
          onPointerLeave={clearHold}
          onPointerCancel={clearHold}
        >
          <span
            className="absolute inset-y-0 left-0 bg-[#7C2D12]/25 transition-[width]"
            style={{ width: `${holdProgress * 100}%` }}
            aria-hidden
          />
          <span className="relative z-10">Slide / Hold to End Night</span>
        </button>
      </div>
    </div>
  )
}
