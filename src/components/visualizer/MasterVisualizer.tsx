import { useEffect, useRef } from 'react'
import type { VisualConfig } from '../../types/studio'

interface Props {
  analyser: AnalyserNode | null
  bed: AnalyserNode | null
  carrier: AnalyserNode | null
  voice: AnalyserNode | null
  visual: VisualConfig
  playing: boolean
  xrayFocus: boolean
}

export function MasterVisualizer({
  analyser,
  bed,
  carrier,
  voice,
  visual,
  playing,
  xrayFocus,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
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

    const time = new Uint8Array(2048)
    const freq = new Uint8Array(1024)
    let raf = 0
    let phase = 0

    const drawTrace = (
      node: AnalyserNode | null,
      y0: number,
      h: number,
      color: string,
      width: number,
      _height: number,
    ) => {
      if (!node) return
      node.getByteTimeDomainData(time)
      ctx.beginPath()
      const step = width / time.length
      for (let i = 0; i < time.length; i += 2) {
        const v = (time[i]! - 128) / 128
        const x = i * step
        const y = y0 + h / 2 + v * (h * 0.4)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.strokeStyle = color
      ctx.lineWidth = 1.4
      ctx.stroke()
    }

    const frame = () => {
      const { width, height } = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, width, height)
      if (visual.mode === 'off') {
        raf = requestAnimationFrame(frame)
        return
      }

      if (!visual.reduceMotion) phase += 0.01

      if (visual.mode === 'xray' || xrayFocus) {
        const h = height / 3
        drawTrace(bed, 0, h, 'rgba(45,212,191,0.85)', width, height)
        drawTrace(carrier, h, h, 'rgba(251,146,60,0.9)', width, height)
        drawTrace(voice, h * 2, h, 'rgba(253,186,116,0.85)', width, height)
        ctx.fillStyle = 'rgba(138,160,166,0.7)'
        ctx.font = '11px Outfit, sans-serif'
        ctx.fillText('Bed', 8, 14)
        ctx.fillText('Carrier', 8, h + 14)
        ctx.fillText('Voice', 8, h * 2 + 14)
      } else if (visual.mode === 'aura') {
        let energy = 0.2
        if (analyser && playing) {
          analyser.getByteTimeDomainData(time)
          let s = 0
          for (let i = 0; i < time.length; i++) {
            const v = (time[i]! - 128) / 128
            s += v * v
          }
          energy = Math.min(1, Math.sqrt(s / time.length) * 4)
        }
        const g = ctx.createRadialGradient(
          width / 2,
          height / 2,
          10,
          width / 2,
          height / 2,
          Math.min(width, height) * 0.55,
        )
        g.addColorStop(0, `rgba(253,186,116,${0.35 + energy * 0.3})`)
        g.addColorStop(0.5, `rgba(45,212,191,${0.2 + energy * 0.2})`)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, width, height)
      } else {
        // cymatics rings
        let energy = 0.15
        if (analyser && playing) {
          analyser.getByteFrequencyData(freq)
          let s = 0
          for (let i = 0; i < 64; i++) s += freq[i]!
          energy = Math.min(1, s / (64 * 180))
          analyser.getByteTimeDomainData(time)
        }
        const cx = width / 2
        const cy = height / 2
        const base = Math.min(width, height) * 0.12
        for (let i = 0; i < 6; i++) {
          const r =
            base * (1 + i * 0.55) +
            (visual.reduceMotion ? 0 : Math.sin(phase + i) * (3 + energy * 12))
          ctx.beginPath()
          ctx.arc(cx, cy, r, 0, Math.PI * 2)
          ctx.strokeStyle =
            i % 2 === 0
              ? `rgba(45,212,191,${0.25 + energy * 0.4})`
              : `rgba(251,146,60,${0.22 + energy * 0.35})`
          ctx.lineWidth = 1.2 + i * 0.35
          ctx.stroke()
        }
        if (analyser && playing) {
          ctx.beginPath()
          const slice = width / time.length
          for (let i = 0; i < time.length; i += 3) {
            const v = (time[i]! - 128) / 128
            const x = i * slice
            const y = cy + v * height * 0.22
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.strokeStyle = 'rgba(20,184,166,0.55)'
          ctx.lineWidth = 1.3
          ctx.stroke()
        }
      }

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [analyser, bed, carrier, voice, visual, playing, xrayFocus])

  if (visual.mode === 'off') {
    return (
      <div className="flex h-28 items-center justify-center rounded-xl border border-border bg-bg/40 text-sm text-muted">
        Visualiser off
      </div>
    )
  }

  return (
    <div className="relative h-28 overflow-hidden rounded-xl border border-border bg-bg/50 sm:h-32">
      <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />
      {!playing && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted">
          Press Play to drive the visual
        </p>
      )}
    </div>
  )
}
