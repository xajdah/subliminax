import { useEffect, useState } from 'react'
import {
  focusShieldController,
  type FocusShieldStatus,
  type FocusShieldTuners,
} from '../audio/FocusShieldController'
import type { UltradianSprintMode } from '../audio/FocusShieldMonitor'

const STATE_LABEL: Record<FocusShieldStatus['state'], string> = {
  settling: 'Settling',
  flow: 'Deep Flow',
  distraction: 'Shield Engaged',
}

const SPRINTS: { id: UltradianSprintMode; label: string }[] = [
  { id: 'continuous', label: 'Continuous' },
  { id: 'pomodoro50', label: '50/10 Pomodoro' },
  { id: 'ultradian90', label: '90/15 Ultradian' },
]

function formatSprint(sec: number | null): string {
  if (sec == null) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function FocusShieldPanel() {
  const [status, setStatus] = useState<FocusShieldStatus>(() => focusShieldController.getStatus())
  const [tuners, setTuners] = useState<FocusShieldTuners>(() => focusShieldController.getTuners())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const unsub = focusShieldController.subscribe(setStatus)
    return () => {
      unsub()
    }
  }, [])

  const toggle = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (status.active) focusShieldController.disable()
      else await focusShieldController.enable()
    } finally {
      setBusy(false)
    }
  }

  const patchTuners = (p: Partial<FocusShieldTuners>) => {
    focusShieldController.setTuners(p)
    setTuners(focusShieldController.getTuners())
  }

  const ringPct = status.active ? status.shieldStrength : 0
  const ringStyle = {
    background: `conic-gradient(var(--accent) ${ringPct * 3.6}deg, color-mix(in oklab, var(--border) 80%, transparent) 0deg)`,
  }

  return (
    <section className="panel focus-shield-panel space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="panel-title text-sm">🛡️ Focus Shield (Work Mode)</h2>
          <p className="mt-1 text-xs text-muted">
            Adaptive masking + Alpha→40 Hz Gamma. Mic timing only — no audio or key logging.
          </p>
        </div>
        <button
          type="button"
          className={`btn text-xs ${status.active ? 'btn-primary' : 'btn-ghost'}`}
          disabled={busy}
          onClick={() => void toggle()}
        >
          {busy ? '…' : status.active ? 'Shield ON' : 'Enable Shield'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="focus-shield-ring" style={ringStyle} aria-hidden>
          <div className="focus-shield-ring-inner">
            <p className="font-display text-lg font-bold tabular-nums text-ink">{ringPct}%</p>
            <p className="text-[10px] uppercase tracking-wider text-muted">Shield</p>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5 text-sm">
          <div className="flex flex-wrap gap-2">
            <span className="chip text-xs" data-active={status.active}>
              {status.active ? STATE_LABEL[status.state] : 'Idle'}
            </span>
            {status.active && status.phase === 'decompress' && (
              <span className="chip chip-teal text-xs" data-active>
                Alpha Decompress
              </span>
            )}
            {!status.micActive && status.active && (
              <span className="chip text-xs">Keyboard fallback</span>
            )}
          </div>
          <p className="text-xs text-muted">
            Room{' '}
            <span className="tabular-nums text-ink">
              {status.ambientDb.toFixed(0)} dBFS
            </span>
            {' · '}
            Brainwave{' '}
            <span className="tabular-nums text-ink">{status.beatHz.toFixed(0)} Hz</span>
            {status.beatHz >= 30 ? ' Gamma' : status.beatHz <= 10 ? ' Alpha' : ' Beta→Gamma'}
            {status.sprintRemainingSec != null && (
              <>
                {' · '}Sprint <span className="tabular-nums text-ink">{formatSprint(status.sprintRemainingSec)}</span>
              </>
            )}
          </p>
          <p className="text-xs text-muted">
            Speech intrusion {(status.speechIntrusiveness * 100).toFixed(0)}% · Voice under-mask −20 dB
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-muted">
          Masking Sensitivity {Math.round(tuners.maskingSensitivity * 100)}%
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(tuners.maskingSensitivity * 100)}
            className="field-range mt-1 w-full"
            disabled={!status.active}
            onChange={(e) => patchTuners({ maskingSensitivity: Number(e.target.value) / 100 })}
          />
        </label>
        <label className="block text-xs text-muted">
          40 Hz Gamma Intensity {Math.round(tuners.gammaIntensity * 100)}%
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(tuners.gammaIntensity * 100)}
            className="field-range mt-1 w-full"
            disabled={!status.active}
            onChange={(e) => patchTuners({ gammaIntensity: Number(e.target.value) / 100 })}
          />
        </label>
      </div>

      <div>
        <p className="text-xs text-muted">Ultradian Sprint</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {SPRINTS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="chip text-xs"
              data-active={tuners.sprintMode === s.id}
              disabled={!status.active && s.id !== tuners.sprintMode}
              onClick={() => patchTuners({ sprintMode: s.id })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
