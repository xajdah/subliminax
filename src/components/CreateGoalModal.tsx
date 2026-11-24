import { useEffect, useMemo, useState } from 'react'
import { fileToVisionImage } from '../services/visionBoardStorage'
import {
  computeTargetDate,
  newId,
  pickDefaultLayout,
  TIMEFRAME_LABELS,
  type GoalTimeframe,
  type VisionGoal,
} from '../types/visionBoard'
import { LiveCountdown } from './vision/LiveCountdown'
import { VisionCollage } from './vision/VisionCollage'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (goal: VisionGoal) => void
}

const STEPS = ['Name', 'Target', 'Images'] as const

const TIMEFRAME_PILLS: GoalTimeframe[] = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'biannual',
  'yearly',
  'custom',
]

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function CreateGoalModal({ open, onClose, onSave }: Props) {
  const [step, setStep] = useState(0)
  const [title, setTitle] = useState('')
  const [timeframe, setTimeframe] = useState<GoalTimeframe>('monthly')
  const [customLocal, setCustomLocal] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setStep(0)
    setTitle('')
    setTimeframe('monthly')
    setCustomLocal('')
    setImages([])
    setError(null)
  }, [open])

  const targetDate = useMemo(() => {
    if (timeframe === 'custom') {
      if (!customLocal) return computeTargetDate('weekly')
      return computeTargetDate('custom', new Date(customLocal).toISOString())
    }
    return computeTargetDate(timeframe)
  }, [timeframe, customLocal])

  useEffect(() => {
    if (timeframe === 'custom' && !customLocal) {
      setCustomLocal(toDatetimeLocalValue(computeTargetDate('weekly')))
    }
  }, [timeframe, customLocal])

  if (!open) return null

  const ingestFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!list.length) return
    setUploading(true)
    setError(null)
    try {
      const room = Math.max(0, 9 - images.length)
      const slice = list.slice(0, room)
      const urls: string[] = []
      for (const f of slice) {
        urls.push(await fileToVisionImage(f))
      }
      setImages((prev) => [...prev, ...urls].slice(0, 9))
    } catch {
      setError('Could not process one or more images.')
    } finally {
      setUploading(false)
    }
  }

  const canNext =
    step === 0
      ? title.trim().length >= 2
      : step === 1
        ? timeframe !== 'custom' || Boolean(customLocal)
        : images.length >= 1

  const save = () => {
    if (!canNext) return
    const goal: VisionGoal = {
      id: newId('vg'),
      title: title.trim(),
      createdAt: new Date().toISOString(),
      targetDate,
      timeframe,
      images,
      collageLayout: pickDefaultLayout(images.length),
      linkedTrackIds: [],
      status: 'active',
    }
    onSave(goal)
    onClose()
  }

  return (
    <div className="vision-modal-root" role="dialog" aria-modal="true" aria-labelledby="create-goal-title">
      <button type="button" className="vision-modal-backdrop" aria-label="Close" onClick={onClose} />
      <div className="vision-modal-panel animate-rise">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Step {step + 1} of 3 · {STEPS[step]}
            </p>
            <h2 id="create-goal-title" className="font-display text-xl font-bold text-ink">
              New Vision Goal
            </h2>
          </div>
          <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mb-4 flex gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                i <= step
                  ? 'bg-[color-mix(in_oklab,var(--accent)_80%,transparent)]'
                  : 'bg-[color-mix(in_oklab,var(--border)_80%,transparent)]'
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <label className="block">
              <span className="field-label">Goal name</span>
              <input
                className="field-input"
                autoFocus
                placeholder="e.g. Lead with calm confidence"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <div>
              <span className="field-label">Timeframe</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {TIMEFRAME_PILLS.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    className="chip chip-teal"
                    data-active={timeframe === tf}
                    onClick={() => setTimeframe(tf)}
                  >
                    {TIMEFRAME_LABELS[tf]}
                    {tf === 'custom' ? ' Date' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Target locks to the end of your chosen window in your local timezone
              ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
            </p>
            {timeframe === 'custom' && (
              <label className="block max-w-xs">
                <span className="field-label">Custom target</span>
                <input
                  className="field-input"
                  type="datetime-local"
                  value={customLocal}
                  onChange={(e) => setCustomLocal(e.target.value)}
                />
              </label>
            )}
            <div className="rounded-xl border border-border bg-bg/40 p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                Live countdown
              </p>
              <LiveCountdown targetDate={targetDate} size="lg" />
              <p className="mt-3 text-xs text-muted">
                Lands{' '}
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'full',
                  timeStyle: 'short',
                }).format(new Date(targetDate))}
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div
              className={`rounded-xl border border-dashed px-4 py-8 text-center transition ${
                dragOver
                  ? 'border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]'
                  : 'border-border bg-bg/35'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                void ingestFiles(e.dataTransfer.files)
              }}
            >
              <p className="font-display text-sm font-semibold text-ink">
                Drop images here · 1 to 9
              </p>
              <p className="mt-1 text-xs text-muted">PNG, JPG, WebP · live collage preview</p>
              <label className="btn btn-teal mt-4 inline-flex cursor-pointer text-xs">
                {uploading ? 'Uploading…' : 'Browse files'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploading || images.length >= 9}
                  onChange={(e) => {
                    if (e.target.files) void ingestFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
              </label>
            </div>

            {images.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">{images.length} / 9 images</span>
                  <button
                    type="button"
                    className="btn btn-ghost px-2 py-1 text-[11px]"
                    onClick={() => setImages([])}
                  >
                    Clear
                  </button>
                </div>
                <div className="relative h-44 overflow-hidden rounded-xl border border-border">
                  <VisionCollage
                    images={images}
                    layout={pickDefaultLayout(images.length)}
                    className="absolute inset-0"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {images.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      className="relative h-14 w-14 overflow-hidden rounded-lg border border-border"
                      onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                      title="Remove"
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-between gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </button>
          {step < 2 ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canNext}
              onClick={() => setStep((s) => Math.min(2, s + 1))}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canNext || uploading}
              onClick={save}
            >
              Save Vision Board
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
