import { useState } from 'react'
import { allGuideEntries } from '../../data/featureGuide'

interface Props {
  /** Entry id from featureGuide.ts */
  entryId: string
  className?: string
  /** Start expanded */
  defaultOpen?: boolean
}

/** Compact in-hub “What / How / Expect” panel for a single feature. */
export function FeatureGuidelines({ entryId, className = '', defaultOpen = false }: Props) {
  const entry = allGuideEntries().find((e) => e.id === entryId)
  const [open, setOpen] = useState(defaultOpen)
  if (!entry) return null

  return (
    <section className={`panel overflow-hidden ${className}`.trim()}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>
          <span className="panel-title block text-sm">Guidelines · {entry.title}</span>
          <span className="mt-0.5 block text-xs text-muted">{entry.summary}</span>
        </span>
        <span className="btn btn-ghost text-xs">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-[var(--border)] px-4 pb-4 pt-3">
          <p className="text-sm leading-relaxed text-ink">
            <span className="font-semibold text-bronze-soft">What it’s for · </span>
            {entry.whatFor}
          </p>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-bronze-soft">
              How to use it
            </p>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-ink">
              {entry.howTo.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-bronze-soft">
              What to expect
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink">
              {entry.expect.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
