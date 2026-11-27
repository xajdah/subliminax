import { useEffect, useRef } from 'react'
import type { BusAnalysers } from '../../audio/PsychoacousticEngine'

const BAR_COUNT = 48
const BAR_COLOR = '#e8913a'
const MASK_COLOR = '#5eead4'

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
  /** Launch closed-eye Ganzfeld visual sync (Player / Studio). */
  onOpenGanzfeld?: () => void
  /** Compact layout for corner dock */
  compact?: boolean
  className?: string
}

/**
 * Subliminal X-Ray — live bar equalizer + voice unveil / focus masking.
 * Visual language matches the player equalizer mockup (amber bars, teal mask line).
 */
export function SubliminalXRay({
  analysers,
  maskingThresholdDb,
  liveBeatHz: _liveBeatHz,
  ultrasonicHz: _ultrasonicHz,
  ultrasonicOn: _ultrasonicOn,
  isolateVoice,
  checkMasking,
  onIsolateVoice,
  onCheckMasking,
  onOpenGanzfeld,
  compact = false,
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)
  const smoothed = useRef(new Float32Array(BAR_COUNT))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w < 2 || h < 2) {
        raf.current = requestAnimationFrame(draw)
        return
      }
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      // Recessed plate
      ctx.fillStyle = '#0e1014'
      ctx.fillRect(0, 0, w, h)

      const padX = 10
      const padT = 8
      const padB = 10
      const gw = w - padX * 2
      const gh = h - padT - padB
      const gap = Math.max(1.5, gw / BAR_COUNT / 5)
      const barW = (gw - gap * (BAR_COUNT - 1)) / BAR_COUNT

      // Aggregate live spectrum into log-spaced bars
      const levels = new Float32Array(BAR_COUNT)
      if (analysers) {
        const sources = [
          analysers.music,
          analysers.soundscape,
          analysers.frequency,
          analysers.voice,
        ]
        const bins = new Uint8Array(sources[0].frequencyBinCount)
        const nyquist = (sources[0].context as AudioContext).sampleRate / 2
        const fMin = 40
        const fMax = 16000
        const scratch = new Float32Array(BAR_COUNT)

        for (const src of sources) {
          src.getByteFrequencyData(bins)
          for (let i = 0; i < bins.length; i++) {
            const f = (i / bins.length) * nyquist
            if (f < fMin || f > fMax) continue
            const t =
              (Math.log10(f) - Math.log10(fMin)) / (Math.log10(fMax) - Math.log10(fMin))
            const bi = Math.min(BAR_COUNT - 1, Math.max(0, Math.floor(t * BAR_COUNT)))
            scratch[bi] = Math.max(scratch[bi], bins[i] / 255)
          }
          for (let b = 0; b < BAR_COUNT; b++) {
            levels[b] = Math.max(levels[b], scratch[b])
            scratch[b] = 0
          }
        }
      } else {
        // Idle shimmer so the plate never looks empty
        const t = performance.now() / 900
        for (let b = 0; b < BAR_COUNT; b++) {
          const envelope = 1 - (b / BAR_COUNT) * 0.72
          levels[b] = (0.12 + 0.08 * Math.sin(t + b * 0.35)) * envelope
        }
      }

      for (let b = 0; b < BAR_COUNT; b++) {
        smoothed.current[b] += (levels[b] - smoothed.current[b]) * 0.28
      }

      // Masking threshold as teal floor line (dB −90…0 → y)
      const maskY =
        padT + ((0 - Math.max(-90, Math.min(0, maskingThresholdDb))) / 90) * gh

      for (let b = 0; b < BAR_COUNT; b++) {
        const v = Math.max(0.04, Math.min(1, smoothed.current[b]))
        const bh = Math.max(3, v * gh)
        const x = padX + b * (barW + gap)
        const y = padT + gh - bh
        const grad = ctx.createLinearGradient(x, y, x, padT + gh)
        grad.addColorStop(0, '#f0a45a')
        grad.addColorStop(1, BAR_COLOR)
        ctx.fillStyle = grad
        ctx.globalAlpha = 0.55 + v * 0.45
        roundBar(ctx, x, y, barW, bh, Math.min(2.5, barW / 2))
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Teal conscious-mask line
      ctx.strokeStyle = MASK_COLOR
      ctx.globalAlpha = 0.85
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(padX, maskY)
      ctx.lineTo(padX + gw, maskY)
      ctx.stroke()
      ctx.globalAlpha = 1

      raf.current = requestAnimationFrame(draw)
    }

    raf.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf.current)
  }, [analysers, maskingThresholdDb])

  return (
    <div className={`xray-eq ${compact ? 'xray-eq--compact' : ''} ${className}`.trim()}>
      <div className="xray-eq-head">
        <div className="xray-eq-title-row">
          <span className="xray-eq-pulse" aria-hidden />
          <h3 className="xray-eq-title">Subliminal X-Ray</h3>
          <span className="xray-eq-help" title="Live spectrum of your mix buses with conscious masking floor">
            ?
          </span>
        </div>
        <div className="xray-eq-focus">
          <span className="xray-eq-focus-label" title="Highlight energy above the masking threshold">
            Focus
          </span>
          <button
            type="button"
            className="xray-eq-toggle"
            role="switch"
            aria-checked={checkMasking}
            aria-label="Focus masking check"
            data-on={checkMasking ? '1' : '0'}
            onClick={() => onCheckMasking(!checkMasking)}
          >
            <span className="xray-eq-toggle-knob" />
          </button>
          {onOpenGanzfeld && (
            <button type="button" className="btn btn-ghost text-xs" onClick={onOpenGanzfeld}>
              Ganzfeld
            </button>
          )}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className={`xray-eq-canvas ${compact ? 'h-28' : 'h-40 sm:h-48'}`}
        aria-hidden
      />

      <button
        type="button"
        className="xray-eq-unveil"
        data-active={isolateVoice ? '1' : '0'}
        onClick={() => onIsolateVoice(!isolateVoice)}
      >
        <span className="xray-eq-unveil-icon" aria-hidden>
          ◉
        </span>
        {isolateVoice ? 'Hide spoken layer' : 'Unveil the spoken layer'}
      </button>
      <p className="xray-eq-blurb">
        Mutes the ambience and plays your script at full level so you can audit it anytime.
      </p>
    </div>
  )
}

function roundBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}
