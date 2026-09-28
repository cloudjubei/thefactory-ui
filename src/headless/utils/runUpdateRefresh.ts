/**
 * Whether a `cli:run-update` can change what a run-derived panel shows. Every
 * streamed transcript entry is broadcast as a `transcriptAppend` — cursor emits
 * several a second per run, a knowledge eval runs dozens of runs at once — and a
 * panel that re-lists on each one re-read whole run records hundreds of times a
 * minute: the story sign-off re-listed a 250 MB story per token and ran the
 * backend out of heap. Status, review, verification and actions arrive as their
 * own update types; an update of unknown shape is treated as a change.
 */
export function isRunStateUpdate(data: unknown): boolean {
  return (data as { type?: unknown } | undefined)?.type !== 'transcriptAppend'
}

/**
 * Wrap a refresh so it never overlaps itself: a call while one is in flight
 * schedules exactly ONE trailing run after it, however many calls arrive — the
 * trailing run reads the latest state, so nothing is missed and a burst of
 * updates costs two fetches, not one per update.
 */
export function createCoalescedRefresh(run: () => Promise<void>): () => Promise<void> {
  let inFlight: Promise<void> | undefined
  let again = false
  const start = (): Promise<void> => {
    inFlight = run().finally(() => {
      inFlight = undefined
      if (again) {
        again = false
        void start().catch(() => {})
      }
    })
    return inFlight
  }
  return () => {
    if (inFlight) {
      again = true
      return inFlight
    }
    return start()
  }
}
