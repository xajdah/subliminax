import { useEffect, useMemo, useRef, useState } from 'react'
import { mixEngine } from '../../audio/MixEngine'
import { psychoEngine } from '../../audio/PsychoacousticEngine'
import { NARRATOR_PRESETS } from '../../data/narrators'
import {
  condenseScriptToLimit,
  countWords,
  NARRATOR_WORD_LIMIT,
} from '../../services/scriptGenerator'
import {
  synthesizeAffirmationBuffer,
  decodeRecordingToBuffer,
} from '../../services/voiceBufferService'
import { CLONE_PROFILES, voiceCloneService } from '../../services/voiceCloneService'
import {
  estimateTtsSeconds,
  formatClock,
  isTtsOverLimit,
  RECORD_MAX_MS,
  RECORD_MAX_SECONDS,
  TTS_MAX_MS,
  TTS_MAX_SECONDS,
  trimScriptToTtsLimit,
  truncateAudioBuffer,
} from '../../services/voiceLimits'
import type { VoiceConfig, VoiceMode } from '../../types/studio'

interface Props {
  voice: VoiceConfig
  onChange: (v: VoiceConfig) => void
}

const MODES: { id: VoiceMode; label: string; blurb: string }[] = [
  {
    id: 'record',
    label: 'Record Own Voice',
    blurb: 'Teleprompter + mic · max 30 minutes',
  },
  {
    id: 'clone',
    label: 'Voice Cloning TTS',
    blurb: 'Cloned profile · max 2 minutes of audio',
  },
  {
    id: 'narrator',
    label: 'Narrator TTS',
    blurb: '100-word + 2-minute audio cap',
  },
  {
    id: 'none',
    label: 'No Narration',
    blurb: 'Pure audio · frequency & beds only',
  },
]

export function VoiceDeliveryPanel({ voice, onChange }: Props) {
  const patch = (p: Partial<VoiceConfig>) => onChange({ ...voice, ...p })
  const words = useMemo(() => countWords(voice.script), [voice.script])
  const ttsSeconds = useMemo(
    () => estimateTtsSeconds(voice.script, voice.rate),
    [voice.script, voice.rate],
  )
  const ttsOver = useMemo(
    () =>
      (voice.mode === 'narrator' || voice.mode === 'clone') &&
      isTtsOverLimit(voice.script, voice.rate),
    [voice.mode, voice.script, voice.rate],
  )
  const narratorOver = voice.mode === 'narrator' && words > NARRATOR_WORD_LIMIT
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [recError, setRecError] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [recElapsed, setRecElapsed] = useState(0)
  const [level, setLevel] = useState(0)
  const recCapTimer = useRef<number | null>(null)
  const recTickTimer = useRef<number | null>(null)
  const recStartedAt = useRef<number>(0)

  useEffect(() => {
    return () => {
      if (recCapTimer.current != null) window.clearTimeout(recCapTimer.current)
      if (recTickTimer.current != null) window.clearInterval(recTickTimer.current)
    }
  }, [])

  const clearRecTimers = () => {
    if (recCapTimer.current != null) {
      window.clearTimeout(recCapTimer.current)
      recCapTimer.current = null
    }
    if (recTickTimer.current != null) {
      window.clearInterval(recTickTimer.current)
      recTickTimer.current = null
    }
  }

  const injectToVoiceBus = async (script: string) => {
    const useCtx = mixEngine.ensureContext()
    if (useCtx.state === 'suspended') await useCtx.resume()
    const trimmed = trimScriptToTtsLimit(script, voice.rate, TTS_MAX_SECONDS)
    const buffer = synthesizeAffirmationBuffer(useCtx, trimmed, {
      maxSeconds: TTS_MAX_SECONDS,
    })
    if (!psychoEngine.isPlaying()) {
      await psychoEngine.start({ withDemoSources: false, context: useCtx })
    }
    // Calibrated Voice bus default is −32 dBFS; mask delta −18 dB
    psychoEngine.setBusDb('voice', -32)
    psychoEngine.patch({ breath: { envelopeMaskDb: -18 } })
    await psychoEngine.injectVoiceBuffer(buffer, { loop: true })
    return { buffer, trimmed }
  }

  const generateNarratorAudio = async () => {
    if (narratorOver || ttsOver || !voice.script.trim() || busy) return
    setBusy(true)
    setStatus('Generating Narrator audio (≤ 2:00)…')
    try {
      const { trimmed } = await injectToVoiceBus(voice.script)
      voiceCloneService.speakNarrator({
        text: trimmed,
        rate: voice.rate,
        pitch: voice.pitch,
        volume: voice.volume,
        profileId: 'local-soft',
        maxMs: TTS_MAX_MS,
      })
      setStatus('Narrator on Voice bus (−32 dBFS), capped at 2 minutes.')
    } catch {
      setStatus('Could not generate Narrator audio.')
    } finally {
      setBusy(false)
    }
  }

  const generateCloneAudio = async () => {
    if (ttsOver || !voice.script.trim() || busy) return
    setBusy(true)
    setStatus('Generating clone TTS (≤ 2:00)…')
    try {
      const { trimmed } = await injectToVoiceBus(voice.script)
      voiceCloneService.speak({
        text: trimmed,
        rate: voice.rate,
        pitch: voice.pitch,
        volume: voice.volume,
        profileId: voice.cloneProfileId,
        maxMs: TTS_MAX_MS,
      })
      setStatus('Clone voice on Voice bus (−32 dBFS), capped at 2 minutes.')
    } catch {
      setStatus('Could not generate clone audio.')
    } finally {
      setBusy(false)
    }
  }

  const stopRecord = () => {
    clearRecTimers()
    const mr = (window as unknown as { __sxRec?: MediaRecorder }).__sxRec
    if (mr && mr.state === 'recording') mr.stop()
  }

  const startRecord = async () => {
    setRecError(null)
    setRecElapsed(0)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      mr.onstop = () => {
        clearRecTimers()
        stream.getTracks().forEach((t) => t.stop())
        setRecording(false)
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' })
        void (async () => {
          try {
            const ctx = mixEngine.ensureContext()
            if (ctx.state === 'suspended') await ctx.resume()
            if (!psychoEngine.isPlaying()) {
              await psychoEngine.start({ withDemoSources: false, context: ctx })
            }
            const raw = await decodeRecordingToBuffer(ctx, blob)
            const buffer = truncateAudioBuffer(ctx, raw, RECORD_MAX_SECONDS)
            psychoEngine.setBusDb('voice', -32)
            psychoEngine.patch({ breath: { envelopeMaskDb: -18 } })
            await psychoEngine.injectVoiceBuffer(buffer, { loop: true })
            patch({ hasRecording: true })
            const secs = Math.min(RECORD_MAX_SECONDS, Math.round(buffer.duration))
            setStatus(
              `Recording on Voice bus (−32 dBFS) · ${formatClock(secs)} (max 30:00).`,
            )
          } catch {
            setRecError('Could not decode recording into the Voice bus.')
          }
        })()
      }

      const ctx = new AudioContext()
      const src = ctx.createMediaStreamSource(stream)
      const an = ctx.createAnalyser()
      src.connect(an)
      const data = new Uint8Array(an.fftSize)
      const tick = () => {
        an.getByteTimeDomainData(data)
        let s = 0
        for (let i = 0; i < data.length; i++) {
          const v = (data[i]! - 128) / 128
          s += v * v
        }
        setLevel(Math.min(1, Math.sqrt(s / data.length) * 4))
        if (mr.state === 'recording') requestAnimationFrame(tick)
        else void ctx.close()
      }

      mr.start(1000)
      setRecording(true)
      recStartedAt.current = Date.now()
      ;(window as unknown as { __sxRec?: MediaRecorder }).__sxRec = mr
      requestAnimationFrame(tick)

      recTickTimer.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - recStartedAt.current) / 1000)
        setRecElapsed(Math.min(RECORD_MAX_SECONDS, elapsed))
      }, 250)

      // Hard stop at 30 minutes
      recCapTimer.current = window.setTimeout(() => {
        setStatus('Recording stopped at the 30-minute maximum.')
        stopRecord()
      }, RECORD_MAX_MS)
    } catch {
      setRecError('Microphone permission denied or unavailable.')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <span className="field-label">Voice delivery</span>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`rounded-xl border px-3 py-2.5 text-left transition ${
                voice.mode === m.id
                  ? 'border-[color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]'
                  : 'border-border bg-bg/35'
              }`}
              onClick={() => patch({ mode: m.id })}
            >
              <span className="block font-display text-sm font-semibold text-ink">{m.label}</span>
              <span className="mt-0.5 block text-[11px] text-muted">{m.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      {voice.mode !== 'none' && (
        <label className="block">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <span className="field-label mb-0">Affirmation script</span>
            <div className="flex flex-wrap items-center gap-2">
              {voice.mode === 'narrator' && (
                <span
                  className={`text-xs font-semibold tabular-nums ${
                    narratorOver ? 'text-[#fcd34d]' : 'text-[#6ee7b7]'
                  }`}
                >
                  {words} / {NARRATOR_WORD_LIMIT} words
                </span>
              )}
              {(voice.mode === 'narrator' || voice.mode === 'clone') && (
                <span
                  className={`text-xs font-semibold tabular-nums ${
                    ttsOver ? 'text-[#fcd34d]' : 'text-muted'
                  }`}
                >
                  ~{formatClock(ttsSeconds)} / {formatClock(TTS_MAX_SECONDS)} audio
                </span>
              )}
              {voice.mode === 'record' && (
                <span className="text-xs tabular-nums text-muted">{words} words</span>
              )}
            </div>
          </div>
          <textarea
            className="field-textarea min-h-[7rem]"
            value={voice.script}
            onChange={(e) => patch({ script: e.target.value })}
            placeholder="Write or generate your subliminal script…"
          />
        </label>
      )}

      {voice.mode === 'narrator' && narratorOver && (
        <div className="rounded-xl border border-[color-mix(in_oklab,#fbbf24_40%,transparent)] bg-[color-mix(in_oklab,#fbbf24_10%,transparent)] px-3 py-3 text-sm text-ink">
          <p>
            Narrator voice is limited to 100 words. Switch to Short/Medium script, trim text, or use
            Voice Cloning / Self-Recording for long scripts.
          </p>
          <button
            type="button"
            className="btn btn-teal mt-2 text-xs"
            onClick={() => patch({ script: condenseScriptToLimit(voice.script) })}
          >
            Auto-Condense to 100 Words
          </button>
        </div>
      )}

      {ttsOver && (voice.mode === 'narrator' || voice.mode === 'clone') && (
        <div className="rounded-xl border border-[color-mix(in_oklab,#fbbf24_40%,transparent)] bg-[color-mix(in_oklab,#fbbf24_10%,transparent)] px-3 py-3 text-sm text-ink">
          <p>
            {voice.mode === 'narrator' ? 'Narrator' : 'Voice Cloning'} TTS is limited to 2 minutes of
            audio (~{formatClock(ttsSeconds)} estimated). Trim the script or use Self-Recording
            (up to 30 minutes).
          </p>
          <button
            type="button"
            className="btn btn-teal mt-2 text-xs"
            onClick={() =>
              patch({ script: trimScriptToTtsLimit(voice.script, voice.rate, TTS_MAX_SECONDS) })
            }
          >
            Trim to 2 Minutes
          </button>
        </div>
      )}

      {voice.mode === 'record' && (
        <div className="space-y-3 rounded-xl border border-border bg-bg/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-display text-sm font-semibold text-ink">Teleprompter</h4>
            <span
              className={`text-xs font-semibold tabular-nums ${
                recording && recElapsed >= RECORD_MAX_SECONDS - 30
                  ? 'text-[#fcd34d]'
                  : 'text-muted'
              }`}
            >
              {formatClock(recElapsed)} / {formatClock(RECORD_MAX_SECONDS)}
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-[var(--panel)] px-4 py-3">
            <p className="whitespace-pre-wrap font-display text-base leading-relaxed text-ink">
              {voice.script.trim() || 'Add or generate a script to read while recording.'}
            </p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg">
            <div
              className="h-full rounded-full"
              style={{
                width: `${level * 100}%`,
                background: 'linear-gradient(90deg, var(--accent-2), var(--accent))',
              }}
            />
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-bg">
            <div
              className="h-full rounded-full bg-[color-mix(in_oklab,var(--accent)_70%,transparent)]"
              style={{ width: `${(recElapsed / RECORD_MAX_SECONDS) * 100}%` }}
            />
          </div>
          {recording ? (
            <button type="button" className="btn btn-primary" onClick={stopRecord}>
              Stop recording
            </button>
          ) : (
            <button type="button" className="btn btn-teal" onClick={() => void startRecord()}>
              Record to Voice bus
            </button>
          )}
          <p className="text-[11px] text-muted">
            Recording automatically stops at 30:00. Longer takes are truncated.
          </p>
          {voice.hasRecording && (
            <p className="text-xs text-[#6ee7b7]">Recording captured and routed to Voice bus.</p>
          )}
          {recError && <p className="text-sm text-danger">{recError}</p>}
        </div>
      )}

      {voice.mode === 'clone' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {CLONE_PROFILES.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chip"
                data-active={voice.cloneProfileId === p.id}
                onClick={() => patch({ cloneProfileId: p.id })}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!voice.script.trim() || busy || ttsOver}
            onClick={() => void generateCloneAudio()}
          >
            {busy ? 'Generating…' : 'Generate Clone Audio'}
          </button>
        </div>
      )}

      {voice.mode === 'narrator' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {NARRATOR_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chip"
                data-active={voice.narratorId === p.id}
                onClick={() => patch({ narratorId: p.id, rate: p.rate, pitch: p.pitch })}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={narratorOver || ttsOver || !voice.script.trim() || busy}
            onClick={() => void generateNarratorAudio()}
          >
            {busy ? 'Generating…' : 'Generate Narrator Audio'}
          </button>
        </div>
      )}

      {voice.mode !== 'none' && voice.mode !== 'record' && (
        <div className="grid gap-3 sm:grid-cols-3">
          <label>
            <span className="field-label">Rate</span>
            <input
              className="field-range"
              type="range"
              min={0.5}
              max={1.5}
              step={0.01}
              value={voice.rate}
              onChange={(e) => patch({ rate: Number(e.target.value) })}
            />
          </label>
          <label>
            <span className="field-label">Pitch</span>
            <input
              className="field-range"
              type="range"
              min={0.5}
              max={1.5}
              step={0.01}
              value={voice.pitch}
              onChange={(e) => patch({ pitch: Number(e.target.value) })}
            />
          </label>
          <label>
            <span className="field-label">Loop pause (ms)</span>
            <input
              className="field-input"
              type="number"
              value={voice.loopPauseMs}
              onChange={(e) => patch({ loopPauseMs: Number(e.target.value) })}
            />
          </label>
        </div>
      )}

      {status && <p className="text-xs text-muted">{status}</p>}
    </div>
  )
}
