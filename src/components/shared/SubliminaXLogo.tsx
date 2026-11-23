interface Props {
  className?: string
  size?: 'nav' | 'hero'
  title?: string
}

/**
 * Exact Subliminax emblem (user-supplied artwork).
 * Motion: gentle breathe + shimmer sweep so DNA / frequency read as looping energy.
 */
export function SubliminaXLogo({
  className = '',
  size = 'hero',
  title = 'SubliminaX',
}: Props) {
  const sizeClass = size === 'nav' ? 'sx-logo--nav' : 'sx-logo--hero'

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
      <span className="sx-logo-exact-shimmer" aria-hidden />
    </div>
  )
}
