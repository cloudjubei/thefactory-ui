import type { ProcessRun } from 'thefactory-tools/types'

/** What a park's standing reads of a run. */
export type ParkStandingRun = Pick<
  ProcessRun,
  'id' | 'projectId' | 'status' | 'park' | 'ledger' | 'manager' | 'needsYouResolutions'
>

/** Which park: the run that stopped, and when. */
export type ParkToken = { runId: string; parkedAt: number }

/** How what was raised on a park closed: handled — answered or decided — or superseded by what came after. */
export type ParkClosure = { line: string; tone: 'handled' | 'superseded' }

/**
 * Where a park stands now: `unknown` while the run is not read (or is gone —
 * what was raised on it then shows as it was written), `open` while the run
 * still waits at it, `closed` once it does not.
 */
export type ParkStanding =
  | { state: 'unknown' }
  | { state: 'open' }
  | { state: 'closed'; closure: ParkClosure }
