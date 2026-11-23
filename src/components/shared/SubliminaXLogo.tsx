interface Props {
  className?: string
  size?: 'nav' | 'hero'
  title?: string
}

/**
 * Exact Subliminax emblem (unmodified artwork).
 *
 * Hero: rings stay still; DNA + frequency are pixel layers from the same file.
 * Spiral / scroll loops return to the exact rest pose. Reduced motion shows
 * `/hero/logo-exact.png` only.
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

        {/* Clip to innermost circle so motion never leaves the mark */}
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
    </div>
  )
}
