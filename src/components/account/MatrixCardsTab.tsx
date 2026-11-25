import { useMemo, useState } from 'react'
import { accountStorage } from '../../services/accountStorage'
import type { AccountStore, MatrixCard } from '../../types/account'

interface Props {
  store: AccountStore
}

export function MatrixCardsTab({ store }: Props) {
  const [filter, setFilter] = useState<'all' | 'matrix' | 'sonicDna'>('all')

  const cards = useMemo(() => {
    return store.matrixCards.filter((c) => {
      if (filter === 'all') return true
      if (filter === 'sonicDna') return c.source === 'sonicDna'
      return c.source === 'manual' || c.source === 'savedMix'
    })
  }, [store.matrixCards, filter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="panel-title text-base">Matrix Cards & Scanned Presets</h3>
          <p className="mt-1 text-sm text-muted">
            Shareable Subliminax Matrix Cards and presets imported via Sonic DNA.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-[var(--border)] p-0.5 text-xs">
          {(
            [
              ['all', 'All'],
              ['matrix', 'Matrix'],
              ['sonicDna', 'Sonic DNA'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`rounded-md px-2.5 py-1.5 ${
                filter === id ? 'bg-[var(--accent)] text-[var(--bg)]' : 'text-muted hover:text-ink'
              }`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-8 text-center text-sm text-muted">
          No saved Matrix Cards yet. Export a mix as a Matrix Card from Studio, or import via Sonic
          DNA.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <li key={card.id}>
              <MatrixCardTile
                card={card}
                onRemove={() => accountStorage.removeMatrixCard(card.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MatrixCardTile({
  card,
  onRemove,
}: {
  card: MatrixCard
  onRemove: () => void
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,#000_16%,transparent)]">
      <div
        className="relative aspect-[16/9]"
        style={{
          background: `linear-gradient(135deg, ${card.accent}, #0c1222)`,
        }}
      >
        <span className="absolute left-2 top-2 rounded bg-black/50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">
          {card.source === 'sonicDna'
            ? 'Sonic DNA'
            : card.source === 'savedMix'
              ? 'Saved Mix'
              : 'Matrix'}
        </span>
        <div className="absolute inset-0 flex items-end p-3">
          <h4 className="font-display text-lg font-semibold text-white drop-shadow">{card.title}</h4>
        </div>
      </div>
      <div className="space-y-2 p-3">
        {card.blurb && <p className="text-xs text-muted">{card.blurb}</p>}
        <div className="flex items-center justify-between gap-2 pt-1 text-xs text-muted">
          <span>{new Date(card.createdAt).toLocaleDateString()}</span>
          <button type="button" className="btn btn-ghost text-xs" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
    </article>
  )
}
