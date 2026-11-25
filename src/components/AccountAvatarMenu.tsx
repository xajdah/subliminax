import { useEffect, useRef, useState } from 'react'
import { accountStorage } from '../services/accountStorage'
import {
  formatHours,
  PLAN_LABELS,
  totalListeningHours,
  type AccountStore,
} from '../types/account'
import { AccountHubModal, type AccountHubTab } from './AccountHubModal'

interface Props {
  onPlayTrack?: (mixId?: string, title?: string) => void
  className?: string
}

export function AccountAvatarMenu({ onPlayTrack, className = '' }: Props) {
  const [store, setStore] = useState<AccountStore>(() => accountStorage.get())
  const [open, setOpen] = useState(false)
  const [hubOpen, setHubOpen] = useState(false)
  const [hubTab, setHubTab] = useState<AccountHubTab>('profile')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    accountStorage.ensureDemoTelemetry()
    void accountStorage.hydrateVoiceSample()
    return accountStorage.subscribe(setStore)
  }, [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const openHub = (tab: AccountHubTab = 'profile') => {
    setOpen(false)
    setHubTab(tab)
    setHubOpen(true)
  }

  const avatar = store.profile.avatarDataUrl
  const initial = (store.profile.displayName || store.profile.username || 'S')[0]?.toUpperCase()

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        className="btn btn-icon overflow-hidden border border-[var(--border-strong)]"
        aria-label="Open account menu"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        {avatar ? (
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-sm font-bold text-ink">{initial}</span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--panel)] shadow-xl"
          role="dialog"
          aria-label="Account summary"
        >
          <div className="flex items-center gap-3 border-b border-[var(--border)] p-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,#000_20%,transparent)]">
              {avatar ? (
                <img src={avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-lg font-bold">{initial}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display font-semibold text-ink">
                @{store.profile.username}
              </p>
              <p className="truncate text-xs text-muted">{store.profile.displayName}</p>
              <span className="mt-1 inline-block rounded-full border border-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                {PLAN_LABELS[store.subscription.tier]}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-[var(--border)] p-3 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted">Listened</p>
              <p className="font-display text-sm font-bold text-ink">
                {formatHours(totalListeningHours(store.modeHours))}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted">Streak</p>
              <p className="font-display text-sm font-bold text-ink">{store.dailyStreak}d</p>
            </div>
          </div>

          <nav className="flex flex-col p-1.5 text-sm">
            <QuickLink label="Open Account Hub" onClick={() => openHub('profile')} />
            <QuickLink label="Profile & Voice Vault" onClick={() => openHub('profile')} />
            <QuickLink label="Progress & History" onClick={() => openHub('analytics')} />
            <QuickLink label="Matrix Cards" onClick={() => openHub('matrix')} />
            <QuickLink label="Neuro-Defaults" onClick={() => openHub('preferences')} />
            <QuickLink label="Subscription" onClick={() => openHub('subscription')} />
          </nav>
        </div>
      )}

      <AccountHubModal
        open={hubOpen}
        initialTab={hubTab}
        onClose={() => setHubOpen(false)}
        onPlayTrack={onPlayTrack}
      />
    </div>
  )
}

function QuickLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="rounded-lg px-3 py-2 text-left text-ink hover:bg-[color-mix(in_oklab,var(--accent)_12%,transparent)]"
      onClick={onClick}
    >
      {label}
    </button>
  )
}
