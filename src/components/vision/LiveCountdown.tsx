import { useCountdown } from '../../hooks/useCountdown'

function Pad({ n }: { n: number }) {
  return <span className="tabular-nums">{n.toString().padStart(2, '0')}</span>
}

interface Props {
  targetDate: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LiveCountdown({ targetDate, size = 'md', className = '' }: Props) {
  const c = useCountdown(targetDate)
  const gap = size === 'sm' ? 'gap-1' : size === 'lg' ? 'gap-2' : 'gap-1.5'
  const cell =
    size === 'sm'
      ? 'min-w-[2.1rem] px-1 py-0.5 text-[11px]'
      : size === 'lg'
        ? 'min-w-[3.25rem] px-2 py-1.5 text-base'
        : 'min-w-[2.6rem] px-1.5 py-1 text-xs'
  const label = size === 'lg' ? 'text-[10px]' : 'text-[9px]'

  if (c.expired) {
    return (
      <span className={`font-display text-xs font-semibold text-accent-soft ${className}`}>
        Target reached
      </span>
    )
  }

  const units: { v: number; l: string }[] = [
    { v: c.days, l: 'Days' },
    { v: c.hours, l: 'Hrs' },
    { v: c.minutes, l: 'Min' },
    { v: c.seconds, l: 'Sec' },
  ]

  return (
    <div className={`inline-flex items-stretch ${gap} ${className}`} aria-live="polite">
      {units.map((u, i) => (
        <div key={u.l} className="flex items-stretch gap-1">
          <div
            className={`rounded-lg border border-border bg-[color-mix(in_oklab,var(--surface-solid)_70%,transparent)] text-center backdrop-blur-md ${cell}`}
          >
            <div className="font-display font-bold leading-tight text-ink">
              <Pad n={u.v} />
            </div>
            <div className={`uppercase tracking-wider text-muted ${label}`}>{u.l}</div>
          </div>
          {i < units.length - 1 && (
            <span className="self-center font-display text-muted opacity-50">:</span>
          )}
        </div>
      ))}
    </div>
  )
}
