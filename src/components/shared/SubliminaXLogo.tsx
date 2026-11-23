interface Props {
  className?: string
  size?: 'nav' | 'hero'
  title?: string
}

/**
 * Exact Subliminax emblem.
 * Hero: artwork unchanged — only the existing outer rings gently breathe.
 * DNA / ECG / inner mark stay still. No extra overlay rings.
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
      className={`sx-logo sx-logo-hero-exact ${sizeClass} ${className}`.trim()}
      role="img"
      aria-label={title}
    >
      <img
        src="/hero/logo-rings-breathe.png"
        alt=""
        className="sx-logo-rings-breathe"
        draggable={false}
      />
      <img
        src="/hero/logo-center-static.png"
        alt=""
        className="sx-logo-center-static"
        draggable={false}
      />
    </div>
  )
}
