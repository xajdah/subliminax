interface Props {
  className?: string
  size?: 'nav' | 'hero'
  title?: string
}

/**
 * Exact Subliminax emblem (unmodified artwork pixels).
 *
 * Hero motion layers are cut from logo-exact.png:
 * - rings stay still
 * - DNA slowly spirals (full turn returns to the exact pose)
 * - frequency stays the exact ECG line, with a live oscillation that
 *   returns to translateX(0) / scaleY(1) every cycle
 *
 * prefers-reduced-motion → original /hero/logo-exact.png only.
 */
export function SubliminaXLogo({
  className = '',
  size = 'hero',
  title = 'SubliminaX',
}: Props) {
  const sizeClass = size === 'nav' ? 'sx-logo--nav' : 'sx-logo--hero'

  if (size === 'nav') {
    return (
      <div
        className={`sx-logo sx-logo-exact ${sizeClass} ${className}`.trim()}
        role="img"
        aria-label={title}
      >
        <img
          src="/hero/logo-exact.png"
          alt=""
          className="sx-logo-exact-img"
          draggable={false}
        />
      </div>
    )
  }

  return (
    <div
      className={`sx-logo sx-logo-live ${sizeClass} ${className}`.trim()}
      role="img"
      aria-label={title}
    >
      <img
        src="/hero/logo-exact.png"
        alt=""
        className="sx-logo-static-exact"
        draggable={false}
      />

      <div className="sx-logo-motion" aria-hidden>
        <img
          src="/hero/logo-rings-frame.png"
          alt=""
          className="sx-logo-rings"
          draggable={false}
        />

        <div className="sx-core-clip">
          <div className="sx-layer-align">
            <div className="sx-dna-spiral">
              <img
                src="/hero/logo-dna-layer.png"
                alt=""
                className="sx-dna-img"
                draggable={false}
              />
            </div>

            <div className="sx-freq-live">
              <img
                src="/hero/logo-freq-layer.png"
                alt=""
                className="sx-freq-img"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
