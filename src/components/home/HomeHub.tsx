import { AUREVIA_STARTS, DREAM_LAUNCH, dreamHour, skyDoor, type AureviaLaunch } from '../../data/aureviaShare'
import { useTheme } from '../../hooks/useTheme'
import type { AppView } from '../../types/studio'
import { AccountAvatarMenu } from '../AccountAvatarMenu'
import { SubliminaXLogo } from '../shared/SubliminaXLogo'
import { ThemeToggle } from '../ThemeToggle'

interface Props {
  onNavigate: (view: AppView, launch?: AureviaLaunch | null) => void
}

const CARDS: {
  id: AppView
  title: string
  blurb: string
  primary?: boolean
}[] = [
  {
    id: 'create',
    title: 'Create Subliminal',
    blurb:
      'Guided workflow — intent through mix, plus Advanced Audio Engineering tools with live preview.',
    primary: true,
  },
  {
    id: 'study',
    title: 'Subliminal Study',
    blurb:
      'Scan textbooks, synthesize multi-style lessons, and study with age-calibrated headphones/speakers DSP.',
  },
  {
    id: 'aura',
    title: 'Aura Calibration',
    blurb:
      'Draw your somatic intuition — kinematic telemetry + 3 words → personalized brainwave prescription.',
  },
  {
    id: 'sonicDna',
    title: 'Sonic DNA',
    blurb:
      'Scan 15s to authenticate Subliminax tracks and extract DSP Matrix Cards — affirmations stay private.',
  },
  {
    id: 'aurevia',
    title: 'Aurevia',
    blurb: 'A voyage to your higher self — threshold, crossing, presence, and return.',
  },
  {
    id: 'remscribe',
    title: 'REMscribe',
    blurb:
      'Overnight sleep entrainment, acoustic event detection, and wake-word dream journaling.',
  },
  {
    id: 'vision',
    title: 'Vision Boards',
    blurb: 'Goal manifestation hub — collage boards, live countdowns, progress tracking.',
  },
  {
    id: 'player',
    title: 'Subliminal Player',
    blurb:
      'Play saved mixes with frequency cymatics, X-Ray EQ, mix volumes, and advanced tools.',
  },
  {
    id: 'ganzfeld',
    title: 'Ganzfeld Visual Sync',
    blurb: 'Closed-eye photic flicker locked to the entrainment phase — separate from Create.',
  },
  {
    id: 'saved',
    title: 'Saved Tracks',
    blurb: 'Completed mixes on this device — open in Player, edit, export, or delete.',
  },
  {
    id: 'presets',
    title: 'Quick Presets',
    blurb: 'Jump into Create with curated focus, sleep, and calm starting points.',
  },
  {
    id: 'guide',
    title: 'Feature Guide',
    blurb:
      'What every feature is for, how to use it, and what to expect — Create, Player, REMscribe, Ganzfeld, and more.',
  },
]

export function HomeHub({ onNavigate }: Props) {
  const { theme, toggleTheme } = useTheme()
  const door = skyDoor()
  const night = dreamHour()

  return (
    <div className="hero-shell relative isolate min-h-screen overflow-hidden">
      <div className="hero-atmosphere" aria-hidden />
      <div className="hero-grain" aria-hidden />

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-10 lg:px-14">
        <div className="flex items-center gap-3">
          <SubliminaXLogo size="nav" className="shrink-0" />
          <p className="font-display text-xl font-extrabold tracking-tight">
            Sublimina<span className="text-teal">x</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <AccountAvatarMenu
            onPlayTrack={(mixId) => {
              if (mixId) onNavigate('player')
              else onNavigate('player')
            }}
          />
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-6 pb-16 pt-6 sm:px-10 lg:grid-cols-2 lg:px-14">
        <section className="animate-rise max-w-xl">
          <p className="mb-5 font-display text-sm font-semibold uppercase tracking-[0.22em] text-bronze-soft">
            Sublimina<span className="text-teal">x</span>
          </p>
          <h1 className="font-display text-[clamp(2.35rem,5.5vw,3.85rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink">
            <span className="block">Inner Shifts,</span>
            <span className="hero-engineered block">Engineered.</span>
          </h1>
          <p className="mt-6 font-display text-[clamp(1.15rem,2.4vw,1.65rem)] font-semibold tracking-tight text-ink">
            Vibrate{' '}
            <span className="hero-tagline-blend">Higher. Think Clearer.</span>
          </p>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            Precision psychoacoustics, healing frequencies, ambient beds, and personalized or
            cloned voice affirmations — all in one studio.
          </p>
          <button
            type="button"
            className="btn btn-primary mt-8 px-7 py-3 text-base"
            onClick={() => onNavigate('create')}
          >
            Create Subliminal
          </button>
        </section>

        <section
          className="relative flex justify-center lg:justify-end"
          aria-label="SubliminaX emblem"
        >
          <SubliminaXLogo size="hero" className="hero-mark-img relative z-10" />
        </section>
      </main>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-8 sm:px-10 lg:px-14">
        <h2 className="panel-title mb-4 text-lg text-ink">Begin a voyage</h2>
        <div className="mb-3 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onNavigate('aurevia', door.launch)}
            className="panel flex min-h-[8.5rem] flex-col items-start gap-2 p-4 text-left transition hover:border-[var(--border-strong)]"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-bronze-soft">
              The sky today
            </span>
            <span className="font-display text-base font-bold text-ink">{door.title}</span>
            <span className="text-sm leading-snug text-muted">{door.line}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('aurevia', DREAM_LAUNCH)}
            className="panel flex min-h-[8.5rem] flex-col items-start gap-2 p-4 text-left transition hover:border-[var(--border-strong)]"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-bronze-soft">
              {night ? 'The night is open' : 'For the night'}
            </span>
            <span className="font-display text-base font-bold text-ink">Dream letter</span>
            <span className="text-sm leading-snug text-muted">
              Leave one image. In the morning, write what you saw.
            </span>
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {AUREVIA_STARTS.map((start) => (
            <button
              key={start.id}
              type="button"
              onClick={() => onNavigate('aurevia', start.launch)}
              className="panel animate-rise flex min-h-[8.5rem] flex-col items-start gap-2 p-4 text-left transition hover:border-[var(--border-strong)]"
            >
              <span className="font-display text-base font-bold text-ink">{start.title}</span>
              <span className="text-sm leading-snug text-muted">{start.line}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 sm:px-10 lg:px-14">
        <h2 className="panel-title mb-4 text-lg text-ink">Studio hub</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onNavigate(card.id, card.id === 'aurevia' ? null : undefined)}
              className={`panel animate-rise flex min-h-[9rem] flex-col items-start gap-2 p-4 text-left transition hover:border-[var(--border-strong)] ${
                card.primary ? 'ring-1 ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]' : ''
              }`}
            >
              <span className="font-display text-base font-bold text-ink">{card.title}</span>
              <span className="text-sm leading-snug text-muted">{card.blurb}</span>
              {card.primary && (
                <span className="mt-auto text-xs font-semibold uppercase tracking-wider text-accent-soft">
                  Primary
                </span>
              )}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
