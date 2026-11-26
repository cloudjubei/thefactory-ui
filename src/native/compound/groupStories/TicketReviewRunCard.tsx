import { processOutsideWaitView, type UseTicketReviewRun } from '../../../headless'
import { RunPushApprovalCard, RunReviewDecisionCard } from '../chat/ColleagueReviewDecisionCard'
import RunWorkingCard from '../chat/RunWorkingCard'
import RunOutsideWaitCard from '../process/RunOutsideWaitCard'

export type TicketReviewRunCardProps = {
  reviewRun: UseTicketReviewRun
}

/**
 * Native peer of web's `TicketReviewRunCard`: a ticket's review run's own
 * card on the ticket's page — its approval, a push to approve, the reply it
 * waits for, each answered here as on the run's page, or its working card.
 */
export default function TicketReviewRunCard({ reviewRun }: TicketReviewRunCardProps) {
  const { run, kind, working } = reviewRun
  if (!run || !kind) return null
  if (kind === 'decision') {
    return <RunReviewDecisionCard run={run} embedded onAnswer={reviewRun.answerGate} />
  }
  if (kind === 'push') {
    return <RunPushApprovalCard run={run} embedded onAnswer={reviewRun.answerGate} />
  }
  if (kind === 'outside') {
    const view = processOutsideWaitView(run)
    return view ? <RunOutsideWaitCard view={view} onCarryOn={reviewRun.carryOn} /> : null
  }
  return working ? <RunWorkingCard view={working} /> : null
}
