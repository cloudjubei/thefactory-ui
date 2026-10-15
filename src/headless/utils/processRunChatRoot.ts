import type { ProcessRunTreeLink, ProcessRunTreeReader } from './processRunChatRootTypes'

/**
 * The run whose chat a run's page discusses: the top of its run tree, since a
 * nested run (a feature's pipeline, a step's own run) shares the chat of the
 * run above it. Reads each parent on the way up through `read`; `undefined`
 * when a parent is gone, a read fails, or the links loop.
 */
export async function resolveProcessRunChatRoot(
  run: ProcessRunTreeLink,
  read: ProcessRunTreeReader,
): Promise<ProcessRunTreeLink | undefined> {
  let current: ProcessRunTreeLink = run
  const seen = new Set<string>([run.id])
  while (current.parentRunId) {
    if (seen.has(current.parentRunId)) return undefined
    seen.add(current.parentRunId)
    const parent = await read(current.parentRunId).catch(() => undefined)
    if (!parent) return undefined
    current = parent
  }
  return current
}
