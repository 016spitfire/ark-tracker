import { useEffect, useState } from 'react'

// Re-renders the caller on an interval so countdowns stay current.
// Timers display to the minute, so a 15 second tick is plenty.
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
