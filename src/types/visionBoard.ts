/** Vision Boards & Goal Manifestation — domain types */

export type GoalTimeframe =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'biannual'
  | 'yearly'
  | 'custom'

export type CollageLayout = 'single' | 'split' | 'grid-3' | 'mosaic-4' | 'bento-6'

export type GoalStatus = 'active' | 'achieved'

export type TimeframeFilter = 'all' | GoalTimeframe

export interface VisionGoal {
  id: string
  title: string
  createdAt: string
  targetDate: string
  timeframe: GoalTimeframe
  /** Data URLs or blob URLs — 1–9 images */
  images: string[]
  collageLayout: CollageLayout
  linkedTrackIds?: string[]
  status: GoalStatus
}

export interface ProgressEntry {
  id: string
  goalId: string
  /** UTC ISO timestamp */
  timestamp: string
  /** Auto-captured local calendar date via Intl — never manually entered */
  localDateString: string
  timezone: string
  note: string
  audioNoteUrl?: string
  audioDurationSec?: number
  attachments: string[]
  /** 1–10 self-rated alignment / momentum */
  milestoneScore: number
}

export interface VisionBoardStore {
  goals: VisionGoal[]
  progress: ProgressEntry[]
  version: 1
}

export const TIMEFRAME_LABELS: Record<GoalTimeframe, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannual: '6-Month',
  yearly: 'Yearly',
  custom: 'Custom',
}

export const TIMEFRAME_FILTERS: { id: TimeframeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'biannual', label: '6-Month' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'custom', label: 'Custom' },
]

export const COLLAGE_CYCLE: CollageLayout[] = [
  'single',
  'split',
  'grid-3',
  'mosaic-4',
  'bento-6',
]

export function newId(prefix = 'vg'): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

/** Device timezone + locale-aware local date string (never manual). */
export function captureLocalDateMeta(now = new Date()): {
  timestamp: string
  localDateString: string
  timezone: string
} {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const localDateString = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  }).format(now)
  return {
    timestamp: now.toISOString(),
    localDateString,
    timezone,
  }
}

/** Compute targetDate ISO from timeframe relative to now (end of local day for daily, etc.). */
export function computeTargetDate(
  timeframe: GoalTimeframe,
  customIso?: string,
  from = new Date(),
): string {
  if (timeframe === 'custom' && customIso) {
    const d = new Date(customIso)
    return Number.isNaN(d.getTime()) ? from.toISOString() : d.toISOString()
  }

  const d = new Date(from.getTime())
  switch (timeframe) {
    case 'daily':
      d.setDate(d.getDate() + 1)
      break
    case 'weekly':
      d.setDate(d.getDate() + 7)
      break
    case 'monthly':
      d.setMonth(d.getMonth() + 1)
      break
    case 'quarterly':
      d.setMonth(d.getMonth() + 3)
      break
    case 'biannual':
      d.setMonth(d.getMonth() + 6)
      break
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1)
      break
    default:
      d.setDate(d.getDate() + 7)
  }
  // Snap to end of that local calendar day for a clean countdown landing
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export function pickDefaultLayout(imageCount: number): CollageLayout {
  if (imageCount <= 1) return 'single'
  if (imageCount === 2) return 'split'
  if (imageCount === 3) return 'grid-3'
  if (imageCount <= 5) return 'mosaic-4'
  return 'bento-6'
}

export function nextCollageLayout(current: CollageLayout, imageCount: number): CollageLayout {
  const allowed = COLLAGE_CYCLE.filter((l) => {
    if (l === 'single') return imageCount >= 1
    if (l === 'split') return imageCount >= 2
    if (l === 'grid-3') return imageCount >= 3
    if (l === 'mosaic-4') return imageCount >= 4
    if (l === 'bento-6') return imageCount >= 4
    return true
  })
  const idx = allowed.indexOf(current)
  return allowed[(idx + 1) % allowed.length] ?? pickDefaultLayout(imageCount)
}

export interface CountdownParts {
  totalMs: number
  days: number
  hours: number
  minutes: number
  seconds: number
  expired: boolean
}

export function getCountdownParts(targetIso: string, now = Date.now()): CountdownParts {
  const totalMs = new Date(targetIso).getTime() - now
  if (!Number.isFinite(totalMs) || totalMs <= 0) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  }
  const sec = Math.floor(totalMs / 1000)
  const days = Math.floor(sec / 86400)
  const hours = Math.floor((sec % 86400) / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  const seconds = sec % 60
  return { totalMs, days, hours, minutes, seconds, expired: false }
}
