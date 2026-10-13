import { processParkStanding } from '../utils/processParkStanding'
import type { ParkStanding } from '../utils/processParkStandingTypes'
import { useProcessRun } from './useProcessRun'

/**
 * Where a park a message told the person of stands now, kept live off the run
 * that stopped: open while it still waits there, closed — with who answered it
 * and when — once it does not, unknown while the run is not read.
 */
export function useProcessParkStanding(
  runId: string | undefined,
  parkedAt: number | undefined,
): ParkStanding {
  const { run } = useProcessRun(runId && parkedAt !== undefined ? runId : undefined)
  if (!runId || parkedAt === undefined) return { state: 'unknown' }
  return processParkStanding({ runId, parkedAt }, run)
}
