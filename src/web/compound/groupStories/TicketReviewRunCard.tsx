import { processOutsideWaitView, type UseTicketReviewRun } from '../../../headless'
import { RunPushApprovalCard, RunReviewDecisionCard } from '../chat/ColleagueReviewDecisionCard'
import RunWorkingCard from '../chat/RunWorkingCard'
import RunOutsideWaitCard from '../process/RunOutsideWaitCard'

export type TicketReviewRunCardProps = {
  reviewRun: UseTicketReviewRun
}

/**
 * A ticket's review run's own card, on the ticket's page under the run: its
 * approval with the reply to edit, a push to approve, the reply it waits
 * for — each answered here exactly as on the run's page — or its working
 * card with the round's merge as it goes. Nothing at any other stop: the
 * run's page decides those.
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
    return view ? <RunOutsideWaitCard view={view} embedded onCarryOn={reviewRun.carryOn} /> : null
  }
  return working ? <RunWorkingCard view={working} /> : null
}
