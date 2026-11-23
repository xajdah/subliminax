interface Props {
  className?: string
  size?: 'nav' | 'hero'
  title?: string
}

function helixGeometry(tileH = 220, amp = 42, turns = 2.2) {
  const steps = 56
  const left: string[] = []
  const right: string[] = []
  const rungs: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const y = t * tileH
    const a = t * turns * Math.PI * 2
    const xL = Math.sin(a) * amp
    const xR = Math.sin(a + Math.PI) * amp
    left.push(`${i === 0 ? 'M' : 'L'} ${xL.toFixed(2)} ${y.toFixed(2)}`)
    right.push(`${i === 0 ? 'M' : 'L'} ${xR.toFixed(2)} ${y.toFixed(2)}`)
    if (i > 0 && i % 4 === 0) {
      rungs.push({ x1: xL, y1: y, x2: xR, y2: y })
    }
  }
  return { left: left.join(' '), right: right.join(' '), rungs, tileH }
}

const HELIX = helixGeometry()

const ECG_TILE =
  'M0 0 H28 L36 -28 L44 34 L52 -18 L60 8 H96 L104 -28 L112 34 L120 -18 L128 8 H160 L168 -28 L176 34 L184 -18 L192 8 H228 L236 -28 L244 34 L252 -18 L260 8 H296 L304 -12 L312 18 L320 0'

function DnaTile({ offsetY }: { offsetY: number }) {
  return (
    <g transform={`translate(0 ${offsetY})`}>
      <path
        d={HELIX.left}
        fill="none"
        stroke="url(#sxDnaGrad)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={HELIX.right}
        fill="none"
        stroke="url(#sxDnaGrad)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      {HELIX.rungs.map((r, i) => (
        <line
          key={i}
          x1={r.x1}
          y1={r.y1}
          x2={r.x2}
          y2={r.y2}
          stroke="url(#sxDnaGrad)"
          strokeWidth="2.1"
          strokeLinecap="round"
          opacity="0.9"
        />
      ))}
    </g>
  )
}

/**
 * Exact Subliminax emblem.
 * Hero: static rings from user artwork; DNA spirals; frequency scrolls dynamically.
 * Nav: full static mark for clarity at small size.
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
        src="/hero/logo-rings-frame.png"
        alt=""
        className="sx-logo-rings"
        draggable={false}
      />

      <div className="sx-logo-core" aria-hidden>
        <div className="sx-dna-stage">
          <div className="sx-dna-spiral">
            <div className="sx-dna-drift">
              <svg
                className="sx-dna"
                viewBox="-56 0 112 440"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="sxDnaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#C9854A" />
                    <stop offset="45%" stopColor="#5BB8A0" />
                    <stop offset="100%" stopColor="#1AA6A0" />
                  </linearGradient>
                </defs>
                <DnaTile offsetY={0} />
                <DnaTile offsetY={HELIX.tileH} />
              </svg>
            </div>
          </div>
        </div>

        <div className="sx-freq-stage">
          <div className="sx-freq-pulse">
            <div className="sx-freq-scroll">
              <svg
                className="sx-freq"
                viewBox="0 0 640 64"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="sxFreqGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#D4924E" />
                    <stop offset="55%" stopColor="#7BC4A8" />
                    <stop offset="100%" stopColor="#14B8A6" />
                  </linearGradient>
                </defs>
                <g transform="translate(0 32)">
                  <path
                    d={ECG_TILE}
                    fill="none"
                    stroke="url(#sxFreqGrad)"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={ECG_TILE}
                    fill="none"
                    stroke="url(#sxFreqGrad)"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    transform="translate(320 0)"
                  />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
