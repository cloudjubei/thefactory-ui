import type { ProcessRun, ProcessRunStatus } from 'thefactory-tools/types'
import { isProcessRunAwaitingIntegration, processRunSendBackGateId } from 'thefactory-tools/utils'

/** The statuses a run is still working or waiting in. */
export const PROCESS_RUN_ACTIVE_STATUSES: ReadonlySet<ProcessRunStatus> = new Set([
  'pending',
  'running',
  'parked',
])

/** Whether a run is still working or waiting, by its status alone. Pure. */
export function isProcessRunActive(run: Pick<ProcessRun, 'status'>): boolean {
  return PROCESS_RUN_ACTIVE_STATUSES.has(run.status)
}

/**
 * Whether a run belongs in "Current" — the Processes list, the counts and the
 * story chips — rather than "History": it is working or waiting, its approved
 * work is being brought in or has not landed (an attempt in flight is one that
 * has not landed yet), or it ended on a request for
 * changes it can still be sent back for. Only work that landed, was let go, or
 * had nothing to bring in is done. Pure.
 */
export function isProcessRunCurrent(
  run: Pick<
    ProcessRun,
    'status' | 'plan' | 'ledger' | 'workBranch' | 'parentRunId' | 'integration'
  > &
    Partial<Pick<ProcessRun, 'groupRunId'>>,
): boolean {
  return (
    isProcessRunActive(run) ||
    isProcessRunAwaitingIntegration(run) ||
    processRunSendBackGateId(run) !== undefined
  )
}

/** Runs split into Current and History by {@link isProcessRunCurrent}, each in the order given. Pure. */
export function splitProcessRunsByCurrent<T extends Parameters<typeof isProcessRunCurrent>[0]>(
  runs: readonly T[],
): { current: T[]; history: T[] } {
  const current: T[] = []
  const history: T[] = []
  for (const run of runs) (isProcessRunCurrent(run) ? current : history).push(run)
  return { current, history }
}
