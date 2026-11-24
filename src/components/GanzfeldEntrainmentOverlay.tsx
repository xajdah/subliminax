import { useCallback, useEffect, useRef, useState } from 'react'
import {
  GANZFELD_PALETTES,
  samplePhaseSync,
  suggestPaletteForHz,
  type GanzfeldPalette,
  type GanzfeldPhaseMode,
  type GanzfeldWaveform,
} from '../audio/AudioVisualPhaseSync'
import { psychoEngine } from '../audio/PsychoacousticEngine'
import { GanzfeldSafetyModal } from './GanzfeldSafetyModal'

interface Props {
  open: boolean
  onClose: () => void
}

const HUD_HIDE_MS = 4000
const SESSION_CONSENT_KEY = 'subliminax.ganzfeld.consentSession'

function hasSessionConsent() {
  try {
    return sessionStorage.getItem(SESSION_CONSENT_KEY) === '1'
  } catch {
    return false
  }
}

function setSessionConsent() {
  try {
    sessionStorage.setItem(SESSION_CONSENT_KEY, '1')
  } catch {
    /* private mode */
  }
}

export function GanzfeldEntrainmentOverlay({ open, onClose }: Props) {
  const [safetyOpen, setSafetyOpen] = useState(false)
  const [active, setActive] = useState(false)
  const [mode, setMode] = useState<GanzfeldPhaseMode>('monophasic')
  const [palette, setPalette] = useState<GanzfeldPalette>('amber')
  const [waveform, setWaveform] = useState<GanzfeldWaveform>('sine')
  const [intensity, setIntensity] = useState(0.65)
  const [hudVisible, setHudVisible] = useState(true)
  const [beatHz, setBeatHz] = useState(6)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const hudTimer = useRef<number | null>(null)
  const rotRef = useRef(0)
  const lastBeatUi = useRef(0)
  const optsRef = useRef({ mode, waveform, intensity, palette })
  optsRef.current = { mode, waveform, intensity, palette }

  // Gate: first open in session → safety modal
  useEffect(() => {
    if (!open) {
      setActive(false)
      setSafetyOpen(false)
      return
    }
    if (hasSessionConsent()) {
      setActive(true)
      setSafetyOpen(false)
      // Suggest palette from live beat
      const hz = psychoEngine.getEntrainmentSnapshot().beatHz
      setPalette(suggestPaletteForHz(hz))
      setBeatHz(hz)
    } else {
      setSafetyOpen(true)
      setActive(false)
    }
  }, [open])

  const bumpHud = useCallback(() => {
    setHudVisible(true)
    if (hudTimer.current != null) window.clearTimeout(hudTimer.current)
    hudTimer.current = window.setTimeout(() => setHudVisible(false), HUD_HIDE_MS)
  }, [])

  const exit = useCallback(() => {
    setActive(false)
    setSafetyOpen(false)
    onClose()
  }, [onClose])

  // ESC / single-tap exit
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        exit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, exit])

  useEffect(() => {
    if (!active) return
    bumpHud()
    return () => {
      if (hudTimer.current != null) window.clearTimeout(hudTimer.current)
    }
  }, [active, bumpHud])

  // Canvas render loop — rAF + audioCtx.currentTime phase (no setInterval)
  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = window.innerWidth
      const h = window.innerHeight
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const { mode: m, waveform: wf, intensity: inten, palette: pal } = optsRef.current
      const sample = samplePhaseSync({ mode: m, waveform: wf, intensity: inten })
      if (performance.now() - lastBeatUi.current > 250) {
        lastBeatUi.current = performance.now()
        setBeatHz(sample.beatHz)
      }
      const rgb = GANZFELD_PALETTES[pal].rgb

      // Base field
      if (m === 'hemispheric') {
        const mid = w * 0.5
        fillHalf(ctx, 0, 0, mid, h, rgb, sample.left)
        fillHalf(ctx, mid, 0, w - mid, h, rgb, sample.right)
        // Soft seam
        const grad = ctx.createLinearGradient(mid - 24, 0, mid + 24, 0)
        grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`)
        grad.addColorStop(0.5, `rgba(0,0,0,0.15)`)
        grad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`)
        ctx.fillStyle = grad
        ctx.fillRect(mid - 24, 0, 48, h)
      } else {
        fillHalf(ctx, 0, 0, w, h, rgb, sample.field)
      }

      // Sacred geometry / radial mandala — phase-locked radius & luminance
      rotRef.current = sample.audioTime * 0.08
      drawMandala(ctx, w, h, rgb, sample.phaseRad, sample.field, rotRef.current, m === 'hemispheric')

      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active])

  if (!open) return null

  return (
    <>
      <GanzfeldSafetyModal
        open={safetyOpen}
        onCancel={exit}
        onAccept={() => {
          setSessionConsent()
          setSafetyOpen(false)
          setActive(true)
          const hz = psychoEngine.getEntrainmentSnapshot().beatHz
          setPalette(suggestPaletteForHz(hz))
          bumpHud()
        }}
      />

      {active && (
        <div
          className="ganzfeld-overlay"
          onMouseMove={bumpHud}
          onTouchStart={bumpHud}
        >
          <canvas
            ref={canvasRef}
            className="ganzfeld-canvas"
            onClick={(e) => {
              // Single tap/click on canvas (not HUD) exits
              if ((e.target as HTMLElement).closest?.('.ganzfeld-hud')) return
              exit()
            }}
          />

          <div
            className={`ganzfeld-hud ${hudVisible ? 'ganzfeld-hud--visible' : 'ganzfeld-hud--hidden'}`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-sm font-bold tracking-wide text-white/90">
                  Ganzfeld Visual Sync
                </p>
                <p className="text-xs text-white/55">
                  {sampleBandLabel(beatHz)} · {beatHz.toFixed(1)} Hz · Esc / tap to exit
                </p>
              </div>
              <button type="button" className="btn btn-ghost text-xs text-white/80" onClick={exit}>
                Exit
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-white/70">
                Brightness {Math.round(intensity * 100)}%
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={Math.round(intensity * 100)}
                  className="field-range mt-1 w-full"
                  onChange={(e) => setIntensity(Number(e.target.value) / 100)}
                />
              </label>
              <div>
                <p className="text-xs text-white/70">Waveform Softness</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className="chip text-xs"
                    data-active={waveform === 'sine'}
                    onClick={() => setWaveform('sine')}
                  >
                    Soft Sine
                  </button>
                  <button
                    type="button"
                    className="chip text-xs"
                    data-active={waveform === 'isochronic'}
                    onClick={() => setWaveform('isochronic')}
                  >
                    Crisp Isochronic
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs text-white/70">Phase-Lock Mode</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(
                  [
                    ['monophasic', 'Monophasic Pulse'],
                    ['hemispheric', 'Hemispheric Flicker'],
                    ['breathing', 'Breathing Drift'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className="chip text-xs"
                    data-active={mode === id}
                    onClick={() => setMode(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs text-white/70">Chromotherapy Palette</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(Object.keys(GANZFELD_PALETTES) as GanzfeldPalette[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="chip text-xs"
                    data-active={palette === id}
                    onClick={() => setPalette(id)}
                    title={GANZFELD_PALETTES[id].blurb}
                  >
                    {GANZFELD_PALETTES[id].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function fillHalf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rgb: [number, number, number],
  level: number,
) {
  const L = Math.min(1, Math.max(0, level))
  // Closed-eye friendly: never pure black strobe — keep a dim floor
  const floor = 0.04
  const a = floor + L * (1 - floor)
  ctx.fillStyle = `rgb(${Math.round(rgb[0] * a)},${Math.round(rgb[1] * a)},${Math.round(rgb[2] * a)})`
  ctx.fillRect(x, y, w, h)
}

function drawMandala(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rgb: [number, number, number],
  phaseRad: number,
  field: number,
  rot: number,
  split: boolean,
) {
  const cx = split ? w * 0.25 : w * 0.5
  const cx2 = split ? w * 0.75 : w * 0.5
  const cy = h * 0.5
  const maxR = Math.min(w, h) * (0.28 + 0.12 * Math.sin(phaseRad))
  const alpha = 0.08 + 0.18 * field

  const drawAt = (x: number) => {
    ctx.save()
    ctx.translate(x, cy)
    ctx.rotate(rot + phaseRad * 0.15)
    for (let i = 1; i <= 6; i++) {
      const r = (maxR * i) / 6
      ctx.beginPath()
      ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * (1 - i / 8)})`
      ctx.lineWidth = 1.2
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.stroke()
    }
    // Lissajous-ish petals
    ctx.beginPath()
    for (let t = 0; t <= Math.PI * 2 + 0.05; t += 0.05) {
      const px = Math.sin(3 * t + phaseRad) * maxR * 0.55
      const py = Math.sin(2 * t) * maxR * 0.55
      if (t === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.strokeStyle = `rgba(255,255,255,${0.06 + 0.12 * field})`
    ctx.lineWidth = 1.4
    ctx.stroke()
    ctx.restore()
  }

  drawAt(cx)
  if (split) drawAt(cx2)
}

function sampleBandLabel(hz: number): string {
  if (hz < 4) return 'Delta'
  if (hz < 8) return 'Theta'
  if (hz < 12) return 'Alpha'
  if (hz < 30) return 'Beta'
  return 'Gamma'
}
