import { useEffect, useRef } from 'react'
import type { BusAnalysers } from '../../audio/PsychoacousticEngine'

const BUS_COLORS = {
  music: '#6366f1',
  soundscape: '#14b8a6',
  frequency: '#f59e0b',
  voice: '#22d3ee',
} as const

const BANDS: { id: string; lo: number; hi: number; label: string }[] = [
  { id: 'delta', lo: 0.5, hi: 4, label: 'Δ' },
  { id: 'theta', lo: 4, hi: 8, label: 'Θ' },
  { id: 'alpha', lo: 8, hi: 12, label: 'Α' },
  { id: 'beta', lo: 12, hi: 30, label: 'Β' },
  { id: 'gamma', lo: 30, hi: 100, label: 'Γ' },
]

interface Props {
  analysers: BusAnalysers | null
  maskingThresholdDb: number
  liveBeatHz: number
  ultrasonicHz: number
  ultrasonicOn: boolean
  isolateVoice: boolean
  checkMasking: boolean
  onIsolateVoice: (on: boolean) => void
  onCheckMasking: (on: boolean) => void
}

export function SubliminalXRay({
  analysers,
  maskingThresholdDb,
  liveBeatHz,
  ultrasonicHz,
  ultrasonicOn,
  isolateVoice,
  checkMasking,
  onIsolateVoice,
  onCheckMasking,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      // Charcoal panel
      ctx.fillStyle = '#12141a'
      ctx.fillRect(0, 0, w, h)

      const padL = 44
      const padR = 16
      const padT = 20
      const padB = 28
      const gw = w - padL - padR
      const gh = h - padT - padB

      // Log freq axis 20 Hz – 20 kHz
      const fMin = 20
      const fMax = 20000
      const xAtF = (f: number) => {
        const t = (Math.log10(Math.max(f, fMin)) - Math.log10(fMin)) / (Math.log10(fMax) - Math.log10(fMin))
        return padL + t * gw
      }
      const yAtDb = (db: number) => {
        const lo = -90
        const hi = 0
        return padT + ((hi - db) / (hi - lo)) * gh
      }

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      for (const f of [50, 100, 200, 500, 1000, 2000, 5000, 10000]) {
        const x = xAtF(f)
        ctx.beginPath()
        ctx.moveTo(x, padT)
        ctx.lineTo(x, padT + gh)
        ctx.stroke()
      }

      // Brainwave band markers
      for (const b of BANDS) {
        const x0 = xAtF(b.lo)
        const x1 = xAtF(b.hi)
        ctx.fillStyle = 'rgba(251,146,60,0.06)'
        ctx.fillRect(x0, padT, x1 - x0, gh)
        ctx.fillStyle = 'rgba(253,186,116,0.55)'
        ctx.font = '10px ui-sans-serif, system-ui'
        ctx.fillText(b.label, x0 + 3, padT + 12)
      }

      // Ultrasonic zone
      const ux = xAtF(ultrasonicHz)
      ctx.fillStyle = ultrasonicOn ? 'rgba(34,211,238,0.12)' : 'rgba(34,211,238,0.05)'
      ctx.fillRect(ux - 8, padT, 16, gh)
      ctx.fillStyle = '#67e8f9'
      ctx.font = '9px ui-sans-serif'
      ctx.fillText('16k', ux - 10, padT + gh + 14)

      // Conscious masking threshold
      const my = yAtDb(maskingThresholdDb)
      ctx.save()
      ctx.setLineDash([6, 5])
      ctx.strokeStyle = 'rgba(248,113,113,0.75)'
      ctx.beginPath()
      ctx.moveTo(padL, my)
      ctx.lineTo(padL + gw, my)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(252,165,165,0.85)'
      ctx.font = '10px ui-sans-serif'
      ctx.fillText(`Mask ${maskingThresholdDb.toFixed(0)} dB`, padL + 4, my - 4)
      ctx.restore()

      // Live beat pin
      const bx = xAtF(Math.max(0.5, liveBeatHz))
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(bx, padT)
      ctx.lineTo(bx, padT + gh)
      ctx.stroke()
      ctx.fillStyle = '#fcd34d'
      ctx.font = '10px ui-sans-serif'
      ctx.fillText(`${liveBeatHz.toFixed(1)} Hz`, bx + 4, padT + 24)

      // Spectra
      if (analysers) {
        const nyquist = (analysers.music.context as AudioContext).sampleRate / 2
        drawCurve(ctx, analysers.music, BUS_COLORS.music, padL, padT, gw, gh, fMin, fMax, nyquist)
        drawCurve(ctx, analysers.soundscape, BUS_COLORS.soundscape, padL, padT, gw, gh, fMin, fMax, nyquist)
        drawCurve(ctx, analysers.frequency, BUS_COLORS.frequency, padL, padT, gw, gh, fMin, fMax, nyquist)
        drawCurve(ctx, analysers.voice, BUS_COLORS.voice, padL, padT, gw, gh, fMin, fMax, nyquist)
      }

      // Legend
      let lx = padL
      for (const [k, c] of Object.entries(BUS_COLORS)) {
        ctx.fillStyle = c
        ctx.fillRect(lx, 6, 10, 10)
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.font = '10px ui-sans-serif'
        ctx.fillText(k, lx + 14, 15)
        lx += 78
      }

      raf.current = requestAnimationFrame(draw)
    }
    raf.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf.current)
  }, [analysers, maskingThresholdDb, liveBeatHz, ultrasonicHz, ultrasonicOn])

  return (
    <div className="panel overflow-hidden p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="panel-title text-sm">Subliminal X-Ray</h3>
        <div className="flex gap-2">
          <button
            type="button"
            className={`btn text-xs ${isolateVoice ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onIsolateVoice(!isolateVoice)}
          >
            Isolate Voice
          </button>
          <button
            type="button"
            className={`btn text-xs ${checkMasking ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onCheckMasking(!checkMasking)}
          >
            Check Masking
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="h-56 w-full rounded-md" />
    </div>
  )
}

function drawCurve(
  ctx: CanvasRenderingContext2D,
  analyser: AnalyserNode,
  color: string,
  padL: number,
  padT: number,
  gw: number,
  gh: number,
  fMin: number,
  fMax: number,
  nyquist: number,
) {
  const bins = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(bins)
  ctx.beginPath()
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.85
  ctx.lineWidth = 1.5
  let started = false
  for (let i = 1; i < bins.length; i++) {
    const f = (i / bins.length) * nyquist
    if (f < fMin || f > fMax) continue
    const t =
      (Math.log10(f) - Math.log10(fMin)) / (Math.log10(fMax) - Math.log10(fMin))
    const x = padL + t * gw
    const db = (bins[i] / 255) * 90 - 90
    const y = padT + ((0 - db) / 90) * gh
    if (!started) {
      ctx.moveTo(x, y)
      started = true
    } else ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.globalAlpha = 1
}
