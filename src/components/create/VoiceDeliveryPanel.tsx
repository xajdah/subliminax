import { useMemo, useState } from 'react'
import { mixEngine } from '../../audio/MixEngine'
import { psychoEngine } from '../../audio/PsychoacousticEngine'
import { NARRATOR_PRESETS } from '../../data/narrators'
import {
  condenseScriptToLimit,
  countWords,
  NARRATOR_WORD_LIMIT,
} from '../../services/scriptGenerator'
import { synthesizeAffirmationBuffer, decodeRecordingToBuffer } from '../../services/voiceBufferService'
import { CLONE_PROFILES, voiceCloneService } from '../../services/voiceCloneService'
import type { VoiceConfig, VoiceMode } from '../../types/studio'

interface Props {
  voice: VoiceConfig
  onChange: (v: VoiceConfig) => void
}

const MODES: { id: VoiceMode; label: string; blurb: string }[] = [
  {
    id: 'record',
    label: 'Record Own Voice',
    blurb: 'Teleprompter + mic — any script length',
  },
  {
    id: 'clone',
    label: 'Voice Cloning TTS',
    blurb: 'Cloned profile · no 100-word cap',
  },
  {
    id: 'narrator',
    label: 'Narrator TTS',
    blurb: 'Strict 100-word Narrator guardrail',
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
  const narratorOver = voice.mode === 'narrator' && words > NARRATOR_WORD_LIMIT
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [recError, setRecError] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [level, setLevel] = useState(0)

  const injectToVoiceBus = async (script: string) => {
    const useCtx = mixEngine.ensureContext()
    if (useCtx.state === 'suspended') await useCtx.resume()
    const buffer = synthesizeAffirmationBuffer(useCtx, script)
    if (!psychoEngine.isPlaying()) {
      await psychoEngine.start({ withDemoSources: false, context: useCtx })
    }
    // Calibrated Voice bus default is −32 dBFS; mask delta −18 dB
    psychoEngine.setBusDb('voice', -32)
    psychoEngine.patch({ breath: { envelopeMaskDb: -18 } })
    await psychoEngine.injectVoiceBuffer(buffer, { loop: true })
    return buffer
  }

  const generateNarratorAudio = async () => {
    if (narratorOver || !voice.script.trim() || busy) return
    setBusy(true)
    setStatus('Generating Narrator audio…')
    try {
      await injectToVoiceBus(voice.script)
      voiceCloneService.speakNarrator({
        text: voice.script,
        rate: voice.rate,
        pitch: voice.pitch,
        volume: voice.volume,
        profileId: 'local-soft',
      })
      setStatus('Narrator routed to Voice bus (−32 dBFS). Previewing…')
    } catch {
      setStatus('Could not generate Narrator audio.')
    } finally {
      setBusy(false)
    }
  }

  const generateCloneAudio = async () => {
    if (!voice.script.trim() || busy) return
    setBusy(true)
    setStatus('Generating clone TTS…')
    try {
      await injectToVoiceBus(voice.script)
      voiceCloneService.speak({
        text: voice.script,
        rate: voice.rate,
        pitch: voice.pitch,
        volume: voice.volume,
        profileId: voice.cloneProfileId,
      })
      setStatus('Clone voice routed to Voice bus (−32 dBFS). Previewing…')
    } catch {
      setStatus('Could not generate clone audio.')
    } finally {
      setBusy(false)
    }
  }

  const startRecord = async () => {
    setRecError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      mr.ondataavailable = (e) => chunks.push(e.data)
      mr.onstop = () => {
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
            const buffer = await decodeRecordingToBuffer(ctx, blob)
            psychoEngine.setBusDb('voice', -32)
            psychoEngine.patch({ breath: { envelopeMaskDb: -18 } })
            await psychoEngine.injectVoiceBuffer(buffer, { loop: true })
            patch({ hasRecording: true })
            setStatus('Recording on Voice bus (−32 dBFS).')
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
      mr.start()
      setRecording(true)
      ;(window as unknown as { __sxRec?: MediaRecorder }).__sxRec = mr
      requestAnimationFrame(tick)
    } catch {
      setRecError('Microphone permission denied or unavailable.')
    }
  }

  const stopRecord = () => {
    const mr = (window as unknown as { __sxRec?: MediaRecorder }).__sxRec
    if (mr && mr.state === 'recording') mr.stop()
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
            {voice.mode === 'narrator' ? (
              <span
                className={`text-xs font-semibold tabular-nums ${
                  narratorOver ? 'text-[#fcd34d]' : 'text-[#6ee7b7]'
                }`}
              >
                {words} / {NARRATOR_WORD_LIMIT} words
              </span>
            ) : (
              <span className="text-xs tabular-nums text-muted">{words} words</span>
            )}
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

      {voice.mode === 'record' && (
        <div className="space-y-3 rounded-xl border border-border bg-bg/40 p-4">
          <h4 className="font-display text-sm font-semibold text-ink">Teleprompter</h4>
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
          {recording ? (
            <button type="button" className="btn btn-primary" onClick={stopRecord}>
              Stop recording
            </button>
          ) : (
            <button type="button" className="btn btn-teal" onClick={() => void startRecord()}>
              Record to Voice bus
            </button>
          )}
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
            disabled={!voice.script.trim() || busy}
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
            disabled={narratorOver || !voice.script.trim() || busy}
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
