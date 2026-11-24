import { useState } from 'react'
import { SigilMark } from '../aurevia/SigilMark'
import { latestDreamSeen } from '../../services/dreamLetters'
import { letterOracle } from '../../services/letterOracle'
import { sigilStrokes } from '../../services/sigilStore'
import { useTheme } from '../../hooks/useTheme'
import { useVisionBoard } from '../../hooks/useVisionBoard'
import { TIMEFRAME_FILTERS, type VisionGoal } from '../../types/visionBoard'
import { CreateGoalModal } from '../CreateGoalModal'
import { ThemeToggle } from '../ThemeToggle'
import { VisionBoardCard, shuffleGoalLayout } from '../VisionBoardCard'
import { GoalDetailPlaceholder } from './GoalDetailPlaceholder'

interface Props {
  onHome: () => void
}

export function VisionBoardHub({ onHome }: Props) {
  const { theme, toggleTheme } = useTheme()
  const { goals, filter, setFilter, upsertGoal, updateGoal } = useVisionBoard()
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<VisionGoal | null>(null)
  const strokes = sigilStrokes()
  const oracle = letterOracle()
  const dream = latestDreamSeen()

  return (
    <div className="vision-hub relative isolate min-h-screen">
      <div className="vision-hub-atmosphere" aria-hidden />

      <header className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-5 sm:px-6 lg:px-10">
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          ← Home
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
            Vision Boards
          </h1>
          <p className="text-sm text-muted">Goal manifestation · live countdowns · collage boards</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            New Goal
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-10">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by timeframe">
          {TIMEFRAME_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className="chip"
              data-active={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <section className="relative z-10 mx-auto mb-6 flex max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-10">
        <div className="panel flex items-center gap-4 p-4">
          <SigilMark strokes={strokes} />
          <div>
            <h2 className="panel-title text-lg text-ink">Your mark</h2>
            <p className="mt-1 text-sm text-muted">
              {strokes === 0
                ? 'It begins when you keep a voyage.'
                : `${strokes} held in gold.`}
            </p>
            {oracle && <p className="mt-2 max-w-md text-sm text-ink">{oracle}</p>}
            {dream && <p className="mt-2 max-w-md text-sm text-muted">Last dream: {dream}</p>}
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-10">
        {goals.length === 0 ? (
          <section className="panel mx-auto max-w-lg p-8 text-center">
            <h2 className="font-display text-lg font-bold text-ink">No visions yet</h2>
            <p className="mt-2 text-sm text-muted">
              Create a goal, drop in images, and watch the countdown lock your focus.
            </p>
            <button
              type="button"
              className="btn btn-primary mt-5"
              onClick={() => setCreateOpen(true)}
            >
              Create your first board
            </button>
          </section>
        ) : (
          <div className="vision-masonry">
            {goals.map((goal) => (
              <VisionBoardCard
                key={goal.id}
                goal={goal}
                onOpen={setSelected}
                onShuffle={(g) => {
                  const next = shuffleGoalLayout(g)
                  updateGoal(next.id, { collageLayout: next.collageLayout })
                }}
              />
            ))}
          </div>
        )}
      </main>

      <CreateGoalModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={(goal) => upsertGoal(goal)}
      />

      {selected && (
        <GoalDetailPlaceholder goal={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
