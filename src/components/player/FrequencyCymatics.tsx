import { useEffect, useRef } from 'react'

interface Props {
  /** Carrier / solfeggio tone of the playing subliminal (Hz) */
  carrierHz: number
  /** Entrainment beat of the playing subliminal (Hz) */
  beatHz: number
  /** Optional frequency-bus analyser — drives sand amplitude from live audio */
  analyser?: AnalyserNode | null
  playing: boolean
  className?: string
}

/**
 * Chladni-style cymatic plate for the *exact* frequency pair of the active mix.
 * Mode indices are derived from carrier + beat so each track draws its own figure.
 */
export function FrequencyCymatics({
  carrierHz,
  beatHz,
  analyser,
  playing,
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bins = analyser ? new Uint8Array(analyser.frequencyBinCount) : null
    let t0 = performance.now()

    // Integer modal indices locked to this mix's frequencies
    const n = Math.max(1, Math.round(1 + ((carrierHz % 200) / 200) * 7))
    const m = Math.max(1, Math.round(1 + (Math.min(40, Math.max(0.5, beatHz)) / 40) * 6))

    const draw = (now: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      ctx.fillStyle = '#0c0e14'
      ctx.fillRect(0, 0, w, h)

      // Soft plate disc
      const cx = w / 2
      const cy = h / 2
      const r = Math.min(w, h) * 0.42
      const plate = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r)
      plate.addColorStop(0, '#1a1f2c')
      plate.addColorStop(1, '#0c0e14')
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = plate
      ctx.fill()

      let amp = playing ? 0.55 : 0.18
      if (analyser && bins && playing) {
        analyser.getByteFrequencyData(bins)
        let sum = 0
        for (let i = 0; i < bins.length; i++) sum += bins[i]
        amp = Math.min(1, (sum / bins.length / 255) * 2.4 + 0.2)
      }

      const phase = playing ? ((now - t0) / 1000) * beatHz * Math.PI * 2 * 0.15 : 0
      const step = Math.max(3, Math.floor(r / 48))

      for (let y = -r; y <= r; y += step) {
        for (let x = -r; x <= r; x += step) {
          if (x * x + y * y > r * r) continue
          const u = (x / r + 1) / 2
          const v = (y / r + 1) / 2
          // Standing-wave Chladni field for modes (n, m)
          const field =
            Math.cos(n * Math.PI * u) * Math.cos(m * Math.PI * v) -
            Math.cos(m * Math.PI * u) * Math.cos(n * Math.PI * v)
          const nodal = Math.abs(field)
          if (nodal > 0.12 + (1 - amp) * 0.35) continue

          const shimmer = 0.55 + 0.45 * Math.sin(phase + field * 6 + carrierHz * 0.01)
          const size = 1.1 + amp * 1.8 * (1 - nodal)
          const a = (1 - nodal) * amp * shimmer
          ctx.fillStyle = `rgba(251, 191, 36, ${Math.min(0.95, a)})`
          ctx.beginPath()
          ctx.arc(cx + x, cy + y, size, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Ring + labels
      ctx.strokeStyle = 'rgba(251,191,36,0.35)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = 'rgba(253,230,138,0.85)'
      ctx.font = '12px ui-sans-serif, system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(
        `${carrierHz.toFixed(0)} Hz · beat ${beatHz.toFixed(1)} Hz · mode ${n}×${m}`,
        cx,
        cy + r + 22,
      )

      raf.current = requestAnimationFrame(draw)
    }

    raf.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf.current)
  }, [carrierHz, beatHz, analyser, playing])

  return (
    <div className={`panel overflow-hidden p-3 ${className}`.trim()}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="panel-title text-sm">Frequency Cymatics</h3>
        <p className="text-xs text-muted">Figure locked to this mix’s carrier + beat</p>
      </div>
      <canvas ref={canvasRef} className="h-64 w-full rounded-md sm:h-72" />
    </div>
  )
}
