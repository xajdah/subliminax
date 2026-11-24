interface Props {
  strokes: number
  size?: number
}

/** Circle, rising line, inner ring, then points of light. One stroke per kept voyage. */
export function SigilMark({ strokes, size = 96 }: Props) {
  const lights = Math.min(8, Math.max(0, strokes - 3))
  const r = 36
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden
      className="shrink-0"
    >
      <circle
        cx="60"
        cy="64"
        r={r}
        fill="none"
        stroke="#c48a48"
        strokeWidth="2.5"
        opacity={strokes >= 1 ? 1 : 0.35}
      />
      {strokes >= 3 && (
        <circle cx="60" cy="64" r="14" fill="none" stroke="#c48a48" strokeWidth="2.5" />
      )}
      {strokes >= 2 && <line x1="60" y1="64" x2="60" y2="18" stroke="#c48a48" strokeWidth="2.5" />}
      {Array.from({ length: lights }, (_, i) => {
        const angle = -Math.PI / 2 + (i * Math.PI * 2) / 8
        const cx = 60 + Math.cos(angle) * 50
        const cy = 64 + Math.sin(angle) * 50
        return <circle key={i} cx={cx} cy={cy} r="3.2" fill="#c48a48" />
      })}
    </svg>
  )
}
