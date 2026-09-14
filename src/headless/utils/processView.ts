import type { ProcessRun, ProcessStepOutcome } from 'thefactory-tools/types'
import { processRunProgress } from 'thefactory-tools/utils'

/**
 * How a process reads on screen — shared by the `web/` and `native/` peers so
 * the two cannot drift on what an outcome is called or which status colour it
 * carries.
 *
 * The status keys are the package's own semantic set (`--status-<key>-fg` /
 * `-bg`), not invented names: a colour that resolves to no token renders as
 * nothing at all, which is worse than the wrong colour because it looks
 * deliberate.
 */
export type ProcessStatusTone = 'empty' | 'done' | 'working' | 'stuck' | 'blocked' | 'queued'

/** What each step outcome is called, and the status tone it carries. */
export const PROCESS_OUTCOME_VIEW: Record<
  ProcessStepOutcome,
  { label: string; tone: ProcessStatusTone }
> = {
  passed: { label: 'passed', tone: 'done' },
  failed: { label: 'did not pass', tone: 'stuck' },
  // Distinct from `failed` on purpose: nothing was measured, which is a reason
  // to stop and ask rather than a verdict against the work.
  unchecked: { label: 'nothing checked', tone: 'blocked' },
  // Its own label because its answer is its own: the step asked something, and
  // nothing moves until a person replies.
  question: { label: 'asked a question', tone: 'queued' },
  skipped: { label: 'skipped', tone: 'empty' },
  errored: { label: 'errored', tone: 'stuck' },
}

/** How a whole run reads in one word. */
export const PROCESS_RUN_STATUS_VIEW: Record<
  ProcessRun['status'],
  { label: string; tone: ProcessStatusTone }
> = {
  pending: { label: 'Starting', tone: 'queued' },
  running: { label: 'Running', tone: 'working' },
  parked: { label: 'Waiting for you', tone: 'blocked' },
  succeeded: { label: 'Finished', tone: 'done' },
  failed: { label: 'Stopped', tone: 'stuck' },
  cancelled: { label: 'Cancelled', tone: 'empty' },
}

/** The tone a step node shows, given where it is and how it ended. */
export function processStepTone(
  status: 'pending' | 'running' | 'done',
  outcome: ProcessStepOutcome | undefined,
): ProcessStatusTone {
  if (status === 'pending') return 'empty'
  if (status === 'running') return 'working'
  return outcome ? PROCESS_OUTCOME_VIEW[outcome].tone : 'empty'
}

/**
 * One line for the chat card that launched a run.
 *
 * A parked run says a decision is PENDING and nothing more — which one, and the
 * choices that answer it, live in the pipeline where their context is.
 */
export function processRunChipLabel(run: ProcessRun): string {
  const { completed, total } = processRunProgress(run)
  const steps = `${completed}/${total} steps`
  switch (run.status) {
    case 'parked':
      return `A decision is pending · ${steps}`
    case 'succeeded':
      return `Finished · ${steps}`
    case 'failed':
      return `Stopped · ${steps}`
    case 'cancelled':
      return 'Cancelled'
    default:
      return `Running · ${steps}`
  }
}
