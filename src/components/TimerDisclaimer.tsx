// Timers count real-world time, but the game's timers stop while the server is down
// and rewind on a crash rollback. The app can't see either, so we say so up front.
export default function TimerDisclaimer() {
  return (
    <p className="disclaimer">
      Timers count real time. They can't account for server downtime, daily resets, or crash
      rollbacks, so the in-game timer may have more time left. Use Resync on a timer to match what
      the game shows.
    </p>
  )
}
