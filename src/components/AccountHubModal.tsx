import { useEffect, useState } from 'react'
import { accountStorage } from '../services/accountStorage'
import type { AccountStore } from '../types/account'
import { AnalyticsHistoryTab } from './account/AnalyticsHistoryTab'
import { MatrixCardsTab } from './account/MatrixCardsTab'
import { PreferencesTab } from './account/PreferencesTab'
import { ProfileVoiceTab } from './account/ProfileVoiceTab'
import { SubscriptionTab } from './account/SubscriptionTab'

export type AccountHubTab =
  | 'profile'
  | 'analytics'
  | 'matrix'
  | 'preferences'
  | 'subscription'

interface Props {
  open: boolean
  onClose: () => void
  initialTab?: AccountHubTab
  onPlayTrack?: (mixId?: string, title?: string) => void
}

const TABS: { id: AccountHubTab; label: string }[] = [
  { id: 'profile', label: 'Profile & Voice' },
  { id: 'analytics', label: 'Progress' },
  { id: 'matrix', label: 'Matrix Cards' },
  { id: 'preferences', label: 'Neuro-Defaults' },
  { id: 'subscription', label: 'Subscription' },
]

export function AccountHubModal({ open, onClose, initialTab = 'profile', onPlayTrack }: Props) {
  const [store, setStore] = useState<AccountStore>(() => accountStorage.get())
  const [tab, setTab] = useState<AccountHubTab>(initialTab)

  useEffect(() => {
    if (!open) return
    accountStorage.ensureDemoTelemetry()
    setTab(initialTab)
    return accountStorage.subscribe(setStore)
  }, [open, initialTab])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-hub-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Close account hub"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-[var(--border-strong)] bg-[var(--panel)] shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze-soft">
              Account
            </p>
            <h2 id="account-hub-title" className="font-display text-xl font-extrabold text-ink sm:text-2xl">
              Neuro-Profile Hub
            </h2>
            <p className="mt-0.5 truncate text-sm text-muted">
              @{store.profile.username} · {store.profile.displayName}
            </p>
          </div>
          <button type="button" className="btn btn-ghost shrink-0" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)] px-2 py-2 sm:px-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold sm:text-sm ${
                tab === t.id
                  ? 'bg-[color-mix(in_oklab,var(--accent)_22%,transparent)] text-ink'
                  : 'text-muted hover:text-ink'
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
          {tab === 'profile' && <ProfileVoiceTab store={store} />}
          {tab === 'analytics' && (
            <AnalyticsHistoryTab store={store} onPlayTrack={onPlayTrack} />
          )}
          {tab === 'matrix' && <MatrixCardsTab store={store} />}
          {tab === 'preferences' && <PreferencesTab store={store} />}
          {tab === 'subscription' && <SubscriptionTab store={store} />}
        </div>
      </div>
    </div>
  )
}
