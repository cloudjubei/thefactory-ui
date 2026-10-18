import { siblingFallbackNoticeState } from '../utils/siblingFallbackView'
import type { SiblingFallbackNoticeState } from '../utils/siblingFallbackViewTypes'
import { useProcessRun } from './useProcessRun'

/**
 * Where a run-chat notice about a checks attempt that ran again at a
 * dependency's stable branch stands now, kept live off the run: current while
 * it is the run's newest checks attempt, superseded once a newer one ran,
 * unknown while the run is not read.
 */
export function useSiblingFallbackNotice(
  runId: string | undefined,
  entryId: string | undefined,
): SiblingFallbackNoticeState {
  const { run } = useProcessRun(runId && entryId ? runId : undefined)
  if (!runId || !entryId) return { state: 'unknown' }
  return siblingFallbackNoticeState(run, entryId)
}
