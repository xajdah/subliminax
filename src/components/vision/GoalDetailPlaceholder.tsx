import { TIMEFRAME_LABELS, type VisionGoal } from '../../types/visionBoard'
import { LiveCountdown } from './LiveCountdown'
import { VisionCollage } from './VisionCollage'

interface Props {
  goal: VisionGoal
  onClose: () => void
}

/** Prompt 1 shell — full Goal Detail & Progress lands in Prompt 2. */
export function GoalDetailPlaceholder({ goal, onClose }: Props) {
  return (
    <div className="vision-modal-root" role="dialog" aria-modal="true">
      <button type="button" className="vision-modal-backdrop" aria-label="Close" onClick={onClose} />
      <div className="vision-drawer-panel animate-rise">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-soft">
              {TIMEFRAME_LABELS[goal.timeframe]} · {goal.status}
            </p>
            <h2 className="font-display text-2xl font-bold text-ink">{goal.title}</h2>
          </div>
          <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="relative mb-4 h-52 overflow-hidden rounded-xl border border-border">
          <VisionCollage
            images={goal.images}
            layout={goal.collageLayout}
            className="absolute inset-0"
          />
        </div>

        <LiveCountdown targetDate={goal.targetDate} size="md" className="mb-4" />

        <div className="rounded-xl border border-border bg-bg/40 p-4">
          <h3 className="font-display text-sm font-semibold text-ink">Progress & reflections</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Journal entries, voice memos, milestone scores, and linked subliminal tracks open here
            next — Goal Detail & Progress Drawer (Prompt 2).
          </p>
        </div>
      </div>
    </div>
  )
}
