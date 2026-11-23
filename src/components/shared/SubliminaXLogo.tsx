import { useId } from 'react'

interface Props {
  className?: string
  /** Compact mark for nav */
  size?: 'hero' | 'nav'
  title?: string
}

/**
 * Subliminax mark: concentric rings + DNA helix + ECG/frequency wave.
 * DNA rungs drift; wave scrolls — loops, respects prefers-reduced-motion.
 */
export function SubliminaXLogo({
  className = '',
  size = 'hero',
  title = 'SubliminaX',
}: Props) {
  const uid = useId().replace(/:/g, '')
  const g = (name: string) => `${name}-${uid}`
  const ringCount = 8
  const innerR = 118
  const outerR = 470
  const rings = Array.from({ length: ringCount }, (_, i) => {
    const t = i / (ringCount - 1)
    return {
      r: innerR + t * (outerR - innerR),
      sw: 2.5 + t * 2.5,
    }
  })

  return (
    <svg
      className={`sx-logo sx-logo--${size} ${className}`.trim()}
      viewBox="0 0 1024 1024"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={g('grad')} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDBA74" />
          <stop offset="45%" stopColor="#C4A46A" />
          <stop offset="100%" stopColor="#2DD4BF" />
        </linearGradient>
        <linearGradient id={g('ring')} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="55%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#2DD4BF" />
        </linearGradient>
        <clipPath id={g('core')}>
          <circle cx="512" cy="512" r="108" />
        </clipPath>
      </defs>

      {/* Concentric rings — static frame */}
      <g fill="none" stroke={`url(#${g('ring')})`} strokeLinecap="round" opacity="0.92">
        {rings.map((ring) => (
          <circle key={ring.r} cx="512" cy="512" r={ring.r} strokeWidth={ring.sw} />
        ))}
      </g>

      {/* Core circle */}
      <circle
        cx="512"
        cy="512"
        r="112"
        fill="none"
        stroke={`url(#${g('grad')})`}
        strokeWidth="3"
      />

      {/* Animated DNA + frequency (clipped to core) */}
      <g clipPath={`url(#${g('core')})`}>
        {/* DNA helix strands + drifting rungs */}
        <g
          className="sx-logo-dna"
          fill="none"
          stroke={`url(#${g('grad')})`}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            strokeWidth="4.5"
            d="M 455 360 C 485 388, 505 416, 455 444 C 405 472, 405 500, 455 528 C 505 556, 505 584, 455 612 C 420 632, 420 650, 442 666"
          />
          <path
            strokeWidth="4.5"
            d="M 549 360 C 519 388, 499 416, 549 444 C 599 472, 599 500, 549 528 C 499 556, 499 584, 549 612 C 584 632, 584 650, 562 666"
          />
          <g className="sx-logo-rungs" strokeWidth="3" opacity="0.95">
            {/* Duplicate rung stack for seamless vertical scroll */}
            {[0, 34].map((offset) => (
              <g key={offset} transform={`translate(0 ${offset})`}>
                <line x1="468" y1="382" x2="536" y2="382" />
                <line x1="455" y1="416" x2="549" y2="416" />
                <line x1="462" y1="450" x2="542" y2="450" />
                <line x1="455" y1="484" x2="549" y2="484" />
                <line x1="468" y1="518" x2="536" y2="518" />
                <line x1="455" y1="552" x2="549" y2="552" />
                <line x1="462" y1="586" x2="542" y2="586" />
                <line x1="455" y1="620" x2="549" y2="620" />
                <line x1="468" y1="650" x2="536" y2="650" />
              </g>
            ))}
          </g>
        </g>

        {/* Frequency / ECG wave — scrolling */}
        <g className="sx-logo-wave" fill="none" stroke={`url(#${g('grad')})`} strokeLinecap="round" strokeLinejoin="round">
          <g className="sx-logo-wave-track">
            {/* Two copies for seamless horizontal loop */}
            <path
              strokeWidth="5"
              d="M 200 512 L 260 512 L 280 512 L 300 440 L 325 580 L 350 478 L 370 512 L 420 512 L 460 512 L 490 512 L 510 440 L 535 580 L 560 478 L 580 512 L 640 512 L 700 512"
            />
            <path
              strokeWidth="5"
              d="M 700 512 L 760 512 L 780 512 L 800 440 L 825 580 L 850 478 L 870 512 L 920 512 L 960 512 L 990 512 L 1010 440 L 1035 580 L 1060 478 L 1080 512 L 1140 512 L 1200 512"
            />
          </g>
        </g>
      </g>
    </svg>
  )
}
