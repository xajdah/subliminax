interface Props {
  className?: string
  size?: 'nav' | 'hero'
  title?: string
}

/**
 * Exact Subliminax emblem.
 * Hero: rings + ECG stay as the exact static base. Only DNA spirals
 * while rising bottom → top. Reduced motion → logo-exact.png.
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
        {/* Exact rings + ECG (static) */}
        <img
          src="/hero/logo-rings-frame.png"
          alt=""
          className="sx-logo-rings"
          draggable={false}
        />

        <div className="sx-core-clip">
          <div className="sx-layer-align">
            <div className="sx-dna-spiral">
              <div className="sx-dna-rise">
                <img
                  src="/hero/logo-dna-scroll.png"
                  alt=""
                  className="sx-dna-img"
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
