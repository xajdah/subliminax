interface Props {
  className?: string
  size?: 'nav' | 'hero'
  title?: string
}

/** Procedural double-helix paths for one vertical tile (viewBox units). */
function helixPaths(tileH = 200, amp = 28, turns = 2.15) {
  const steps = 64
  const left: string[] = []
  const right: string[] = []
  const rungs: { x1: number; y1: number; x2: number; y2: number; front: boolean }[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const y = t * tileH
    const a = t * turns * Math.PI * 2
    const xL = Math.sin(a) * amp
    const xR = Math.sin(a + Math.PI) * amp
    left.push(`${i === 0 ? 'M' : 'L'}${xL.toFixed(2)} ${y.toFixed(2)}`)
    right.push(`${i === 0 ? 'M' : 'L'}${xR.toFixed(2)} ${y.toFixed(2)}`)
    if (i > 0 && i % 4 === 0) {
      // front when left strand is in front (cos > 0)
      rungs.push({ x1: xL, y1: y, x2: xR, y2: y, front: Math.cos(a) > 0 })
    }
  }
  return { left: left.join(' '), right: right.join(' '), rungs, tileH }
}

const HELIX = helixPaths()

const WAVE =
  'M-150 0 H-95 L-78 -26 L-62 30 L-48 -14 L-36 0 H-12 L0 0 H12 L28 -26 L44 30 L58 -14 L70 0 H150'

/**
 * Minimalist 2D vector Subliminax mark:
 * DNA spirals on its vertical axis, sound wave gently pulses,
 * five concentric rings ripple outward — seamless loop.
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
      className={`sx-logo sx-logo-vector ${sizeClass} ${className}`.trim()}
      role="img"
      aria-label={title}
    >
      <svg
        className="sx-vector"
        viewBox="0 0 512 512"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="sxRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8A86A" />
            <stop offset="45%" stopColor="#7AB8A0" />
            <stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>
          <linearGradient id="sxCoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F0B87A" />
            <stop offset="55%" stopColor="#C9A06A" />
            <stop offset="100%" stopColor="#2DD4BF" />
          </linearGradient>
          <linearGradient id="sxDnaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E8A86A" />
            <stop offset="50%" stopColor="#A8C49A" />
            <stop offset="100%" stopColor="#2AA99A" />
          </linearGradient>
          <linearGradient id="sxWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E8A86A" />
            <stop offset="50%" stopColor="#C9A06A" />
            <stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>
          <clipPath id="sxCoreClip">
            <circle cx="256" cy="256" r="98" />
          </clipPath>
        </defs>

        {/* Charcoal disc */}
        <circle className="sx-v-bg" cx="256" cy="256" r="250" fill="#161616" />

        {/* Five concentric rings — ripple outward */}
        <g className="sx-v-rings" fill="none" stroke="url(#sxRingGrad)" strokeLinecap="round">
          <circle className="sx-v-ring sx-v-ring-1" cx="256" cy="256" r="228" strokeWidth="7" />
          <circle className="sx-v-ring sx-v-ring-2" cx="256" cy="256" r="198" strokeWidth="2.2" />
          <circle className="sx-v-ring sx-v-ring-3" cx="256" cy="256" r="172" strokeWidth="2.2" />
          <circle className="sx-v-ring sx-v-ring-4" cx="256" cy="256" r="146" strokeWidth="2.2" />
          <circle className="sx-v-ring sx-v-ring-5" cx="256" cy="256" r="120" strokeWidth="2.4" />
        </g>

        {/* Inner frame */}
        <circle
          cx="256"
          cy="256"
          r="102"
          fill="none"
          stroke="url(#sxCoreGrad)"
          strokeWidth="3.2"
        />

        {/* Caps / ticks at 12 & 6 */}
        <g fill="none" stroke="url(#sxCoreGrad)" strokeWidth="2.2" strokeLinecap="round">
          <path d="M248 158 H264" />
          <path d="M242 152 A14 14 0 0 1 270 152" />
          <path d="M248 354 H264" />
          <path d="M242 360 A14 14 0 0 0 270 360" />
          <path d="M158 256 H166" />
          <path d="M346 256 H354" />
        </g>

          <g clipPath="url(#sxCoreClip)">
          {/* DNA — spin on vertical axis + continuous upward spiral */}
          <g transform="translate(256 256)">
            <g className="sx-v-dna-spin">
              <g className="sx-v-dna-drift">
                {[0, HELIX.tileH].map((oy) => (
                  <g key={oy} transform={`translate(0 ${-100 + oy})`}>
                    <path
                      d={HELIX.left}
                      fill="none"
                      stroke="url(#sxDnaGrad)"
                      strokeWidth="3.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={HELIX.right}
                      fill="none"
                      stroke="url(#sxDnaGrad)"
                      strokeWidth="3.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.88"
                    />
                    {HELIX.rungs.map((r, i) => (
                      <line
                        key={i}
                        x1={r.x1}
                        y1={r.y1}
                        x2={r.x2}
                        y2={r.y2}
                        stroke="url(#sxDnaGrad)"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        opacity={r.front ? 0.95 : 0.45}
                      />
                    ))}
                  </g>
                ))}
              </g>
            </g>
          </g>

          {/* Sound wave — gentle pulse in place */}
          <g transform="translate(256 256)">
            <g className="sx-v-wave">
              <path
                d={WAVE}
                fill="none"
                stroke="url(#sxWaveGrad)"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}
