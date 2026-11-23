import { useEffect, useRef } from 'react'
import type { MatrixHaloConfig } from '../../types/studio'

interface MatrixHaloPanelProps {
  config: MatrixHaloConfig
  getAnalyser: () => AnalyserNode | null
  transportPlaying: boolean
  onChange: (config: MatrixHaloConfig) => void
}

export function MatrixHaloPanel({
  config,
  getAnalyser,
  transportPlaying,
  onChange,
}: MatrixHaloPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const timeData = new Uint8Array(2048)
    let phase = 0

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, width, height)

      const analyser = getAnalyser()
      let energy = 0.15
      if (analyser && transportPlaying) {
        analyser.getByteTimeDomainData(timeData)
        let sum = 0
        for (let i = 0; i < timeData.length; i++) {
          const v = (timeData[i]! - 128) / 128
          sum += v * v
        }
        energy = Math.min(1, Math.sqrt(sum / timeData.length) * 4)
      }

      const cx = width / 2
      const cy = height / 2
      const baseR = Math.min(width, height) * 0.18
      const reduce = config.reduceMotion

      if (!reduce) phase += 0.008 + energy * 0.02

      // Aura wash
      const aura = ctx.createRadialGradient(cx, cy, baseR * 0.2, cx, cy, baseR * (2.8 + energy))
      aura.addColorStop(0, `rgba(253, 186, 116, ${0.22 + energy * 0.25})`)
      aura.addColorStop(0.45, `rgba(45, 212, 191, ${0.12 + energy * 0.15})`)
      aura.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = aura
      ctx.beginPath()
      ctx.arc(cx, cy, baseR * 3, 0, Math.PI * 2)
      ctx.fill()

      if (config.showRings) {
        const rings = 5
        for (let i = 0; i < rings; i++) {
          const t = i / (rings - 1)
          const stroke = 1.2 + t * 4.5
          const r =
            baseR * (0.55 + t * 1.55) +
            (reduce ? 0 : Math.sin(phase + t * 2) * (4 + energy * 10))
          ctx.beginPath()
          ctx.arc(cx, cy, r, 0, Math.PI * 2)
          ctx.strokeStyle =
            i % 2 === 0
              ? `rgba(45, 212, 191, ${0.25 + energy * 0.35})`
              : `rgba(251, 146, 60, ${0.2 + energy * 0.3})`
          ctx.lineWidth = stroke * config.intensity
          ctx.stroke()
        }
      }

      if (config.showCymatics) {
        const petals = 8
        ctx.save()
        ctx.translate(cx, cy)
        if (!reduce) ctx.rotate(phase * 0.35)
        for (let i = 0; i < petals; i++) {
          const a = (i / petals) * Math.PI * 2
          const rr = baseR * (1.1 + energy * 0.8)
          ctx.beginPath()
          ctx.ellipse(
            Math.cos(a) * rr * 0.35,
            Math.sin(a) * rr * 0.35,
            rr * 0.55,
            rr * 0.18,
            a,
            0,
            Math.PI * 2,
          )
          ctx.strokeStyle = `rgba(253, 186, 116, ${0.18 + energy * 0.25})`
          ctx.lineWidth = 1.25 * config.intensity
          ctx.stroke()
        }
        ctx.restore()

        // Waveform ribbon
        if (analyser && transportPlaying) {
          ctx.beginPath()
          const slice = width / timeData.length
          for (let i = 0; i < timeData.length; i += 4) {
            const v = (timeData[i]! - 128) / 128
            const x = i * slice
            const y = cy + v * height * 0.18 * config.intensity
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.strokeStyle = `rgba(20, 184, 166, ${0.35 + energy * 0.4})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }

      // Core
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 0.45)
      core.addColorStop(0, `rgba(255, 236, 210, ${0.55 + energy * 0.3})`)
      core.addColorStop(0.5, `rgba(45, 212, 191, ${0.35})`)
      core.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = core
      ctx.beginPath()
      ctx.arc(cx, cy, baseR * 0.5, 0, Math.PI * 2)
      ctx.fill()

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [config, getAnalyser, transportPlaying])

  return (
    <section className="panel animate-rise flex h-full flex-col p-4" aria-labelledby="halo-heading">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-teal-mid">
            MatrixHalo
          </p>
          <h2 id="halo-heading" className="panel-title text-xl text-ink">
            Aura visualizer
          </h2>
          <p className="mt-1 text-sm text-muted">
            Cymatics-inspired halo driven by the live analyser.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="chip"
            data-active={config.reduceMotion}
            onClick={() => onChange({ ...config, reduceMotion: !config.reduceMotion })}
          >
            Reduce motion
          </button>
          <button
            type="button"
            className="chip chip-teal"
            data-active={config.showRings}
            onClick={() => onChange({ ...config, showRings: !config.showRings })}
          >
            Rings
          </button>
          <button
            type="button"
            className="chip"
            data-active={config.showCymatics}
            onClick={() => onChange({ ...config, showCymatics: !config.showCymatics })}
          >
            Cymatics
          </button>
        </div>
      </header>

      <div className="relative min-h-[220px] flex-1 overflow-hidden rounded-xl border border-border bg-bg/50">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
        {!transportPlaying && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted">Press Play to animate with audio</p>
          </div>
        )}
      </div>

      <label className="mt-3 block">
        <span className="field-label">Intensity</span>
        <input
          className="field-range"
          type="range"
          min={0.4}
          max={1.6}
          step={0.05}
          value={config.intensity}
          onChange={(e) => onChange({ ...config, intensity: Number(e.target.value) })}
        />
      </label>
    </section>
  )
}
