import { accountStorage } from '../../services/accountStorage'
import { PLAN_LABELS, type AccountStore, type PlanTier } from '../../types/account'

interface Props {
  store: AccountStore
}

const TIER_META: Record<
  PlanTier,
  { name: string; blurb: string; voice: number; ai: number; storageMb: number }
> = {
  free: {
    name: 'Explorer',
    blurb: 'Core mixes & local vault',
    voice: 1,
    ai: 20,
    storageMb: 100,
  },
  pro: {
    name: 'Neuro Pro',
    blurb: 'Voice clone vault + Study AI',
    voice: 3,
    ai: 120,
    storageMb: 1000,
  },
  studio: {
    name: 'Studio Unlimited',
    blurb: 'Full Matrix + cloud library',
    voice: 5,
    ai: 500,
    storageMb: 5000,
  },
}

export function SubscriptionTab({ store }: Props) {
  const sub = store.subscription
  const meta = TIER_META[sub.tier]
  const renew = sub.renewalAt ? new Date(sub.renewalAt) : null

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--border)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">Active plan</p>
            <h3 className="font-display text-2xl font-bold text-ink">{meta.name}</h3>
            <p className="mt-1 text-sm text-muted">{meta.blurb}</p>
          </div>
          <span className="rounded-full border border-[var(--accent)] px-3 py-1 text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
            {PLAN_LABELS[sub.tier]}
          </span>
        </div>
        <p className="mt-4 text-sm text-muted">
          {renew ? (
            <>
              Renews{' '}
              <span className="text-ink">
                {renew.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </>
          ) : (
            <span>Free tier — upgrade anytime for more voice slots and AI generations.</span>
          )}
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="panel-title text-base">Feature limits</h3>
        <ul className="grid gap-3 sm:grid-cols-3">
          <LimitCard
            label="Voice cloning slots"
            used={sub.voiceCloneUsed}
            max={sub.voiceCloneSlots}
          />
          <LimitCard
            label="AI Study / Script gens"
            used={sub.aiGenerationsUsed}
            max={sub.aiGenerationsPerMonth}
          />
          <LimitCard
            label="Cloud track storage"
            used={sub.cloudTrackUsedMb}
            max={sub.cloudTrackMb}
            unit="MB"
          />
        </ul>
      </section>

      <section className="flex flex-wrap gap-2">
        {sub.tier !== 'studio' && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const next: PlanTier = sub.tier === 'free' ? 'pro' : 'studio'
              accountStorage.setPlan(next)
            }}
          >
            Upgrade to {sub.tier === 'free' ? 'Pro' : 'Studio'}
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() =>
            window.alert('Manage billing demo — invoices & payment methods open here.')
          }
        >
          Manage billing
        </button>
        {sub.tier !== 'free' && (
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={() => accountStorage.setPlan('free')}
          >
            Downgrade to Free
          </button>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="panel-title text-base">Compare tiers</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(TIER_META) as PlanTier[]).map((tier) => {
            const t = TIER_META[tier]
            const active = tier === sub.tier
            return (
              <div
                key={tier}
                className={`rounded-xl border p-3 ${
                  active ? 'border-[var(--accent)]' : 'border-[var(--border)]'
                }`}
              >
                <p className="font-display font-semibold text-ink">{t.name}</p>
                <p className="mt-1 text-xs text-muted">{t.blurb}</p>
                <ul className="mt-2 space-y-1 text-xs text-muted">
                  <li>{t.voice} voice slots</li>
                  <li>{t.ai} AI gens / mo</li>
                  <li>{formatStorage(t.storageMb)}</li>
                </ul>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function LimitCard({
  label,
  used,
  max,
  unit,
}: {
  label: string
  used: number
  max: number
  unit?: string
}) {
  const pct = Math.min(100, (used / Math.max(max, 0.001)) * 100)
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-lg font-bold text-ink">
        {formatNum(used)}
        {unit ? ` ${unit}` : ''} / {formatNum(max)}
        {unit ? ` ${unit}` : ''}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function formatStorage(mb: number): string {
  if (mb >= 1000) return `${(mb / 1000).toFixed(0)} GB cloud`
  return `${mb} MB cloud`
}
