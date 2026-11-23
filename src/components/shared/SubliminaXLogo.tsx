interface Props {
  className?: string
  size?: 'nav' | 'hero'
  title?: string
}

/**
 * Exact Subliminax emblem (unmodified artwork).
 *
 * Hero motion uses pixel layers cut from the same file:
 * - concentric rings stay still
 * - DNA layer slowly spirals (full 360° → identical to rest)
 * - frequency layer scrolls one logo-width → identical to rest
 *
 * Prefers-reduced-motion / “static” fallback shows the original logo file only.
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
      {/* Static exact mark — shown when motion is off */}
      <img
        src="/hero/logo-exact.png"
        alt=""
        className="sx-logo-static-exact"
        draggable={false}
      />

      {/* Animated composite — same pixels; loops back to the exact rest pose */}
      <div className="sx-logo-motion" aria-hidden>
        <img
          src="/hero/logo-rings-frame.png"
          alt=""
          className="sx-logo-rings"
          draggable={false}
        />

        <div className="sx-dna-stage">
          <div className="sx-dna-spiral">
            <img
              src="/hero/logo-dna-layer.png"
              alt=""
              className="sx-dna-img"
              draggable={false}
            />
          </div>
        </div>

        <div className="sx-freq-stage">
          <div className="sx-freq-scroll">
            <img
              src="/hero/logo-freq-scroll.png"
              alt=""
              className="sx-freq-img"
              draggable={false}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
