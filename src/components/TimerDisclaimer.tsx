import { useState } from 'react'

const DISMISSED_KEY = 'ark-tracker:disclaimer-dismissed'

// Timers count real-world time, but the game's timers stop while the server is down
// and rewind on a crash rollback. The app can't see either, so we say so up front.
// On the list it can be dismissed (per device); on the marker form it always shows.
export default function TimerDisclaimer({ dismissible = false }: { dismissible?: boolean }) {
  const [dismissed, setDismissed] = useState(() => dismissible && localStorage.getItem(DISMISSED_KEY) === '1')
  if (dismissed) return null

  return (
    <div className="disclaimer">
      <p>
        Timers count real time and can't see server downtime, daily resets, or crash rollbacks, so
        the game may show more time left. Use Resync to match it.
      </p>
      {dismissible && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            localStorage.setItem(DISMISSED_KEY, '1')
            setDismissed(true)
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
