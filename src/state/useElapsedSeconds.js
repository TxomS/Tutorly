import { useEffect, useState } from 'react'

/** Counts whole seconds while `isRunning` is true, and goes back to 0 when it turns false. */
export function useElapsedSeconds(isRunning) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!isRunning) return
    const startedAt = Date.now()
    // Measure from the start time, not by counting ticks, so a throttled background tab does not fall behind.
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => {
      clearInterval(timer)
      setSeconds(0)
    }
  }, [isRunning])

  return seconds
}
