import type { ProcessRun } from 'thefactory-tools/types'

import {
  reviewRunFollowsMerge,
  reviewRunWorkingView,
  useColleagueReviewMerge,
} from '../../../headless'
import RunWorkingCard from '../chat/RunWorkingCard'

export type RunReviewMergeProgressProps = {
  run: ProcessRun
  className?: string
}

/**
 * A colleague review run's approve-and-merge on the run's own page, while
 * the run works: pull request by pull request as it goes, staying as it
 * ended while the run carries on. Nothing before this pass at the round
 * started a merge, and nothing for any other run.
 */
export default function RunReviewMergeProgress({
  run,
  className = 'mx-3 mt-3',
}: RunReviewMergeProgressProps) {
  const follows = reviewRunFollowsMerge(run)
  const { merge } = useColleagueReviewMerge(
    follows ? run.ticketReview?.groupId : undefined,
    follows ? run.ticketReview?.ticketKey : undefined,
  )
  if (!follows) return null
  const view = reviewRunWorkingView(run, merge.job, Date.now())
  if (!view.merge) return null
  return (
    <div
      className={`${className} rounded-xl border border-(--border-subtle) bg-(--surface-raised) px-4 py-3 sm:px-5`}
    >
      <RunWorkingCard view={view} />
    </div>
  )
}
