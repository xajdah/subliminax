import { useCallback, useEffect, useMemo, useState } from 'react'
import { visionBoardStorage } from '../services/visionBoardStorage'
import type {
  ProgressEntry,
  TimeframeFilter,
  VisionBoardStore,
  VisionGoal,
} from '../types/visionBoard'

export function useVisionBoard() {
  const [store, setStore] = useState<VisionBoardStore>(() => visionBoardStorage.getAll())
  const [filter, setFilter] = useState<TimeframeFilter>('all')

  useEffect(() => visionBoardStorage.subscribe(setStore), [])

  const goals = useMemo(() => {
    const list = store.goals
    if (filter === 'all') return list
    return list.filter((g) => g.timeframe === filter)
  }, [store.goals, filter])

  const upsertGoal = useCallback((goal: VisionGoal) => {
    visionBoardStorage.upsertGoal(goal)
  }, [])

  const updateGoal = useCallback((id: string, patch: Partial<VisionGoal>) => {
    visionBoardStorage.updateGoal(id, patch)
  }, [])

  const deleteGoal = useCallback((id: string) => {
    visionBoardStorage.deleteGoal(id)
  }, [])

  const addProgress = useCallback(
    (
      entry: Omit<ProgressEntry, 'id' | 'timestamp' | 'localDateString' | 'timezone'> & {
        id?: string
      },
    ) => visionBoardStorage.addProgress(entry),
    [],
  )

  const progressFor = useCallback(
    (goalId: string) => store.progress.filter((p) => p.goalId === goalId),
    [store.progress],
  )

  return {
    store,
    goals,
    filter,
    setFilter,
    upsertGoal,
    updateGoal,
    deleteGoal,
    addProgress,
    progressFor,
  }
}
