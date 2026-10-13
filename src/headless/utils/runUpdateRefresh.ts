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
 * Whether a `cli:run-update` can concern a project-scoped panel: an update that
 * names another project's run cannot change this project's runs, and runs
 * stream updates across every project at once. An update that names no project,
 * or of unknown shape, is treated as a change.
 */
export function isRunUpdateForProject(data: unknown, projectId: string): boolean {
  const update = data as { projectId?: unknown; event?: { projectId?: unknown } } | undefined
  const named = update?.projectId ?? update?.event?.projectId
  return typeof named !== 'string' || named === projectId
}

/**
 * Whether a `chats:updated` can concern a project-scoped panel: a chat that
 * names another project cannot file anything in this one, and chats stream
 * updates across every project at once. A chat that names no project, or an
 * update of unknown shape, is treated as a change.
 */
export function isChatUpdateForProject(data: unknown, projectId: string): boolean {
  const update = data as { projectId?: unknown; context?: { projectId?: unknown } } | undefined
  const named = update?.context?.projectId ?? update?.projectId
  return typeof named !== 'string' || named === projectId
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
