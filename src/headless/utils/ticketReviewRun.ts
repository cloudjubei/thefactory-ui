import type { ProcessRun } from 'thefactory-tools/types'
import { PROCESS_RUN_TERMINAL_STATUSES } from 'thefactory-tools/constants'
import { isReviewPushApproval } from './colleagueReviewBranchUpdates'
import { isProcessActionsGate } from './colleagueReviewDecision'
import { reviewMergeView } from './colleagueReviewMerge'
import type { ReviewMergeJob } from './colleagueReviewMergeTypes'
import { processOutsideWaitView } from './processOutsideWait'
import { processRunBadge } from './processView'
import { PROCESS_RUN_WORDS } from './processViewConstants'
import { ticketRunIndex, ticketRunState } from './ticketRunState'
import { TICKET_RUN_NAMES } from './ticketRunStateConstants'
import type { TicketRunState } from './ticketRunStateTypes'
import type {
  ReviewedTicket,
  ReviewRunWorkingView,
  TicketReviewRunCardKind,
} from './ticketReviewRunTypes'

type RunRow = Pick<ProcessRun, 'id' | 'status' | 'ticketReview'>

/**
 * The newest review run of a ticket still going, from runs newest first —
 * found by the ticket it reviews, never by a chat: a review run has no chat
 * of the ticket's. Pure.
 */
export function ticketReviewLiveRun<R extends RunRow>(
  runs: readonly R[],
  ticket: ReviewedTicket | undefined,
): R | undefined {
  if (!ticket) return undefined
  const key = ticket.ticketKey.toUpperCase()
  return runs.find(
    (run) =>
      run.ticketReview?.groupId === ticket.groupId &&
      run.ticketReview.ticketKey.toUpperCase() === key &&
      !PROCESS_RUN_TERMINAL_STATUSES.includes(run.status),
  )
}

/** The step a run works on now, from its plan. */
const currentStep = (run: Pick<ProcessRun, 'cursor' | 'plan'>) =>
  run.plan.steps.find((step) => step.id === run.cursor?.stepId)

/**
 * Which of its own cards a ticket's review run shows away from its page —
 * on the ticket's page: its approval, a push to approve, the reply it waits
 * for, each answered there as on the run's page, and its working card while
 * it works on a step. Any other stop is decided on the run's page. Pure.
 */
export function ticketReviewRunCardKind(run: ProcessRun): TicketReviewRunCardKind | undefined {
  if (!run.ticketReview) return undefined
  if (isReviewPushApproval(run)) return 'push'
  if (isProcessActionsGate(run)) return 'decision'
  if (processOutsideWaitView(run)) return 'outside'
  return run.status === 'running' && currentStep(run) ? 'working' : undefined
}

/**
 * A ticket's review run in one line, as the ticket's row says it, with the
 * run to open in its own project: what a place the run does not live in —
 * an inline review chat — links to it with. Pure.
 */
export function ticketReviewRunLine(
  run: ProcessRun,
  now: number,
  merge?: ReviewMergeJob,
): TicketRunState | undefined {
  const subject = run.ticketReview
  if (!subject) return undefined
  const key = subject.ticketKey.toUpperCase()
  return ticketRunState(
    { key },
    ticketRunIndex(subject.groupId, [run], []),
    now,
    merge ? { [key]: merge } : {},
  )
}

/** Whether a run's round's approve-and-merge is worth following: a review run, while it works. Pure. */
export function reviewRunFollowsMerge(run: Pick<ProcessRun, 'status' | 'ticketReview'>): boolean {
  return !!run.ticketReview && run.status === 'running'
}

/** When the run's pass at this round began: a merge from before it is an earlier round's. */
function passStart(run: ProcessRun): number {
  const iteration = run.cursor?.iteration
  const starts = run.ledger.filter((e) => e.iteration === iteration).map((e) => e.startedAt)
  return starts.length > 0 ? Math.min(...starts) : run.startedAt
}

/**
 * A review run's working card: the step it is on with its badge, and — once
 * this pass at the round approved and merged — that merge pull request by
 * pull request, staying as it ended while the run carries on. Pure.
 */
export function reviewRunWorkingView(
  run: ProcessRun,
  job: ReviewMergeJob | null | undefined,
  now: number,
): ReviewRunWorkingView {
  const ours =
    job && job.round === run.ticketReview?.round && Date.parse(job.startedAt) >= passStart(run)
  const view = ours ? reviewMergeView({ job, prs: [] }) : undefined
  return {
    name: TICKET_RUN_NAMES.review,
    step: currentStep(run)?.name ?? PROCESS_RUN_WORDS.starting,
    badge: processRunBadge(run, now),
    ...(view ? { merge: { prs: [], view, starting: false } } : {}),
  }
}
