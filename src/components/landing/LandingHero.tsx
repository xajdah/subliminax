interface LandingHeroProps {
  onEnterStudio: () => void
}

/**
 * Homepage split-banner hero — bronze→teal dark field,
 * copy left / DNA·rings mark right. Brand: SubliminaX.
 */
export function LandingHero({ onEnterStudio }: LandingHeroProps) {
  return (
    <div className="hero-shell relative isolate min-h-screen overflow-hidden">
      <div className="hero-atmosphere" aria-hidden />
      <div className="hero-grain" aria-hidden />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10 lg:px-14">
        <div className="flex items-center gap-3">
          <img
            src="/hero/rings-dna-ecg.svg"
            alt=""
            className="h-9 w-9 sm:h-10 sm:w-10"
          />
          <span className="font-display text-lg font-extrabold tracking-tight text-ink sm:text-xl">
            Sublimina<span className="text-teal">X</span>
          </span>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onEnterStudio}>
          Open Studio
        </button>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-5.5rem)] max-w-7xl items-center gap-8 px-6 pb-16 pt-4 sm:px-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12 lg:px-14 lg:pb-20">
        {/* LEFT — brand + lines */}
        <section className="hero-copy animate-rise relative z-20 max-w-xl lg:pr-4">
          <p className="mb-5 font-display text-sm font-semibold uppercase tracking-[0.22em] text-bronze-soft">
            Sublimina<span className="text-teal">X</span>
          </p>
          <h1 className="font-display text-[clamp(2.2rem,5vw,3.75rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink">
            <span className="block">Inner Shifts,</span>
            <span className="hero-gradient-text">Engineered.</span>
          </h1>
          <p className="mt-6 max-w-md font-display text-xl font-semibold tracking-tight text-ink/90 sm:text-2xl">
            Vibrate Higher. Think Clearer.
          </p>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            Psychoacoustic studio for carrier tones, soundscapes, and affirmations —
            built so every layer stays audible to you.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary px-6 py-3" onClick={onEnterStudio}>
              Enter Studio
            </button>
            <button
              type="button"
              className="btn btn-ghost px-6 py-3"
              onClick={onEnterStudio}
            >
              Simple mode
            </button>
          </div>
        </section>

        {/* RIGHT — DNA / rings mark (transparent SVG, full-bleed plane) */}
        <section
          className="hero-mark relative z-10 flex min-h-[280px] items-center justify-center lg:min-h-[520px] lg:justify-end"
          aria-label="SubliminaX emblem"
        >
          <div className="hero-mark-glow animate-halo" aria-hidden />
          <img
            src="/hero/rings-dna-ecg.svg"
            alt="SubliminaX concentric rings with DNA helix and ECG pulse"
            className="hero-mark-img relative z-10 w-[min(88vw,480px)] max-w-full select-none lg:w-[min(42vw,520px)]"
            draggable={false}
          />
        </section>
      </main>
    </div>
  )
}
