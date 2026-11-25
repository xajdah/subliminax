import { useEffect, useRef, useState } from 'react'
import {
  applyStudyPsychoConfig,
  disposeStudyPresenceEq,
  frequencyLevelToDb,
  getOptimalStudyConfig,
} from '../../audio/studyPsychoacoustics'
import { psychoEngine } from '../../audio/PsychoacousticEngine'
import { usePsychoEngine } from '../../hooks/usePsychoEngine'
import {
  decodeRecordingToBuffer,
  synthesizeAffirmationBuffer,
} from '../../services/voiceBufferService'
import { voiceCloneService } from '../../services/voiceCloneService'
import { savedMixStorage } from '../../services/savedMixStorage'
import { createDefaultSession } from '../../types/studio'
import type { StudySession, StudyVoiceMode } from '../../types/study'
import { STUDY_STYLE_CARDS } from '../../types/study'

interface Props {
  session: StudySession
  onChange: (patch: Partial<StudySession>) => void
  onBack: () => void
}

const HIGHLIGHT_COLORS: Record<string, string> = {
  fact: 'border-l-[var(--accent)]',
  definition: 'border-l-teal',
  formula: 'border-l-[#f59e0b]',
}

export function SubliminalStudyPlayer({ session, onChange, onBack }: Props) {
  const eng = usePsychoEngine()
  const gen = session.generated
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [quizOpen, setQuizOpen] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const calib = getOptimalStudyConfig(session.age, session.outputDevice, {
    preferGamma: session.preferGamma,
  })
  const styleLabel =
    STUDY_STYLE_CARDS.find((c) => c.id === session.style)?.title ?? session.style

  useEffect(() => {
    return () => {
      voiceCloneService.cancel()
      disposeStudyPresenceEq()
      try {
        recorderRef.current?.stop()
      } catch {
        /* noop */
      }
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const applyLive = async () => {
    setBusy(true)
    setNote(null)
    try {
      await applyStudyPsychoConfig({
        age: session.age,
        outputDevice: session.outputDevice,
        preferGamma: session.preferGamma,
        frequencyLevel: session.frequencyLevel,
        listenMode: session.listenMode,
      })
      setNote(`${calib.label} · ${session.outputDevice}`)
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Could not start study audio.')
    } finally {
      setBusy(false)
    }
  }

  const speakScript = async (mode: StudyVoiceMode) => {
    if (!gen?.studyScript.trim()) return
    onChange({ voiceMode: mode })
    await applyLive()
    const ctx = psychoEngine.getAudioContext()
    if (ctx) {
      const bed = synthesizeAffirmationBuffer(ctx, gen.studyScript)
      await psychoEngine.injectVoiceBuffer(bed, { loop: true })
    }

    // Podcast: alternate pitch for Host vs Mentor lines via sequential utterances
    if (session.style === 'podcast' && mode === 'narrator') {
      const lines = gen.studyScript.split('\n').filter((l) => l.trim())
      const speakLine = (i: number) => {
        if (i >= lines.length) return
        const line = lines[i]!
        const isMentor = /\[Mentor\]/i.test(line)
        const text = line.replace(/^\[(Host|Mentor)\]\s*/i, '')
        if (!text.trim() || text.startsWith('Language:')) {
          speakLine(i + 1)
          return
        }
        voiceCloneService.speak({
          text,
          rate: isMentor ? 0.95 : 1.02,
          pitch: isMentor ? 0.85 : 1.12,
          volume: session.listenMode === 'subliminal' ? 0.35 : 0.9,
          profileId: isMentor ? 'local-soft' : 'local-clear',
          onEnd: () => speakLine(i + 1),
        })
      }
      speakLine(0)
      return
    }

    voiceCloneService.speak({
      text: gen.studyScript.replace(/\[3s PAUSE\]/gi, '… … …'),
      rate: mode === 'clone' ? 0.92 : 1,
      pitch: mode === 'clone' ? 1 : 1.05,
      volume: session.listenMode === 'subliminal' ? 0.3 : 0.92,
      profileId: mode === 'clone' ? 'local-soft' : 'local-clear',
    })
  }

  const startRecord = async () => {
    if (recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      recorderRef.current = mr
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        void (async () => {
          const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
          stream.getTracks().forEach((t) => t.stop())
          await applyLive()
          const ctx = psychoEngine.getAudioContext()
          if (!ctx) return
          const buf = await decodeRecordingToBuffer(ctx, blob)
          await psychoEngine.injectVoiceBuffer(buf, { loop: true })
          setNote('Recording looped on the voice bus (production effect).')
        })()
      }
      mr.start()
      setRecording(true)
      onChange({ voiceMode: 'record' })
      setNote('Teleprompter recording… read the script aloud, then Stop.')
    } catch {
      setNote('Microphone permission denied.')
    }
  }

  const stopRecord = () => {
    try {
      recorderRef.current?.stop()
    } catch {
      /* noop */
    }
    setRecording(false)
  }

  const stopAll = () => {
    voiceCloneService.cancel()
    psychoEngine.clearVoiceBuffer()
    psychoEngine.stop()
    disposeStudyPresenceEq()
    setNote('Stopped.')
  }

  const saveToLibrary = () => {
    if (!gen) return
    const base = createDefaultSession()
    const studyCfg = getOptimalStudyConfig(session.age, session.outputDevice, {
      preferGamma: session.preferGamma,
    })
    base.step = 'mix'
    base.completed = true
    base.custom = {
      name: session.subject || 'Subliminal Study',
      affirmations: [gen.studyScript.slice(0, 400)],
      targetHz: studyCfg.beatHz,
    }
    base.category = 'mental'
    base.frequency = {
      ...base.frequency,
      hz: studyCfg.carrierHz,
      beatHz: studyCfg.beatHz,
      entrainment:
        session.outputDevice === 'headphones' ? 'binaural' : 'isochronic',
      volume: Math.pow(10, frequencyLevelToDb(session.frequencyLevel) / 20),
    }
    base.voice = {
      ...base.voice,
      mode: session.voiceMode === 'record' ? 'record' : session.voiceMode === 'clone' ? 'clone' : 'narrator',
      script: gen.studyScript,
      volume: session.listenMode === 'subliminal' ? 0.02 : 0.12,
    }
    base.advancedPsycho = studyCfg.state
    base.advancedPsycho.buses.frequency = frequencyLevelToDb(session.frequencyLevel)
    const title = `Study · ${session.subject || styleLabel}`
    savedMixStorage.save({ title, session: { ...base, completed: true } })
    setNote(`Saved “${title}” to Saved Tracks.`)
  }

  if (!gen) {
    return (
      <p className="panel p-5 text-sm text-muted">Generate a lesson first.</p>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Edit lesson
        </button>
        <p className="text-sm text-muted">
          {calib.label} · {styleLabel}
        </p>
      </div>

      {/* Highlights */}
      <section className="panel space-y-3 p-5">
        <h2 className="panel-title text-lg">Key concepts</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {gen.keyHighlights.map((h) => (
            <div
              key={h.id}
              className={`rounded-lg border border-[var(--border)] border-l-4 bg-[var(--panel)] px-3 py-2 text-sm ${HIGHLIGHT_COLORS[h.kind]}`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                {h.kind}
              </span>
              <p className="mt-0.5 text-ink">{h.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Script teleprompter */}
      <section className="panel space-y-3 p-5">
        <h2 className="panel-title text-lg">Interactive script</h2>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-[color-mix(in_oklab,#000_25%,transparent)] p-4 font-mono text-xs leading-relaxed text-ink sm:text-sm">
          {gen.studyScript}
        </pre>
      </section>

      {/* Voice options */}
      <section className="panel space-y-3 p-5">
        <h2 className="panel-title text-lg">Voice</h2>
        <div className="flex flex-wrap gap-2">
          {!recording ? (
            <button type="button" className="btn btn-teal" onClick={() => void startRecord()}>
              Record yourself (teleprompter)
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={stopRecord}>
              Stop recording
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => void speakScript('clone')}
          >
            Cloned voice TTS
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => void speakScript('narrator')}
          >
            {session.style === 'podcast' ? 'Dual-voice podcast TTS' : 'AI narrator TTS'}
          </button>
        </div>
      </section>

      {/* Live controls */}
      <section className="panel space-y-4 p-5">
        <h2 className="panel-title text-lg">Study player</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`btn ${session.outputDevice === 'headphones' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              onChange({ outputDevice: 'headphones' })
              void applyStudyPsychoConfig({
                age: session.age,
                outputDevice: 'headphones',
                preferGamma: session.preferGamma,
                frequencyLevel: session.frequencyLevel,
                listenMode: session.listenMode,
              })
            }}
          >
            🎧 Headphones
          </button>
          <button
            type="button"
            className={`btn ${session.outputDevice === 'speakers' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              onChange({ outputDevice: 'speakers' })
              void applyStudyPsychoConfig({
                age: session.age,
                outputDevice: 'speakers',
                preferGamma: session.preferGamma,
                frequencyLevel: session.frequencyLevel,
                listenMode: session.listenMode,
              })
            }}
          >
            🔊 Speakers
          </button>
          <button
            type="button"
            className={`btn ${session.listenMode === 'conscious' ? 'btn-teal' : 'btn-ghost'}`}
            onClick={() => {
              onChange({ listenMode: 'conscious' })
              void applyStudyPsychoConfig({
                age: session.age,
                outputDevice: session.outputDevice,
                preferGamma: session.preferGamma,
                frequencyLevel: session.frequencyLevel,
                listenMode: 'conscious',
              })
            }}
          >
            Voice clarity (conscious)
          </button>
          <button
            type="button"
            className={`btn ${session.listenMode === 'subliminal' ? 'btn-teal' : 'btn-ghost'}`}
            onClick={() => {
              onChange({ listenMode: 'subliminal' })
              void applyStudyPsychoConfig({
                age: session.age,
                outputDevice: session.outputDevice,
                preferGamma: session.preferGamma,
                frequencyLevel: session.frequencyLevel,
                listenMode: 'subliminal',
              })
            }}
          >
            Subliminal background
          </button>
        </div>

        <label className="block">
          <span className="field-label">
            Frequency volume · {frequencyLevelToDb(session.frequencyLevel).toFixed(1)} dBFS
          </span>
          <input
            className="field-range mt-1 w-full"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={session.frequencyLevel}
            onChange={(e) => {
              const frequencyLevel = Number(e.target.value)
              onChange({ frequencyLevel })
              if (eng.playing) {
                psychoEngine.setBusDb('frequency', frequencyLevelToDb(frequencyLevel))
              }
            }}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void applyLive()}
          >
            {eng.playing ? 'Re-apply calibration' : 'Start study engine'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={stopAll}>
            Stop
          </button>
          <button type="button" className="btn btn-teal" onClick={saveToLibrary}>
            Save to Saved Tracks
          </button>
        </div>
        <p className="text-xs text-muted">{calib.blurb}</p>
      </section>

      {/* Flash quiz */}
      <section className="panel space-y-3 p-5">
        <h2 className="panel-title text-lg">Flash quiz</h2>
        <ul className="space-y-2">
          {gen.flashQuiz.map((q) => (
            <li key={q.id} className="rounded-lg border border-[var(--border)] p-3">
              <p className="text-sm text-ink">{q.question}</p>
              <button
                type="button"
                className="btn btn-ghost mt-2 text-xs"
                onClick={() => setQuizOpen(quizOpen === q.id ? null : q.id)}
              >
                {quizOpen === q.id ? 'Hide answer' : 'Reveal answer'}
              </button>
              {quizOpen === q.id && (
                <p className="mt-2 text-sm text-muted">{q.answer}</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {note && (
        <p className="panel px-4 py-3 text-sm" role="status">
          {note}
        </p>
      )}
    </div>
  )
}
