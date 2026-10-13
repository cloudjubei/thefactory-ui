import { PROCESS_STOP_CLOCK_MS } from '../utils/processRunStopConstants'
import { useDurationTimer } from './useDurationTimer'

/**
 * The clock every surface reads who has a run's stop against
 * (`processRunStopHolder`): it ticks on its own, so a manager's claim or turn
 * going stale hands the stop back to the person without waiting for news.
 */
export function useProcessStopClock(): number {
  return useDurationTimer(true, PROCESS_STOP_CLOCK_MS)
}
