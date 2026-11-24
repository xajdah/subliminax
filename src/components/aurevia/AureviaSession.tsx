import { useEffect, useMemo, useRef, useState } from 'react'
import { mixEngine } from '../../audio/MixEngine'
import {
  AUREVIA_PATHS,
  aureviaDuration,
  buildAureviaSession,
  type AureviaPathId,
} from '../../data/aureviaPhases'
import {
  aureviaGiftUrl,
  crossingThisHour,
  type AureviaLaunch,
} from '../../data/aureviaShare'
import { useTheme } from '../../hooks/useTheme'
import { answerDream, morningDream, saveDreamLetter, type DreamLetter } from '../../services/dreamLetters'
import { letterOracle } from '../../services/letterOracle'
import { generateHigherSelfReply } from '../../services/scriptGenerator'
import { addSigilStroke, sigilStrokes } from '../../services/sigilStore'
import { listAureviaLetters, saveAureviaLetter, type AureviaLetter } from '../../services/aureviaStorage'
import { ThemeToggle } from '../ThemeToggle'
import { SigilMark } from './SigilMark'
import { downloadBlob, renderVoyageCard, shareOrSaveCard } from './voyageCard'

interface Props {
  launch: AureviaLaunch | null
  onHome: () => void
}

type Stage = 'ready' | 'voyage' | 'letter'
type VoiceChoice = 'guide' | 'mine'

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

export function AureviaSession({ launch, onHome }: Props) {
  const { theme, toggleTheme } = useTheme()
  const [path, setPath] = useState<AureviaPathId>(launch?.path ?? 'full')
  const [question, setQuestion] = useState(launch?.question ?? '')
  const [stage, setStage] = useState<Stage>('ready')
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [letter, setLetter] = useState('')
  const [letters, setLetters] = useState<AureviaLetter[]>(() => listAureviaLetters())
  const [savedNote, setSavedNote] = useState<string | null>(null)
  const [voiceChoice, setVoiceChoice] = useState<VoiceChoice>('guide')
  const [recording, setRecording] = useState(false)
  const [ownVoiceUrl, setOwnVoiceUrl] = useState<string | null>(null)
  const [micError, setMicError] = useState<string | null>(null)
  const [cardNote, setCardNote] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [strokes, setStrokes] = useState(() => sigilStrokes())
  const [oracle, setOracle] = useState(() => letterOracle())
  const [pendingDream, setPendingDream] = useState<DreamLetter | null>(() => morningDream())
  const [dreamSeen, setDreamSeen] = useState('')
  const quietRef = useRef(!!launch?.quietVoice)
  const startedRef = useRef(0)
  const scriptRef = useRef('')
  const appliedRef = useRef<string | null>(null)
  const ownVoiceRef = useRef(false)
  const recRef = useRef<MediaRecorder | null>(null)
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null)
  const ownUrlRef = useRef<string | null>(null)
  ownUrlRef.current = ownVoiceUrl
  const phases = AUREVIA_PATHS[path]
  const total = useMemo(() => aureviaDuration(path), [path])
  const phase = phases[Math.min(phaseIndex, phases.length - 1)]
  const running = stage === 'voyage'
  const reply = useMemo(() => generateHigherSelfReply(question), [question])
  const company = crossingThisHour(now, running)
  ownVoiceRef.current = voiceChoice === 'mine' && !!ownVoiceUrl

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    return () => {
      mixEngine.stop()
      const mr = recRef.current
      if (mr && mr.state === 'recording') mr.stop()
      if (ownUrlRef.current) URL.revokeObjectURL(ownUrlRef.current)
    }
  }, [])

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      const next = (Date.now() - startedRef.current) / 1000
      if (next >= total) {
        mixEngine.stop()
        voiceAudioRef.current?.pause()
        setElapsed(total)
        setStage('letter')
        return
      }
      let acc = 0
      let idx = 0
      for (let i = 0; i < phases.length; i++) {
        acc += phases[i].seconds
        if (next < acc) {
          idx = i
          break
        }
      }
      setPhaseIndex(idx)
      setElapsed(next)
    }, 250)
    return () => window.clearInterval(id)
  }, [running, phases, total])

  useEffect(() => {
    if (!running) return
    const current = phases[phaseIndex]
    if (!current || appliedRef.current === current.id) return
    appliedRef.current = current.id
    mixEngine.sync(
      buildAureviaSession(current, scriptRef.current, {
        ownVoice: ownVoiceRef.current,
        quiet: quietRef.current,
      }),
    )
    mixEngine.restartVoice()
  }, [running, phaseIndex, phases])

  useEffect(() => {
    const audio = voiceAudioRef.current
    if (!audio || !ownVoiceUrl) return
    const inPresence = running && phase.id === 'presence' && voiceChoice === 'mine'
    if (!inPresence) {
      audio.pause()
      return
    }
    if (audio.src !== ownVoiceUrl) audio.src = ownVoiceUrl
    audio.loop = true
    audio.volume = 0.9
    void audio.play().catch(() => {
      /* Autoplay can wait until the voyage was opened from a click. */
    })
  }, [running, phase.id, ownVoiceUrl, voiceChoice])

  const clearRecording = () => {
    setOwnVoiceUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  const startRecording = async () => {
    setMicError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      const chunks: Blob[] = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      mr.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setOwnVoiceUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
        setRecording(false)
      }
      recRef.current = mr
      mr.start()
      setRecording(true)
    } catch {
      setMicError('The microphone stayed closed. You can still travel with the guide voice.')
      setVoiceChoice('guide')
    }
  }

  const stopRecording = () => {
    if (recRef.current && recRef.current.state === 'recording') recRef.current.stop()
  }

  const begin = async () => {
    const script = generateHigherSelfReply(question)
    scriptRef.current = script
    const useOwn = voiceChoice === 'mine' && !!ownVoiceUrl
    const first = phases[0]
    appliedRef.current = first.id
    setLetter('')
    setSavedNote(null)
    setCardNote(null)
    setPhaseIndex(0)
    setElapsed(0)
    startedRef.current = Date.now()
    if (useOwn && ownVoiceUrl && voiceAudioRef.current) {
      voiceAudioRef.current.src = ownVoiceUrl
      voiceAudioRef.current.loop = true
      voiceAudioRef.current.volume = 0
      try {
        await voiceAudioRef.current.play()
        voiceAudioRef.current.pause()
        voiceAudioRef.current.currentTime = 0
        voiceAudioRef.current.volume = 0.9
      } catch {
        /* Presence will try again. */
      }
    }
    if (launch?.dream) {
      saveDreamLetter(question.trim() || 'Show me the room where I feel free.')
    }
    setStage('voyage')
    await mixEngine.play(
      buildAureviaSession(first, script, { ownVoice: useOwn, quiet: quietRef.current }),
    )
  }

  const closeVoyage = () => {
    mixEngine.stop()
    voiceAudioRef.current?.pause()
    setStage('letter')
  }

  const leave = () => {
    mixEngine.stop()
    voiceAudioRef.current?.pause()
    onHome()
  }

  const keepLetter = () => {
    const text = letter.trim()
    if (!text) return
    saveAureviaLetter({
      question: question.trim(),
      letter: text,
      spoken: scriptRef.current,
      path,
    })
    setLetters(listAureviaLetters())
    setStrokes(addSigilStroke())
    setOracle(letterOracle())
    setSavedNote('Kept on this device. The mark grew.')
  }

  const keepDream = () => {
    if (!pendingDream) return
    const saved = answerDream(pendingDream.id, dreamSeen)
    if (!saved) return
    setStrokes(addSigilStroke())
    setPendingDream(morningDream())
    setDreamSeen('')
    setSavedNote('The dream sits beside the mark.')
  }

  const cardInput = () => ({
    question: question.trim(),
    letter: letter.trim() || 'What you were shown',
    date: new Date(),
    strokes,
  })

  const saveCard = async () => {
    setCardNote(null)
    try {
      const blob = await renderVoyageCard(cardInput())
      downloadBlob(blob, 'aurevia.png')
      setCardNote('Card saved as an image.')
    } catch {
      setCardNote('The card could not be drawn.')
    }
  }

  const shareCard = async () => {
    setCardNote(null)
    try {
      const blob = await renderVoyageCard(cardInput())
      const result = await shareOrSaveCard(blob, `${letter.trim()}\nA voyage to my higher self`)
      setCardNote(result === 'shared' ? 'Shared.' : 'Card saved as an image.')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setCardNote('The card could not be shared.')
    }
  }

  const copyGift = async () => {
    const url = aureviaGiftUrl(question)
    try {
      await navigator.clipboard.writeText(url)
      setCardNote('Link copied. It opens a short crossing with this question.')
    } catch {
      setCardNote(url)
    }
  }

  const lift = [0.42, 0.62, 0.92, 0.55][phaseIndex] ?? 0.5
  const canBegin = voiceChoice === 'guide' || !!ownVoiceUrl

  return (
    <div className="relative mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-6">
      <audio ref={voiceAudioRef} preload="auto" />
      <header className="mb-8 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-ghost" onClick={leave}>
          ← Home
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-extrabold">Aurevia</h1>
          <p className="text-sm text-muted">A voyage to your higher self</p>
        </div>
        <div className="ml-auto">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <div className="mb-6 flex items-center gap-4">
        <SigilMark strokes={strokes} size={72} />
        <div>
          <p className="text-sm text-muted">{company} crossing in this hour</p>
          <p className="text-sm text-ink">
            {strokes === 0 ? 'Your mark begins with the first letter you keep.' : `${strokes} held in the mark.`}
          </p>
          {oracle && <p className="mt-1 text-sm text-muted">{oracle}</p>}
        </div>
      </div>

      {stage === 'ready' && (
        <div className="space-y-6">
          {launch?.fromGift && (
            <p className="panel px-5 py-4 text-sm text-ink">This voyage was asked for you.</p>
          )}
          {launch?.quietVoice && (
            <p className="panel px-5 py-4 text-sm text-ink">The full moon keeps the voice quiet.</p>
          )}
          {pendingDream && (
            <section className="panel p-6">
              <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-bronze-soft">
                Morning
              </p>
              <h2 className="panel-title mt-2 text-2xl text-ink">What did I see?</h2>
              <p className="mt-3 text-sm text-muted">{pendingDream.image}</p>
              <textarea
                className="field-textarea mt-4 min-h-24 w-full"
                value={dreamSeen}
                placeholder="I saw…"
                onChange={(e) => setDreamSeen(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary mt-4"
                disabled={!dreamSeen.trim()}
                onClick={keepDream}
              >
                Keep beside the mark
              </button>
            </section>
          )}
          <section className="panel p-6 sm:p-8">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-bronze-soft">
              Begin in quiet
            </p>
            <h2 className="panel-title mt-3 text-3xl text-ink">
              {launch?.dream ? 'Leave a letter for the night.' : 'Cross into a wider mind.'}
            </h2>
            <p className="mt-4 max-w-xl leading-relaxed text-muted">
              Four movements carry you from a still breath, through an open horizon, into a meeting
              with yourself, and gently home. Headphones let the two tones bloom around you.
            </p>
            <label className="mt-6 block">
              <span className="field-label">
                {launch?.dream
                  ? 'Leave one image for the night'
                  : 'What do you want to ask your higher self?'}
              </span>
              <textarea
                className="field-textarea mt-2 min-h-28 w-full"
                value={question}
                placeholder={
                  launch?.dream ? 'Show me the room where I feel free.' : 'Show me the next true step.'
                }
                onChange={(e) => {
                  setQuestion(e.target.value)
                  clearRecording()
                }}
              />
            </label>
            <p className="mt-2 text-sm text-muted">
              Leave this empty and the voyage will ask for the next true step.
            </p>

            <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Voice">
              <button
                type="button"
                className={`btn ${voiceChoice === 'guide' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setVoiceChoice('guide')}
              >
                Guide voice
              </button>
              <button
                type="button"
                className={`btn ${voiceChoice === 'mine' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setVoiceChoice('mine')}
              >
                My voice
              </button>
            </div>

            {voiceChoice === 'mine' && (
              <div className="mt-4 rounded-2xl border border-[var(--border)] p-4">
                <p className="text-sm text-muted">
                  Read this once, slowly. Presence will play your recording.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink">{reply}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {recording ? (
                    <button type="button" className="btn btn-primary" onClick={stopRecording}>
                      Stop recording
                    </button>
                  ) : (
                    <button type="button" className="btn btn-teal" onClick={() => void startRecording()}>
                      {ownVoiceUrl ? 'Record again' : 'Record my voice'}
                    </button>
                  )}
                </div>
                {ownVoiceUrl && !recording && (
                  <p className="mt-3 text-sm text-muted">Your voice is ready for Presence.</p>
                )}
                {micError && <p className="mt-3 text-sm text-muted">{micError}</p>}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Voyage length">
              {(
                [
                  ['short', 'A short crossing'],
                  ['full', 'A full voyage'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`btn ${path === id ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setPath(id)}
                >
                  {label}
                  <span className="opacity-80">· {formatClock(aureviaDuration(id))}</span>
                </button>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-teal px-6 py-3"
                onClick={() => void begin()}
                disabled={!canBegin || recording}
              >
                Begin Aurevia
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => void copyGift()}>
                Ask this for someone
              </button>
            </div>
            {cardNote && <p className="mt-4 text-sm text-muted">{cardNote}</p>}
            {savedNote && <p className="mt-4 text-sm text-muted">{savedNote}</p>}
          </section>

          <LetterList letters={letters} />
        </div>
      )}

      {stage === 'voyage' && (
        <section className="panel relative overflow-hidden p-6 sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl transition-all duration-1000"
            style={{
              opacity: lift,
              background:
                'radial-gradient(circle, color-mix(in oklab, var(--accent-2) 70%, white) 0%, transparent 70%)',
              transform: `translateX(-50%) scale(${0.75 + lift})`,
            }}
          />
          <div className="relative">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-bronze-soft">
              {phase.title}
            </p>
            <h2 className="panel-title mt-3 text-3xl text-ink sm:text-4xl">{phase.line}</h2>
            {phase.id === 'presence' && voiceChoice === 'mine' && (
              <p className="mt-4 text-sm text-muted">Your voice is with you.</p>
            )}
            <p className="mt-6 font-display text-2xl tabular-nums text-ink">
              {formatClock(elapsed)}
              <span className="text-base text-muted"> / {formatClock(total)}</span>
            </p>
            <ol className="mt-8 flex gap-2" aria-label="Movements">
              {phases.map((item, i) => (
                <li
                  key={item.id}
                  className="h-1.5 flex-1 rounded-full"
                  style={{
                    background:
                      i <= phaseIndex
                        ? 'var(--accent-2)'
                        : 'color-mix(in oklab, var(--text) 12%, transparent)',
                  }}
                  title={item.title}
                />
              ))}
            </ol>
            <p className="mt-4 text-sm text-muted">{phases.map((item) => item.title).join(' · ')}</p>
            <button type="button" className="btn btn-ghost mt-8" onClick={closeVoyage}>
              Close and write what you were shown
            </button>
          </div>
        </section>
      )}

      {stage === 'letter' && (
        <section className="panel p-6 sm:p-8">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-bronze-soft">
            The letter
          </p>
          <h2 className="panel-title mt-3 text-3xl text-ink">What were you shown?</h2>
          <p className="mt-3 text-muted">One sentence is enough. The card is yours to keep or send.</p>
          {scriptRef.current && voiceChoice === 'guide' && (
            <blockquote className="mt-5 border-l-2 border-[var(--accent-2)] pl-4 text-sm leading-relaxed text-muted">
              {scriptRef.current}
            </blockquote>
          )}
          <textarea
            className="field-textarea mt-5 min-h-32 w-full"
            value={letter}
            placeholder="I was shown…"
            onChange={(e) => setLetter(e.target.value)}
          />
          <VoyageCardPreview question={question} letter={letter} strokes={strokes} />
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={keepLetter} disabled={!letter.trim()}>
              Keep this letter
            </button>
            <button type="button" className="btn btn-teal" onClick={() => void saveCard()} disabled={!letter.trim()}>
              Save card
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void shareCard()} disabled={!letter.trim()}>
              Share card
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void copyGift()}>
              Ask this for someone
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setStage('ready')
                setElapsed(0)
                setPhaseIndex(0)
              }}
            >
              Return
            </button>
          </div>
          {savedNote && <p className="mt-4 text-sm text-muted">{savedNote}</p>}
          {cardNote && <p className="mt-2 text-sm text-muted">{cardNote}</p>}
        </section>
      )}
    </div>
  )
}

function VoyageCardPreview({
  question,
  letter,
  strokes,
}: {
  question: string
  letter: string
  strokes: number
}) {
  const line = letter.trim()
  return (
    <article className="mt-5 rounded-3xl bg-[#0b1214] px-6 py-8 text-center text-[#f4f7f6]">
      <div className="mb-2 flex justify-center">
        <SigilMark strokes={strokes} size={88} />
      </div>
      <p className="font-display text-xs font-semibold tracking-[0.22em] text-[#c48a48]">AUREVIA</p>
      <p className="mt-4 text-sm text-[#8aa0a6]">{question.trim() || 'The next true step'}</p>
      <p className="mt-6 font-display text-2xl font-bold leading-snug">
        {line || 'Your sentence will live here.'}
      </p>
      <p className="mt-8 text-sm text-[#2dd4bf]">A voyage to my higher self</p>
    </article>
  )
}

function LetterList({ letters }: { letters: AureviaLetter[] }) {
  if (letters.length === 0) {
    return (
      <section className="panel p-6">
        <h2 className="panel-title text-lg">Letters</h2>
        <p className="mt-2 text-sm text-muted">Each voyage can end with one sentence you keep.</p>
      </section>
    )
  }

  return (
    <section className="panel p-6">
      <h2 className="panel-title text-lg">Letters</h2>
      <ul className="mt-4 space-y-4">
        {letters.map((item) => (
          <li key={item.id} className="border-t border-[var(--border)] pt-4 first:border-t-0 first:pt-0">
            {item.question && <p className="text-sm text-muted">{item.question}</p>}
            <p className="mt-1 leading-relaxed text-ink">{item.letter}</p>
            <p className="mt-1 text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
