import { useEffect, useRef, useState } from 'react'
import { psychoEngine } from '../audio/PsychoacousticEngine'
import {
  decodeSonicDnaFromBuffer,
  decodeSonicDnaFromSamples,
  renderSonicDnaTestTone,
} from '../audio/SonicDnaCodec'
import { useTheme } from '../hooks/useTheme'
import { saveSonicDnaMatrixCard, sessionFromSonicDna } from '../services/sonicDnaApply'
import { writeCreateSeed } from '../services/auraPrescription'
import type { SonicDnaDecodeResult, SonicDnaPayload } from '../types/sonicDna'
import { FeatureGuidelines } from './guide/FeatureGuidelines'
import { ThemeToggle } from './ThemeToggle'

interface Props {
  onHome: () => void
  onApplyToStudio: () => void
}

const SCAN_SEC = 15

type Phase = 'idle' | 'scanning' | 'result'

export function SonicDnaScanner({ onHome, onApplyToStudio }: Props) {
  const { theme, toggleTheme } = useTheme()
  const [phase, setPhase] = useState<Phase>('idle')
  const [left, setLeft] = useState(SCAN_SEC)
  const [result, setResult] = useState<SonicDnaDecodeResult | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [demoPlaying, setDemoPlaying] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const samplesRef = useRef<Float32Array[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      stopCapture()
      if (demoPlaying) psychoEngine.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stopCapture = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    analyserRef.current = null
    void ctxRef.current?.close()
    ctxRef.current = null
  }

  const paintScanner = (progress: number) => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const size = Math.min(c.clientWidth, 360)
    c.width = size * dpr
    c.height = size * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const cx = size / 2
    const cy = size / 2
    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = 'rgba(4,12,16,0.92)'
    ctx.beginPath()
    ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2)
    ctx.fill()

    // Radial spectrogram rings from analyser
    const an = analyserRef.current
    if (an) {
      const bins = new Uint8Array(an.frequencyBinCount)
      an.getByteFrequencyData(bins)
      const rings = 48
      for (let i = 0; i < rings; i++) {
        const idx = Math.floor((i / rings) * bins.length * 0.85)
        const v = (bins[idx] ?? 0) / 255
        const r = size * 0.12 + i * (size * 0.007)
        ctx.beginPath()
        ctx.strokeStyle = `hsla(${170 + v * 80}, 90%, ${45 + v * 30}%, ${0.25 + v * 0.7})`
        ctx.lineWidth = 1.5 + v * 2
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
      }
    } else {
      for (let i = 0; i < 36; i++) {
        const pulse = 0.3 + 0.7 * Math.abs(Math.sin(progress * Math.PI * 2 + i / 5))
        ctx.beginPath()
        ctx.strokeStyle = `hsla(${175 + i}, 80%, 55%, ${0.15 + pulse * 0.35})`
        ctx.lineWidth = 1.2
        ctx.arc(cx, cy, size * 0.14 + i * 4.2, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    // Sweep arm
    const ang = progress * Math.PI * 2 - Math.PI / 2
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.85)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(ang) * size * 0.42, cy + Math.sin(ang) * size * 0.42)
    ctx.stroke()

    ctx.fillStyle = '#e8f6f3'
    ctx.font = '600 28px Syne, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${Math.ceil((1 - progress) * SCAN_SEC)}`, cx, cy + 10)
    ctx.font = '12px Outfit, sans-serif'
    ctx.fillStyle = 'rgba(180,210,205,0.8)'
    ctx.fillText('SCANNING', cx, cy + 28)
  }

  const startMicScan = async () => {
    setNote(null)
    setResult(null)
    setPhase('scanning')
    setLeft(SCAN_SEC)
    samplesRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      streamRef.current = stream
      const ctx = new AudioContext()
      ctxRef.current = ctx
      if (ctx.state === 'suspended') await ctx.resume()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      src.connect(analyser)
      analyserRef.current = analyser

      // ScriptProcessor capture for demod
      const proc = ctx.createScriptProcessor(4096, 1, 1)
      const mute = ctx.createGain()
      mute.gain.value = 0
      proc.onaudioprocess = (ev) => {
        samplesRef.current.push(new Float32Array(ev.inputBuffer.getChannelData(0)))
      }
      src.connect(proc)
      proc.connect(mute)
      mute.connect(ctx.destination)

      const t0 = performance.now()
      const loop = () => {
        const p = Math.min(1, (performance.now() - t0) / (SCAN_SEC * 1000))
        setLeft(Math.max(0, SCAN_SEC * (1 - p)))
        paintScanner(p)
        if (p >= 1) {
          proc.disconnect()
          finishMicScan(ctx.sampleRate)
          return
        }
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
    } catch {
      setPhase('idle')
      setNote('Microphone permission denied.')
    }
  }

  const finishMicScan = (sampleRate: number) => {
    stopCapture()
    let total = 0
    for (const c of samplesRef.current) total += c.length
    const merged = new Float32Array(total)
    let o = 0
    for (const c of samplesRef.current) {
      merged.set(c, o)
      o += c.length
    }
    const decoded = decodeSonicDnaFromSamples(merged, sampleRate)
    setResult(decoded)
    setPhase('result')
    if (decoded.ok && decoded.payload) {
      saveSonicDnaMatrixCard(decoded.payload)
    }
  }

  const onFile = async (file: File | null) => {
    if (!file) return
    setNote(null)
    setResult(null)
    try {
      const buf = await file.arrayBuffer()
      const ctx = new AudioContext()
      const audio = await ctx.decodeAudioData(buf.slice(0))
      await ctx.close()
      const decoded = decodeSonicDnaFromBuffer(audio, { durationSec: Math.min(20, audio.duration) })
      setResult(decoded)
      setPhase('result')
      if (decoded.ok && decoded.payload) saveSonicDnaMatrixCard(decoded.payload, file.name)
    } catch {
      setNote('Could not decode that audio file.')
      setPhase('idle')
    }
  }

  const playDemoWatermark = async () => {
    setNote(null)
    try {
      await psychoEngine.start({ withDemoSources: true })
      const payload = psychoEngine.getSonicDnaPayload()
      const tone = await renderSonicDnaTestTone(payload, 12, 48000)
      await psychoEngine.injectMusicBuffer(tone, { loop: true })
      setDemoPlaying(true)
      setNote(
        'Demo playing with Sonic DNA watermark (18.2–19.4 kHz). Laptop mics often roll off ultrasonics — use Self-check decode for a guaranteed Matrix Card.',
      )
    } catch {
      setNote('Could not start demo watermark playback.')
    }
  }

  const selfCheckDecode = async () => {
    setNote(null)
    try {
      if (!psychoEngine.isPlaying()) await psychoEngine.start({ withDemoSources: true })
      const payload = psychoEngine.getSonicDnaPayload()
      const tone = await renderSonicDnaTestTone(payload, 11, 48000)
      const decoded = decodeSonicDnaFromBuffer(tone)
      setResult(decoded)
      setPhase('result')
      if (decoded.ok && decoded.payload) saveSonicDnaMatrixCard(decoded.payload, 'Self-check DNA')
      setNote('Self-check: decoded from a rendered watermark buffer (no mic).')
    } catch {
      setNote('Self-check decode failed.')
    }
  }

  const applyConfig = (payload: SonicDnaPayload) => {
    writeCreateSeed(sessionFromSonicDna(payload))
    onApplyToStudio()
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          ← Home
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold">
            Sonic <span className="text-teal">DNA</span>
          </h1>
          <p className="text-sm text-muted">
            Authenticate Subliminax tracks & extract DSP presets — affirmations stay masked.
          </p>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <FeatureGuidelines entryId="sonic-dna" className="mb-5" defaultOpen />

      <section className="panel space-y-4 p-5">
        <h2 className="panel-title text-lg">Track authenticator</h2>
        <p className="text-sm text-muted">
          Hold your mic near playing Subliminax audio for 15 seconds, or upload a file. The scanner
          reads the ultrasonic FSK watermark (18.2–19.4 kHz) — never the affirmation layer.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={phase === 'scanning'}
            onClick={() => void startMicScan()}
          >
            Scan Track (15s)
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={phase === 'scanning'}
            onClick={() => fileRef.current?.click()}
          >
            Upload audio file
          </button>
          <button
            type="button"
            className="btn btn-teal"
            disabled={phase === 'scanning'}
            onClick={() => void playDemoWatermark()}
          >
            Play watermarked demo
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={phase === 'scanning'}
            onClick={() => void selfCheckDecode()}
          >
            Self-check decode
          </button>
          {demoPlaying && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                psychoEngine.stop()
                setDemoPlaying(false)
              }}
            >
              Stop demo
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
        />
        {note && (
          <p className="text-xs text-muted" role="status">
            {note}
          </p>
        )}
      </section>

      {(phase === 'scanning' || phase === 'result') && (
        <section className="mt-5 flex flex-col items-center gap-4">
          {phase === 'scanning' && (
            <>
              <canvas ref={canvasRef} className="h-72 w-72 max-w-full" />
              <p className="text-sm text-muted">{left.toFixed(1)}s remaining</p>
            </>
          )}

          {phase === 'result' && result && (
            <MatrixReveal
              result={result}
              onApply={() => result.payload && applyConfig(result.payload)}
              onRescan={() => {
                setPhase('idle')
                setResult(null)
              }}
            />
          )}
        </section>
      )}
    </div>
  )
}

function MatrixReveal({
  result,
  onApply,
  onRescan,
}: {
  result: SonicDnaDecodeResult
  onApply: () => void
  onRescan: () => void
}) {
  if (!result.ok || !result.payload) {
    return (
      <div className="panel w-full max-w-md space-y-3 p-5 text-center">
        <p className="font-display text-lg font-bold text-ink">No authentic watermark found</p>
        <p className="text-sm text-muted">
          {result.error ?? 'Try again closer to the speaker, or upload a cleaner capture.'}
        </p>
        <button type="button" className="btn btn-primary" onClick={onRescan}>
          Scan again
        </button>
      </div>
    )
  }

  const p = result.payload
  return (
    <article className="panel w-full max-w-md overflow-hidden p-0">
      <div className="border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--accent-2)_18%,transparent)] px-5 py-4">
        <p className="text-sm font-semibold text-teal">✓ Authentic Subliminax Engine Track</p>
        <p className="mt-1 text-xs text-muted">
          Confidence {(result.confidence * 100).toFixed(0)}% · {p.magic}
        </p>
      </div>
      <div className="space-y-3 px-5 py-4">
        <h3 className="font-display text-lg font-bold text-ink">Matrix Card</h3>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <Row label="Carrier" value={`${p.carrierHz} Hz`} />
          <Row label="Beat" value={`${p.beatHz} Hz`} />
          <Row label="Entrainment" value={p.entrainmentType} />
          <Row label="Spatial 3D" value={p.spatialMode} />
          <Row label="Somatic" value={`${Math.round(p.somaticLevel * 100)}%`} />
          <Row label="Breath" value={p.breathPattern} />
          <Row label="Masking" value={p.maskingMode} />
          <Row label="Affirmation layer" value="🔒 Private / Masked" />
        </dl>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" className="btn btn-primary" onClick={onApply}>
            ⚡ Apply Configuration to My Studio
          </button>
          <button type="button" className="btn btn-ghost" onClick={onRescan}>
            Scan again
          </button>
        </div>
      </div>
    </article>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] px-2.5 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium capitalize text-ink">{value}</dd>
    </div>
  )
}
