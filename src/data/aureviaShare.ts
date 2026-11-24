import type { AureviaPathId } from './aureviaPhases'

export interface AureviaLaunch {
  path: AureviaPathId
  question: string
  fromGift?: boolean
  quietVoice?: boolean
  dream?: boolean
}

export const AUREVIA_STARTS: {
  id: string
  title: string
  line: string
  launch: AureviaLaunch
}[] = [
  {
    id: 'self',
    title: '8 minutes with my higher self',
    line: 'A short crossing, spoken gently, then one sentence you keep.',
    launch: { path: 'short', question: '' },
  },
  {
    id: 'dawn',
    title: 'Dawn clarity',
    line: 'Ask for the clarity already waiting in this day.',
    launch: { path: 'short', question: 'Show me the clarity already waiting in this day.' },
  },
  {
    id: 'step',
    title: 'The next true step',
    line: 'Meet the step that is already yours.',
    launch: { path: 'short', question: 'Show me the next true step.' },
  },
]

const SYNODIC_DAYS = 29.53058867

/** Days since a known new moon. 0 is new, about 14.8 is full. */
export function moonAgeDays(now = new Date()): number {
  const knownNew = Date.UTC(2000, 0, 6, 18, 14)
  const days = (now.getTime() - knownNew) / 86_400_000
  return ((days % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS
}

export interface SkyDoor {
  id: string
  title: string
  line: string
  launch: AureviaLaunch
}

/** The real day picks the voyage offered on the hub. */
export function skyDoor(now = new Date()): SkyDoor {
  const age = moonAgeDays(now)
  const hour = now.getHours()
  if (age < 1.6 || age > 27.9) {
    return {
      id: 'new-moon',
      title: 'New moon',
      line: 'A voyage for a beginning.',
      launch: { path: 'short', question: 'What is ready to begin?' },
    }
  }
  if (age > 13.3 && age < 16.3) {
    return {
      id: 'full-moon',
      title: 'Full moon',
      line: 'A quieter voyage for listening.',
      launch: {
        path: 'short',
        question: 'What is ready to be seen?',
        quietVoice: true,
      },
    }
  }
  if (hour >= 5 && hour < 9) {
    return {
      id: 'dawn',
      title: 'Dawn',
      line: 'The morning offers clarity.',
      launch: {
        path: 'short',
        question: 'Show me the clarity already waiting in this day.',
      },
    }
  }
  if (hour >= 17 && hour < 21) {
    return {
      id: 'dusk',
      title: 'Dusk',
      line: 'A voyage of return. Come home carrying the day.',
      launch: { path: 'short', question: 'What do I carry home from this day?' },
    }
  }
  return {
    id: 'open-hour',
    title: 'The open hour',
    line: 'The sky is quiet. A short crossing is open.',
    launch: { path: 'short', question: 'Show me the next true step.' },
  }
}

export function dreamHour(now = new Date()): boolean {
  const hour = now.getHours()
  return hour >= 21 || hour < 5
}

export const DREAM_LAUNCH: AureviaLaunch = {
  path: 'short',
  question: '',
  dream: true,
}

/** Same number for everyone in a given hour, so a shared quiet has one figure. */
export function crossingThisHour(now = new Date(), includeSelf = false): number {
  const curve = [42, 30, 24, 20, 18, 22, 38, 66, 90, 74, 62, 56, 60, 66, 72, 78, 86, 98, 122, 142, 134, 112, 88, 60]
  const hour = now.getHours()
  const dayWave = (now.getDate() * 13 + now.getMonth() * 5) % 18
  return curve[hour]! + dayWave + (includeSelf ? 1 : 0)
}

export function readAureviaLaunch(search = window.location.search): AureviaLaunch | null {
  const params = new URLSearchParams(search)
  if (params.get('aurevia') !== '1') return null
  const path: AureviaPathId = params.get('path') === 'full' ? 'full' : 'short'
  const question = (params.get('q') ?? '').slice(0, 280)
  return { path, question, fromGift: true }
}

export function aureviaGiftUrl(question: string): string {
  const url = new URL(window.location.href)
  url.hash = ''
  url.search = ''
  url.searchParams.set('aurevia', '1')
  url.searchParams.set('path', 'short')
  const q = question.trim().slice(0, 280)
  if (q) url.searchParams.set('q', q)
  return url.toString()
}

export function clearAureviaQuery() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('aurevia')) return
  url.searchParams.delete('aurevia')
  url.searchParams.delete('path')
  url.searchParams.delete('q')
  const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '') + url.hash
  window.history.replaceState({}, '', next)
}
