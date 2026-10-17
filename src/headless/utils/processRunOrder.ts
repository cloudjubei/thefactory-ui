/**
 * Newest first, for any list of runs: the later `startedAt` first, and a run
 * with no `startedAt` yet ahead of every started one — a run still pending has
 * not started, so it is the newest of all. Reading a missing start as 0 sank a
 * just-launched run to the bottom, so a story's "first run" was an older one.
 * Runs that started together, or that have both not started, keep the order
 * they came in. Pure.
 */
export function compareRunsNewestFirst(
  a: { startedAt?: number | null },
  b: { startedAt?: number | null },
): number {
  const aStart = a.startedAt
  const bStart = b.startedAt
  if (typeof aStart === 'number' && typeof bStart === 'number') return bStart - aStart
  if (typeof aStart === 'number') return 1
  if (typeof bStart === 'number') return -1
  return 0
}
