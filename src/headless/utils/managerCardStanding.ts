import type {
  ProcessManagerEscalation,
  ProcessManagerIntervention,
  ProcessManagerPreRead,
} from 'thefactory-tools/types'

import { MANAGER_CARD_SUPERSEDED_NEWER } from './managerCardsConstants'
import type { ManagerInterventionStanding, ManagerPreReadStanding } from './managerCardsTypes'
import { processParkClosure, processParkStanding, processRunWaitsAt } from './processParkStanding'
import { PROCESS_PARK_DECIDED } from './processParkStandingConstants'
import type { ParkStanding, ParkStandingRun } from './processParkStandingTypes'
import { runNeedsYouOutcome } from './runNeedsYouView'

/**
 * Where a park the manager handed to the person stands now, read off the run
 * holding it (`holder`) and the top-level run keeping the manager's record
 * (`root`): open while the run still waits at it and no newer card replaced
 * it; else closed — by the answer the run recorded, who gave it and when, or
 * by what came instead. Pure but for the reader's clock and locale.
 */
export function managerEscalationStanding(
  escalation: ProcessManagerEscalation,
  root: ParkStandingRun | undefined,
  holder: ParkStandingRun | undefined,
): ParkStanding {
  const standing = processParkStanding(escalation, holder, root)
  if (standing.state !== 'open') return standing
  const current = root?.manager?.escalation
  const newer =
    current?.runId === escalation.runId &&
    current.parkedAt === escalation.parkedAt &&
    current.at > escalation.at
  return newer
    ? { state: 'closed', closure: { tone: 'superseded', line: MANAGER_CARD_SUPERSEDED_NEWER } }
    : standing
}

/** An intervention as the top-level run keeps it now — how it came out since it was posted. Pure. */
export function managerInterventionStanding(
  intervention: ProcessManagerIntervention,
  root: ParkStandingRun | undefined,
): ManagerInterventionStanding {
  const live = root?.manager?.interventions?.find((i) => i.id === intervention.id)
  return live ? { intervention: live } : {}
}

/**
 * A pre-read's "Needs you" items as settled since, each with how, and — once
 * the run left the sign-off it was filed at — how that sign-off was decided.
 * Pure but for the reader's clock and locale.
 */
export function managerPreReadStanding(
  preRead: ProcessManagerPreRead,
  holder: ParkStandingRun | undefined,
): ManagerPreReadStanding {
  if (!holder) return { settled: {} }
  const settled: Record<string, string> = {}
  for (const item of preRead.items) {
    const resolution = holder.needsYouResolutions?.[item.itemId]
    if (resolution) settled[item.itemId] = runNeedsYouOutcome(resolution)
  }
  if (processRunWaitsAt(holder, preRead)) return { settled }
  return {
    settled,
    closure: processParkClosure(preRead, holder, undefined, PROCESS_PARK_DECIDED),
  }
}
