import { useMemo, useState } from 'react'
import { visionBoardStorage } from '../../services/visionBoardStorage'
import {
  formatHours,
  totalListeningHours,
  type AccountStore,
  type ListeningCategory,
} from '../../types/account'

interface Props {
  store: AccountStore
  onPlayTrack?: (mixId?: string, title?: string) => void
}

const MODE_COLORS: Record<string, string> = {
  manifestation: '#f59e0b',
  remscribe: '#6366f1',
  focusShield: '#14b8a6',
  study: '#22d3ee',
}

export function AnalyticsHistoryTab({ store, onPlayTrack }: Props) {
  const [query, setQuery] = useState('')
  const board = visionBoardStorage.getAll()
  const goals = board.goals
  const progress = board.progress

  const modeTotal = totalListeningHours(store.modeHours) || 1
  const modes = [
    { id: 'manifestation', label: 'Manifestation', hours: store.modeHours.manifestation },
    { id: 'remscribe', label: 'REMscribe Sleep', hours: store.modeHours.remscribe },
    { id: 'focusShield', label: 'Focus Shield', hours: store.modeHours.focusShield },
    { id: 'study', label: 'Subliminal Study', hours: store.modeHours.study },
  ] as const

  const chartPoints = useMemo(() => {
    const buckets = new Array(14).fill(0) as number[]
    const now = Date.now()
    for (const p of progress) {
      const ts = Date.parse(p.timestamp)
      if (Number.isNaN(ts)) continue
      const daysAgo = Math.floor((now - ts) / 86400000)
      if (daysAgo >= 0 && daysAgo < 14) {
        buckets[13 - daysAgo]! += p.milestoneScore || 1
      }
    }
    if (progress.length === 0) {
      for (let i = 0; i < 14; i++) {
        buckets[i] = 0.3 + Math.sin(i / 2.2) * 0.25 + (store.dailyStreak > 0 ? 0.2 : 0)
      }
    }
    const max = Math.max(1, ...buckets)
    return buckets.map((v, i) => ({
      x: (i / 13) * 100,
      y: 100 - (v / max) * 78 - 8,
      v,
    }))
  }, [progress, store.dailyStreak])

  const path = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  const filtered = store.trackHistory.filter((t) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      t.trackTitle.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    )
  })

  const activeGoals = goals.filter((g) => g.status !== 'achieved')

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Total listened"
          value={formatHours(totalListeningHours(store.modeHours))}
        />
        <Stat label="Daily streak" value={`${store.dailyStreak}d`} />
        <Stat label="Active goals" value={`${activeGoals.length}`} />
      </div>

      <section className="space-y-3">
        <h3 className="panel-title text-base">Vision Board momentum</h3>
        <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,#000_18%,transparent)] p-3">
          <svg viewBox="0 0 100 100" className="h-40 w-full" role="img" aria-label="Momentum chart">
            <path d={path} fill="none" stroke="#14b8a6" strokeWidth="1.8" />
            {chartPoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="1.4" fill="#f59e0b">
                <title>{`Day ${i + 1}: momentum ${p.v.toFixed(1)}`}</title>
              </circle>
            ))}
          </svg>
          <ul className="mt-2 space-y-1 text-xs text-muted">
            {activeGoals.slice(0, 4).map((g) => {
              const target = Date.parse(g.targetDate)
              const days = Number.isNaN(target)
                ? null
                : Math.ceil((target - Date.now()) / 86400000)
              return (
                <li key={g.id}>
                  <span className="text-ink">{g.title}</span>
                  {days != null && (
                    <span>
                      {' '}
                      · {days >= 0 ? `${days}d left` : `${Math.abs(days)}d past`}
                    </span>
                  )}
                </li>
              )
            })}
            {activeGoals.length === 0 && (
              <li>No vision goals yet — add some in Vision Boards.</li>
            )}
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="panel-title text-base">Hours by mode</h3>
        <div className="flex h-4 overflow-hidden rounded-full border border-[var(--border)]">
          {modes.map((m) => (
            <div
              key={m.id}
              style={{
                width: `${(m.hours / modeTotal) * 100}%`,
                background: MODE_COLORS[m.id],
              }}
              title={`${m.label}: ${formatHours(m.hours)}`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted">
          {modes.map((m) => (
            <span key={m.id} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: MODE_COLORS[m.id] }}
              />
              {m.label} · {formatHours(m.hours)}
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="panel-title text-base">Track listening history</h3>
          <input
            className="field-input w-full max-w-xs text-sm"
            placeholder="Search tracks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-[color-mix(in_oklab,#000_15%,transparent)] text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Track</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Listened</th>
                <th className="px-3 py-2 font-medium">Last session</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-muted">
                    No listening history yet.
                  </td>
                </tr>
              )}
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 text-ink">{t.trackTitle}</td>
                  <td className="px-3 py-2 capitalize text-muted">
                    {labelCategory(t.category)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted">
                    {formatHours(t.totalSeconds / 3600)}
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {new Date(t.lastSessionAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="btn btn-ghost text-xs"
                      onClick={() => onPlayTrack?.(t.mixId, t.trackTitle)}
                    >
                      Play
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-ink">{value}</p>
    </div>
  )
}

function labelCategory(c: ListeningCategory): string {
  if (c === 'focusShield') return 'Focus Shield'
  if (c === 'remscribe') return 'REMscribe'
  if (c === 'study') return 'Study'
  if (c === 'manifestation') return 'Manifestation'
  return c
}
