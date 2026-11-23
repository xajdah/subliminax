import { useState } from 'react'
import {
  countWords,
  generateSubliminalScripts,
  type GeneratedScripts,
  type ScriptFormat,
  type ScriptIntake,
} from '../../services/scriptGenerator'

interface Props {
  intake: ScriptIntake
  generated: GeneratedScripts | null
  activeFormat: ScriptFormat | null
  onIntakeChange: (intake: ScriptIntake) => void
  onGenerated: (scripts: GeneratedScripts) => void
  onUseScript: (format: ScriptFormat, text: string) => void
}

const FORMATS: { id: ScriptFormat; label: string; hint: string }[] = [
  { id: 'short', label: 'Short', hint: '~45–60 words · loop / ultrasonic' },
  { id: 'medium', label: 'Medium', hint: '~85–95 words · Narrator-ready' },
  { id: 'long', label: 'Long', hint: '~200–250 words · deep induction' },
]

function WordBadge({ count }: { count: number }) {
  const ok = count <= 100
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
        ok
          ? 'bg-[color-mix(in_oklab,#34d399_18%,transparent)] text-[#6ee7b7]'
          : 'bg-[color-mix(in_oklab,#fbbf24_18%,transparent)] text-[#fcd34d]'
      }`}
    >
      {count} words
    </span>
  )
}

export function AiScriptArchitect({
  intake,
  generated,
  activeFormat,
  onIntakeChange,
  onGenerated,
  onUseScript,
}: Props) {
  const [open, setOpen] = useState(true)
  const [tab, setTab] = useState<ScriptFormat>('medium')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const patch = (p: Partial<ScriptIntake>) => onIntakeChange({ ...intake, ...p })

  const canGenerate =
    intake.feeling.trim().length > 1 &&
    intake.facing.trim().length > 1 &&
    intake.achieve.trim().length > 1

  const generate = async () => {
    if (!canGenerate || loading) return
    setLoading(true)
    setErr(null)
    try {
      const scripts = await generateSubliminalScripts(intake)
      onGenerated(scripts)
      setTab('medium')
    } catch {
      setErr('Could not generate scripts. Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-bg/40">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div>
          <h3 className="font-display text-sm font-semibold text-ink">AI Script Architect</h3>
          <p className="mt-0.5 text-xs text-muted">
            Three gentle questions → Short, Medium & Long subliminal scripts
          </p>
        </div>
        <span className="text-xs font-semibold text-muted">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-border px-4 py-4">
          <label className="block">
            <span className="field-label">What are you feeling right now?</span>
            <input
              className="field-input"
              placeholder="e.g. anxious, stuck, unmotivated…"
              value={intake.feeling}
              onChange={(e) => patch({ feeling: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="field-label">What are you facing?</span>
            <input
              className="field-input"
              placeholder="Current block, resistance, or life situation"
              value={intake.facing}
              onChange={(e) => patch({ facing: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="field-label">What do you want to achieve?</span>
            <input
              className="field-input"
              placeholder="Desired outcome, identity shift, or goal"
              value={intake.achieve}
              onChange={(e) => patch({ achieve: e.target.value })}
            />
          </label>

          <button
            type="button"
            className="btn btn-primary"
            disabled={!canGenerate || loading}
            onClick={() => void generate()}
          >
            {loading ? 'Generating…' : 'Generate Subliminal Scripts'}
          </button>
          {err && <p className="text-sm text-danger">{err}</p>}

          {generated && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="chip chip-teal"
                    data-active={tab === f.id}
                    onClick={() => setTab(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {FORMATS.map((f) => {
                if (f.id !== tab) return null
                const text = generated[f.id]
                const words = countWords(text)
                return (
                  <article
                    key={f.id}
                    className="rounded-xl border border-border bg-[var(--panel)] px-4 py-3"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="font-display text-sm font-semibold text-ink">
                          {f.label}
                          {activeFormat === f.id ? (
                            <span className="ml-2 text-[11px] font-medium text-accent-soft">
                              in editor
                            </span>
                          ) : null}
                        </h4>
                        <p className="text-[11px] text-muted">{f.hint}</p>
                      </div>
                      <WordBadge count={words} />
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/90">{text}</p>
                    <button
                      type="button"
                      className="btn btn-teal mt-3 text-xs"
                      onClick={() => onUseScript(f.id, text)}
                    >
                      Use This Script
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
