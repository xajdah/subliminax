import { useTheme } from '../../hooks/useTheme'
import type { AppView } from '../../types/studio'
import { SubliminaXLogo } from '../shared/SubliminaXLogo'
import { ThemeToggle } from '../ThemeToggle'

interface Props {
  onNavigate: (view: AppView) => void
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
    title: 'Player',
    blurb: 'Live psychoacoustic playback with X-Ray and tuner access.',
  },
  {
    id: 'saved',
    title: 'Saved Tracks',
    blurb: 'Browse, play, edit, and export completed subliminal tracks.',
  },
  {
    id: 'presets',
    title: 'Quick Presets',
    blurb: 'Jump into Create with curated focus, sleep, and calm starting points.',
  },
  {
    id: 'guide',
    title: 'Psychoacoustics Guide',
    blurb: 'Plain-language notes on carriers, bands, and masking.',
  },
]

export function HomeHub({ onNavigate }: Props) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="hero-shell relative isolate overflow-x-hidden">
      <div className="hero-atmosphere" aria-hidden />
      <div className="hero-grain" aria-hidden />

      {/* First viewport: one split composition — brand/copy left, DNA emblem right */}
      <div className="hero-banner relative z-10 flex min-h-[100svh] flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-10 lg:px-14">
          <div className="flex items-center gap-3">
            <SubliminaXLogo size="nav" className="shrink-0" />
            <p className="font-display text-lg font-extrabold tracking-tight sm:text-xl">
              Sublimina<span className="text-teal">x</span>
            </p>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </header>

        <main className="hero-split mx-auto grid w-full max-w-7xl flex-1 items-center gap-8 px-6 pb-10 pt-2 sm:px-10 lg:grid-cols-2 lg:gap-6 lg:px-14 lg:pb-14">
          <section className="animate-rise hero-copy max-w-xl justify-self-start text-left">
            <p className="hero-brand-mark mb-6 font-display text-[clamp(1.65rem,3.8vw,2.35rem)] font-extrabold tracking-tight text-ink">
              Sublimina<span className="text-teal">x</span>
            </p>
            <h1 className="font-display text-[clamp(2.4rem,5.8vw,4rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-ink">
              <span className="block">Inner Shifts,</span>
              <span className="hero-engineered block">Engineered.</span>
            </h1>
            <p className="mt-6 font-display text-[clamp(1.2rem,2.6vw,1.75rem)] font-semibold tracking-tight text-ink">
              Vibrate{' '}
              <span className="hero-tagline-blend">Higher. Think Clearer.</span>
            </p>
            <p className="hero-support mt-5 max-w-md font-display text-base font-medium tracking-tight text-muted sm:text-lg">
              Sculpt Your Subconscious. <span className="text-ink/80">Own Your Frequency.</span>
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
            className="hero-emblem relative flex items-center justify-center lg:justify-center"
            aria-label="SubliminaX emblem"
          >
            <SubliminaXLogo size="hero" className="hero-mark-img relative z-10" />
          </section>
        </main>
      </div>

      {/* Hub cards — below the first viewport only */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-4 sm:px-10 lg:px-14">
        <h2 className="panel-title mb-4 text-lg text-ink">Studio hub</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onNavigate(card.id)}
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
