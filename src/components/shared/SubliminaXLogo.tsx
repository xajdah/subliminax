interface Props {
  className?: string
  size?: 'nav' | 'hero'
  title?: string
}

/**
 * Exact Subliminax emblem.
 * Hero: static artwork + slow expanding ring ripple loop only.
 * Nav: exact mark, no motion.
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

  const ringRadii = [120, 146, 172, 198, 228]

  return (
    <div
      className={`sx-logo sx-logo-hero-exact ${sizeClass} ${className}`.trim()}
      role="img"
      aria-label={title}
    >
      <img
        src="/hero/logo-exact.png"
        alt=""
        className="sx-logo-exact-img"
        draggable={false}
      />

      {/* Expanding ring ripples only — DNA / ECG stay still in the artwork */}
      <svg
        className="sx-ring-ripple"
        viewBox="0 0 512 512"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="sxExpandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8A86A" />
            <stop offset="50%" stopColor="#6BB8A0" />
            <stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#sxExpandGrad)" strokeLinecap="round">
          {ringRadii.map((r, i) => (
            <circle
              key={r}
              className={`sx-expand-ring sx-expand-ring-${i + 1}`}
              cx="256"
              cy="256"
              r={r}
              strokeWidth={i === 4 ? 3.5 : 1.6}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
