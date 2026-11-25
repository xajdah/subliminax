import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from '../hooks/useTheme'
import {
  computeKinematics,
  prescribeAura,
  saveAuraPreset,
  sessionFromAuraPrescription,
  writeCreateSeed,
} from '../services/auraPrescription'
import type { AuraKinematics, AuraPrescription, AuraStrokePoint } from '../types/aura'
import { FeatureGuidelines } from './guide/FeatureGuidelines'
import { ThemeToggle } from './ThemeToggle'

interface Props {
  onHome: () => void
  onGenerateTrack: () => void
}

type Phase = 'draw' | 'words' | 'card'

const DRAW_MIN_SEC = 10
const DRAW_MAX_SEC = 20

export function AuraCalibration({ onHome, onGenerateTrack }: Props) {
  const { theme, toggleTheme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef<AuraStrokePoint[][]>([])
  const currentRef = useRef<AuraStrokePoint[]>([])
  const drawingRef = useRef(false)
  const lastRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; hue: number }[]>(
    [],
  )
  const paintRafRef = useRef(0)
  const clockRafRef = useRef(0)
  const startedAtRef = useRef(0)

  const [phase, setPhase] = useState<Phase>('draw')
  const [elapsed, setElapsed] = useState(0)
  const [hue, setHue] = useState(168)
  const [words, setWords] = useState<[string, string, string]>(['', '', ''])
  const [kin, setKin] = useState<AuraKinematics | null>(null)
  const [rx, setRx] = useState<AuraPrescription | null>(null)
  const [savedNote, setSavedNote] = useState<string | null>(null)

  const resize = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = c.clientWidth
    const h = c.clientHeight
    c.width = Math.floor(w * dpr)
    c.height = Math.floor(h * dpr)
    const ctx = c.getContext('2d')
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }, [])

  useEffect(() => {
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [resize])

  useEffect(() => {
    if (phase !== 'draw') return
    startedAtRef.current = performance.now()
    const tick = () => {
      const sec = (performance.now() - startedAtRef.current) / 1000
      setElapsed(sec)
      if (sec >= DRAW_MAX_SEC) finishDrawing()
      else clockRafRef.current = requestAnimationFrame(tick)
    }
    clockRafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(clockRafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (phase !== 'draw') return
    let alive = true
    const loop = () => {
      if (!alive) return
      paint()
      paintRafRef.current = requestAnimationFrame(loop)
    }
    paintRafRef.current = requestAnimationFrame(loop)
    return () => {
      alive = false
      cancelAnimationFrame(paintRafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, hue])

  const paint = () => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const w = c.clientWidth
    const h = c.clientHeight
    ctx.fillStyle = 'rgba(4, 10, 14, 0.22)'
    ctx.fillRect(0, 0, w, h)

    // Trails
    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke, hue)
    }
    drawStroke(ctx, currentRef.current, hue)

    // Particles
    const next: typeof particlesRef.current = []
    for (const p of particlesRef.current) {
      p.x += p.vx
      p.y += p.vy
      p.life -= 0.02
      if (p.life <= 0) continue
      ctx.beginPath()
      ctx.fillStyle = `hsla(${p.hue}, 85%, 62%, ${p.life})`
      ctx.shadowColor = `hsla(${p.hue}, 90%, 55%, ${p.life})`
      ctx.shadowBlur = 12
      ctx.arc(p.x, p.y, 2.2 * p.life + 0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      next.push(p)
    }
    particlesRef.current = next
  }

  const pointerPos = (e: React.PointerEvent) => {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() }
  }

  const onDown = (e: React.PointerEvent) => {
    if (phase !== 'draw') return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawingRef.current = true
    const p = pointerPos(e)
    const pressure = 'pressure' in e && e.pressure > 0 ? e.pressure : 0.5
    currentRef.current = [{ ...p, pressure }]
    lastRef.current = p
  }

  const onMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || phase !== 'draw') return
    const p = pointerPos(e)
    const pressure = 'pressure' in e && e.pressure > 0 ? e.pressure : 0.5
    const last = lastRef.current
    currentRef.current.push({ ...p, pressure })
    if (last) {
      const dt = Math.max(1, p.t - last.t)
      const dist = Math.hypot(p.x - last.x, p.y - last.y)
      const v = dist / dt
      const speedHue = (hue + Math.min(80, v * 120)) % 360
      for (let i = 0; i < 2 + Math.floor(v * 8); i++) {
        particlesRef.current.push({
          x: p.x,
          y: p.y,
          vx: (Math.random() - 0.5) * (1 + v * 4),
          vy: (Math.random() - 0.5) * (1 + v * 4),
          life: 0.7 + Math.random() * 0.4,
          hue: speedHue,
        })
      }
    }
    lastRef.current = p
  }

  const onUp = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    if (currentRef.current.length > 1) strokesRef.current.push(currentRef.current)
    currentRef.current = []
    lastRef.current = null
  }

  const finishDrawing = () => {
    if (currentRef.current.length > 1) strokesRef.current.push(currentRef.current)
    currentRef.current = []
    drawingRef.current = false
    cancelAnimationFrame(paintRafRef.current)
    cancelAnimationFrame(clockRafRef.current)
    const durationSec = Math.max(
      0.5,
      (performance.now() - startedAtRef.current) / 1000,
    )
    const colorEnergy = ((hue % 360) / 360 + Math.min(1, strokesRef.current.length / 8)) / 2
    const k = computeKinematics(strokesRef.current, durationSec, colorEnergy)
    setKin(k)
    setPhase('words')
  }

  const submitWords = () => {
    if (!kin) return
    const cleaned: [string, string, string] = [
      words[0].trim() || 'presence',
      words[1].trim() || 'breath',
      words[2].trim() || 'light',
    ]
    setRx(prescribeAura(kin, cleaned))
    setPhase('card')
  }

  const generate = () => {
    if (!rx) return
    writeCreateSeed(sessionFromAuraPrescription(rx))
    onGenerateTrack()
  }

  const savePreset = () => {
    if (!rx || !kin) return
    saveAuraPreset({
      label: `Aura · ${rx.stateLabel}`,
      prescription: rx,
      kinematics: kin,
    })
    setSavedNote('Saved to Studio frequency presets (local).')
  }

  const reset = () => {
    strokesRef.current = []
    currentRef.current = []
    particlesRef.current = []
    setWords(['', '', ''])
    setKin(null)
    setRx(null)
    setSavedNote(null)
    setElapsed(0)
    setPhase('draw')
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[var(--bg)]">
      <header className="relative z-20 mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-5 sm:px-6">
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          ← Home
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold">
            Aura <span className="text-teal">Calibration</span>
          </h1>
          <p className="text-sm text-muted">
            Draw freely · capture somatic intuition · receive a brainwave prescription
          </p>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <div className="relative z-20 mx-auto max-w-5xl px-4 sm:px-6">
        <FeatureGuidelines entryId="aura-calibration" className="mb-4" defaultOpen={phase === 'draw'} />
      </div>

      {phase === 'draw' && (
        <section className="relative z-10 mx-auto max-w-5xl px-4 pb-10 sm:px-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-muted">
              Draw for {DRAW_MIN_SEC}–{DRAW_MAX_SEC}s — velocity paints the trail.
            </p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-muted">
                Trail energy
                <input
                  type="range"
                  min={120}
                  max={320}
                  value={hue}
                  onChange={(e) => setHue(Number(e.target.value))}
                  className="field-range w-28"
                />
              </label>
              <span className="tabular-nums text-ink">{Math.min(DRAW_MAX_SEC, elapsed).toFixed(0)}s</span>
              <button
                type="button"
                className="btn btn-primary"
                disabled={elapsed < DRAW_MIN_SEC}
                onClick={finishDrawing}
              >
                Finish drawing
              </button>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            className="aura-canvas h-[min(62vh,560px)] w-full touch-none rounded-2xl border border-[var(--border-strong)]"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
        </section>
      )}

      {phase === 'words' && (
        <section className="relative z-10 mx-auto max-w-lg px-4 pb-16 sm:px-6">
          <div className="panel space-y-4 p-5">
            <h2 className="panel-title text-lg">3-word subconscious association</h2>
            <p className="text-sm text-muted">
              Write the first 3 words that enter your mind right now.
            </p>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2].map((i) => (
                <input
                  key={i}
                  className="field-input min-w-[7rem] flex-1 rounded-full px-4 text-center"
                  placeholder={`Word ${i + 1}`}
                  value={words[i]}
                  maxLength={24}
                  onChange={(e) => {
                    const next = [...words] as [string, string, string]
                    next[i] = e.target.value
                    setWords(next)
                  }}
                />
              ))}
            </div>
            <button type="button" className="btn btn-primary w-full" onClick={submitWords}>
              Read my Aura
            </button>
          </div>
        </section>
      )}

      {phase === 'card' && rx && (
        <section className="relative z-10 mx-auto max-w-xl px-4 pb-16 sm:px-6">
          <article className="panel space-y-4 overflow-hidden p-0">
            <div className="bg-gradient-to-br from-[color-mix(in_oklab,var(--accent)_35%,transparent)] to-[color-mix(in_oklab,var(--accent-2)_40%,transparent)] px-5 py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze-soft">
                Aura & Brainwave Prescription
              </p>
              <h2 className="mt-1 font-display text-2xl font-extrabold text-ink">{rx.stateLabel}</h2>
              <p className="mt-2 text-sm text-muted">{rx.blurb}</p>
            </div>
            <div className="space-y-3 px-5 pb-5">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Carrier" value={`${rx.carrierHz} Hz`} />
                <Stat label="Beat" value={`${rx.beatHz} Hz`} />
                <Stat label="Entrainment" value={rx.entrainment} />
                <Stat label="Spatial" value={rx.spatial} />
                <Stat
                  label="Breath"
                  value={rx.breathPattern ? `${rx.breathPattern} sync` : '—'}
                />
                <Stat label="Words" value={rx.words.join(' · ')} />
              </dl>
              <p className="rounded-lg border border-[var(--border)] p-3 text-xs leading-relaxed text-muted">
                Script seed: <span className="text-ink">{rx.script}</span>
              </p>
              {kin && (
                <p className="text-[11px] text-muted">
                  Telemetry · v̄ {kin.avgVelocity.toFixed(2)} px/ms · angularity{' '}
                  {(kin.angularity * 100).toFixed(0)}% · pauses {kin.pauseCount}
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" className="btn btn-primary" onClick={generate}>
                  ✨ Generate Track Now
                </button>
                <button type="button" className="btn btn-teal" onClick={savePreset}>
                  💾 Save Frequency Preset
                </button>
                <button type="button" className="btn btn-ghost" onClick={reset}>
                  Draw again
                </button>
              </div>
              {savedNote && (
                <p className="text-xs text-teal" role="status">
                  {savedNote}
                </p>
              )}
            </div>
          </article>
        </section>
      )}
    </div>
  )
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: AuraStrokePoint[],
  baseHue: number,
) {
  if (stroke.length < 2) return
  for (let i = 1; i < stroke.length; i++) {
    const a = stroke[i - 1]!
    const b = stroke[i]!
    const dt = Math.max(1, b.t - a.t)
    const v = Math.hypot(b.x - a.x, b.y - a.y) / dt
    const w = 1.5 + Math.min(8, v * 10) * (0.4 + b.pressure)
    const h = (baseHue + Math.min(90, v * 140)) % 360
    ctx.beginPath()
    ctx.strokeStyle = `hsla(${h}, 90%, 62%, 0.85)`
    ctx.lineWidth = w
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowColor = `hsla(${h}, 100%, 55%, 0.65)`
    ctx.shadowBlur = 10 + v * 8
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
  ctx.shadowBlur = 0
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 font-display text-sm font-semibold capitalize text-ink">{value}</dd>
    </div>
  )
}
