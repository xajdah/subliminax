import { useRef, useState } from 'react'
import { mergeOcrPages, ocrLessonPages } from '../../services/studyOcr'
import {
  STUDY_LANGUAGES,
  STUDY_STYLE_CARDS,
  type StudyLearningStyle,
  type StudyOutputDevice,
  type StudySession,
} from '../../types/study'

interface Props {
  session: StudySession
  onChange: (patch: Partial<StudySession>) => void
  onGenerate: () => void
  generating: boolean
  error: string | null
}

const AGE_PILLS = [
  { age: 10, label: '≤12' },
  { age: 16, label: '13–24' },
  { age: 30, label: '25+' },
]

export function StudyLessonInput({
  session,
  onChange,
  onGenerate,
  generating,
  error,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [ocrStatus, setOcrStatus] = useState<string | null>(null)
  const [ocrBusy, setOcrBusy] = useState(false)

  const setDevice = (outputDevice: StudyOutputDevice) => onChange({ outputDevice })

  const runOcr = async (files: FileList | null) => {
    if (!files?.length) return
    setOcrBusy(true)
    setOcrStatus('Starting OCR…')
    try {
      const pages = await ocrLessonPages(Array.from(files), {
        lang: session.language,
        onProgress: (p) =>
          setOcrStatus(
            `Page ${p.page}/${p.total} · ${p.status} · ${Math.round(p.progress * 100)}%`,
          ),
      })
      const merged = mergeOcrPages(pages)
      const next = session.lessonText.trim()
        ? `${session.lessonText.trim()}\n\n${merged}`
        : merged
      onChange({ lessonText: next })
      setOcrStatus(`Appended text from ${pages.length} page(s).`)
    } catch (e) {
      setOcrStatus(e instanceof Error ? e.message : 'OCR failed.')
    } finally {
      setOcrBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-5">
      {/* 1. Learner & output */}
      <section className="panel space-y-4 p-5">
        <h2 className="panel-title text-lg">1 · Learner & output</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Language</span>
            <select
              className="field-input mt-1 w-full"
              value={session.language}
              onChange={(e) =>
                onChange({ language: e.target.value as StudySession['language'] })
              }
            >
              {STUDY_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Subject</span>
            <input
              className="field-input mt-1 w-full"
              placeholder="e.g. Biology · Cell division"
              value={session.subject}
              onChange={(e) => onChange({ subject: e.target.value })}
            />
          </label>
        </div>

        <div>
          <span className="field-label">Learner age</span>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {AGE_PILLS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="chip"
                data-active={
                  (p.age <= 12 && session.age <= 12) ||
                  (p.age === 16 && session.age >= 13 && session.age <= 24) ||
                  (p.age >= 25 && session.age >= 25)
                }
                onClick={() => onChange({ age: p.age })}
              >
                {p.label}
              </button>
            ))}
            <input
              className="field-input w-24"
              type="number"
              min={5}
              max={99}
              value={session.age}
              onChange={(e) => onChange({ age: Number(e.target.value) || 16 })}
              aria-label="Exact age"
            />
          </div>
          {session.age >= 13 && session.age <= 24 && (
            <label className="mt-3 flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={session.preferGamma}
                onChange={(e) => onChange({ preferGamma: e.target.checked })}
              />
              Use 40 Hz Gamma (active recall) instead of 14 Hz SMR
            </label>
          )}
        </div>

        <div>
          <span className="field-label">Output device</span>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Headphones or speakers">
            <button
              type="button"
              className={`btn ${session.outputDevice === 'headphones' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setDevice('headphones')}
            >
              🎧 Headphones
            </button>
            <button
              type="button"
              className={`btn ${session.outputDevice === 'speakers' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setDevice('speakers')}
            >
              🔊 Speakers
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Headphones use binaural + out-of-head width. Speakers switch to mono-safe isochronic
            pulses with a 3 kHz vocal clarity boost.
          </p>
        </div>
      </section>

      {/* 2. Lesson text + OCR */}
      <section className="panel space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="panel-title text-lg">2 · Lesson input</h2>
            <p className="mt-1 text-sm text-muted">
              Paste notes or scan textbook pages — OCR appends cleaned text across pages.
            </p>
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void runOcr(e.target.files)}
            />
            <button
              type="button"
              className="btn btn-teal"
              disabled={ocrBusy}
              onClick={() => fileRef.current?.click()}
            >
              {ocrBusy ? 'Scanning…' : '📷 Scan Pages (OCR)'}
            </button>
          </div>
        </div>
        {ocrStatus && (
          <p className="text-xs text-muted" role="status">
            {ocrStatus}
          </p>
        )}
        <textarea
          className="field-input min-h-[220px] w-full font-mono text-sm leading-relaxed"
          placeholder="Paste lesson text, or scan pages to append OCR output…"
          value={session.lessonText}
          onChange={(e) => onChange({ lessonText: e.target.value })}
        />
      </section>

      {/* 3. Learning styles */}
      <section className="panel space-y-4 p-5">
        <h2 className="panel-title text-lg">3 · Learning style</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STUDY_STYLE_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              className={`rounded-xl border p-4 text-left transition ${
                session.style === card.id
                  ? 'border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)]'
                  : 'border-[var(--border)] hover:border-[var(--border-strong)]'
              }`}
              onClick={() => onChange({ style: card.id as StudyLearningStyle })}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-bronze-soft">
                {card.badge}
              </span>
              <span className="mt-1 block font-display text-sm font-bold text-ink">
                {card.title}
              </span>
              <span className="mt-1 block text-xs leading-snug text-muted">{card.blurb}</span>
            </button>
          ))}
        </div>
      </section>

      {error && (
        <p className="rounded-lg border border-[color-mix(in_oklab,#b91c1c_40%,transparent)] bg-[color-mix(in_oklab,#b91c1c_10%,transparent)] px-3 py-2 text-sm">
          {error}
        </p>
      )}

      <button
        type="button"
        className="btn btn-primary w-full px-6 py-3 text-base"
        disabled={generating || !session.lessonText.trim()}
        onClick={onGenerate}
      >
        {generating ? 'Synthesizing lesson…' : 'Generate highlights, script & quiz'}
      </button>
    </div>
  )
}
