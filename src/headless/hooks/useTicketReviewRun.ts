import { useCallback, useMemo } from 'react'
import type { ProcessRun } from 'thefactory-tools/types'
import type { ReviewGateAnswer } from '../utils/colleagueReviewDecisionTypes'
import type { ReviewMergeJob } from '../utils/colleagueReviewMergeTypes'
import {
  reviewRunFollowsMerge,
  reviewRunWorkingView,
  ticketReviewLiveRun,
  ticketReviewRunCardKind,
} from '../utils/ticketReviewRun'
import type { ReviewRunWorkingView, TicketReviewRunCardKind } from '../utils/ticketReviewRunTypes'
import { useColleagueReviewMerge } from './useColleagueReviewMerge'
import { useProcessRun } from './useProcessRun'
import { useProcessRuns } from './useProcessRuns'

export type UseTicketReviewRun = {
  /** The ticket's review run still going, kept live. */
  run: ProcessRun | undefined
  /** Which of the run's own cards shows away from its page; nothing while its page decides the rest. */
  kind: TicketReviewRunCardKind | undefined
  /** While the run works: its working card — the step it is on, and its round's merge as it goes. */
  working: ReviewRunWorkingView | undefined
  /** The round's approve-and-merge, while the run works. */
  merge: ReviewMergeJob | null | undefined
  /** Answer the run's approval from its card; `false` when refused. */
  answerGate: (answer: ReviewGateAnswer) => Promise<boolean>
  /** Start the round from the reply the run waited for; `false` when refused. */
  carryOn: () => Promise<boolean>
}

/**
 * A ticket's colleague review run still going, live — found by the ticket it
 * reviews, since a review run holds no chat of the ticket's — with the one
 * of its own cards a place away from its page shows: its approval, a push, a
 * reply it waited for, each answered there exactly as on the run's page, and
 * its working card with its round's merge followed pull request by pull
 * request.
 */
export function useTicketReviewRun(
  groupId: string | undefined,
  ticketKey: string | undefined,
): UseTicketReviewRun {
  const { runs } = useProcessRuns()
  const live = groupId && ticketKey ? ticketReviewLiveRun(runs, { groupId, ticketKey }) : undefined
  const runHook = useProcessRun(live?.id)
  const run = live ? (runHook.run ?? (live as ProcessRun)) : undefined
  const kind = run ? ticketReviewRunCardKind(run) : undefined
  const works = !!run && reviewRunFollowsMerge(run)
  const merge = useColleagueReviewMerge(works ? groupId : undefined, works ? ticketKey : undefined)
    .merge.job
  const working = useMemo(
    () => (kind === 'working' && run ? reviewRunWorkingView(run, merge, Date.now()) : undefined),
    [kind, run, merge],
  )
  const answerGate = runHook.answerGate
  const resume = runHook.resume
  const carryOn = useCallback(() => resume('resolved'), [resume])
  return { run, kind, working, merge: works ? merge : undefined, answerGate, carryOn }
}
