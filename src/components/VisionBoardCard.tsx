import { LiveCountdown } from './vision/LiveCountdown'
import { VisionCollage } from './vision/VisionCollage'
import {
  TIMEFRAME_LABELS,
  nextCollageLayout,
  type VisionGoal,
} from '../types/visionBoard'

interface Props {
  goal: VisionGoal
  onOpen: (goal: VisionGoal) => void
  onShuffle: (goal: VisionGoal) => void
}

export function VisionBoardCard({ goal, onOpen, onShuffle }: Props) {
  const multi = goal.images.length > 1

  return (
    <article className="vision-card group relative flex flex-col overflow-hidden">
      <button
        type="button"
        className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden text-left"
        onClick={() => onOpen(goal)}
        aria-label={`Open goal ${goal.title}`}
      >
        <VisionCollage
          images={goal.images}
          layout={goal.collageLayout}
          className="absolute inset-0 h-full w-full"
        />
        <div className="vision-glass absolute inset-x-0 bottom-0 p-3 pt-10">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[color-mix(in_oklab,var(--bg)_55%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-soft backdrop-blur">
              {TIMEFRAME_LABELS[goal.timeframe]}
            </span>
            {goal.status === 'achieved' && (
              <span className="rounded-md bg-[color-mix(in_oklab,#34d399_22%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#6ee7b7]">
                Achieved
              </span>
            )}
            {goal.images.length > 0 && (
              <span className="vision-count-badge relative static ml-auto">{goal.images.length}</span>
            )}
          </div>
          <h3 className="font-display text-lg font-bold leading-tight text-ink drop-shadow-sm">
            {goal.title}
          </h3>
        </div>
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2.5">
        <LiveCountdown targetDate={goal.targetDate} size="sm" />
        <div className="flex items-center gap-1.5">
          {multi && (
            <button
              type="button"
              className="btn btn-ghost px-2 py-1 text-[11px]"
              onClick={(e) => {
                e.stopPropagation()
                onShuffle(goal)
              }}
            >
              Shuffle Layout
            </button>
          )}
          <button
            type="button"
            className="btn btn-teal px-2.5 py-1 text-[11px]"
            onClick={() => onOpen(goal)}
          >
            Open
          </button>
        </div>
      </div>
    </article>
  )
}

export function shuffleGoalLayout(goal: VisionGoal): VisionGoal {
  return {
    ...goal,
    collageLayout: nextCollageLayout(goal.collageLayout, goal.images.length),
  }
}
