import { useEffect, useMemo, useState } from 'react'
import { FEATURE_GUIDE_SECTIONS } from '../../data/featureGuide'
import { useTheme } from '../../hooks/useTheme'
import { ThemeToggle } from '../ThemeToggle'

interface Props {
  onHome: () => void
}

export function FeatureGuide({ onHome }: Props) {
  const { theme, toggleTheme } = useTheme()
  const [sectionId, setSectionId] = useState(FEATURE_GUIDE_SECTIONS[0]!.id)
  const [openId, setOpenId] = useState<string | null>(
    FEATURE_GUIDE_SECTIONS[0]?.entries[0]?.id ?? null,
  )
  const [query, setQuery] = useState('')

  const section = useMemo(
    () => FEATURE_GUIDE_SECTIONS.find((s) => s.id === sectionId) ?? FEATURE_GUIDE_SECTIONS[0]!,
    [sectionId],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return section.entries
    return section.entries.filter((e) => {
      const hay = [e.title, e.summary, e.whatFor, ...e.howTo, ...e.expect, ...(e.tips ?? [])]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [section, query])

  useEffect(() => {
    if (filtered.length === 0) {
      setOpenId(null)
      return
    }
    if (!filtered.some((e) => e.id === openId)) {
      setOpenId(filtered[0]!.id)
    }
  }, [filtered, openId])

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          ← Home
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold">
            Feature <span className="text-teal">Guide</span>
          </h1>
          <p className="text-sm text-muted">
            What each feature is for, how to use it, and what to expect.
          </p>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="block min-w-0 flex-1">
          <span className="sr-only">Search guide</span>
          <input
            className="field-input w-full"
            type="search"
            placeholder="Search features (e.g. cymatics, REMscribe, masking)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      <nav
        className="mb-6 flex flex-wrap gap-1.5"
        aria-label="Guide sections"
      >
        {FEATURE_GUIDE_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`btn text-xs sm:text-sm ${sectionId === s.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              setSectionId(s.id)
              setOpenId(s.entries[0]?.id ?? null)
              setQuery('')
            }}
          >
            {s.title}
          </button>
        ))}
      </nav>

      <section className="panel mb-5 space-y-2 p-5">
        <h2 className="panel-title text-lg">{section.title}</h2>
        <p className="text-sm leading-relaxed text-muted">{section.intro}</p>
      </section>

      {filtered.length === 0 ? (
        <p className="panel px-4 py-6 text-sm text-muted">No entries match that search in this section.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((entry) => {
            const open = openId === entry.id
            return (
              <li key={entry.id} className="panel overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 p-4 text-left sm:p-5"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : entry.id)}
                >
                  <span className="min-w-0">
                    <span className="font-display block text-base font-bold text-ink sm:text-lg">
                      {entry.title}
                    </span>
                    <span className="mt-1 block text-sm text-muted">{entry.summary}</span>
                  </span>
                  <span className="btn btn-ghost shrink-0 text-xs">{open ? 'Hide' : 'Show'}</span>
                </button>
                {open && (
                  <div className="space-y-4 border-t border-[var(--border)] px-4 pb-5 pt-4 sm:px-5">
                    <GuideBlock label="What it’s for" body={entry.whatFor} />
                    <GuideList label="How to use it" items={entry.howTo} />
                    <GuideList label="What to expect" items={entry.expect} />
                    {entry.tips && entry.tips.length > 0 && (
                      <GuideList label="Tips" items={entry.tips} />
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-8 text-center text-xs text-muted">
        Guidelines reflect the current studio build. Advanced tool names match Create → Mix; playback
        uses the Saved Tracks corner mini-player.
      </p>
    </div>
  )
}

function GuideBlock({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-bronze-soft">{label}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink">{body}</p>
    </div>
  )
}

function GuideList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-bronze-soft">{label}</h3>
      <ol className="mt-1.5 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </div>
  )
}
