import { useEffect, useRef, useState } from 'react'
import type { TransportState } from '../types/studio'

export function useSessionTimer(transport: TransportState) {
  const [elapsedMs, setElapsedMs] = useState(0)
  const startedAt = useRef<number | null>(null)
  const accumulated = useRef(0)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    const tick = () => {
      if (startedAt.current != null) {
        setElapsedMs(accumulated.current + (performance.now() - startedAt.current))
      }
      raf.current = requestAnimationFrame(tick)
    }

    if (transport === 'playing') {
      startedAt.current = performance.now()
      raf.current = requestAnimationFrame(tick)
    } else if (transport === 'paused') {
      if (startedAt.current != null) {
        accumulated.current += performance.now() - startedAt.current
        startedAt.current = null
      }
      setElapsedMs(accumulated.current)
      if (raf.current != null) cancelAnimationFrame(raf.current)
    } else {
      startedAt.current = null
      accumulated.current = 0
      setElapsedMs(0)
      if (raf.current != null) cancelAnimationFrame(raf.current)
    }

    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current)
    }
  }, [transport])

  return elapsedMs
}

export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
