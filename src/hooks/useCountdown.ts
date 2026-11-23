import { useEffect, useState } from 'react'
import { getCountdownParts, type CountdownParts } from '../types/visionBoard'

/** Live ticking countdown to an ISO target date. */
export function useCountdown(targetDate: string, tickMs = 250): CountdownParts {
  const [parts, setParts] = useState(() => getCountdownParts(targetDate))

  useEffect(() => {
    setParts(getCountdownParts(targetDate))
    const id = window.setInterval(() => {
      setParts(getCountdownParts(targetDate))
    }, tickMs)
    return () => window.clearInterval(id)
  }, [targetDate, tickMs])

  return parts
}
