import type { ReviewLandFailureSummary } from '../../../headless'
import { TONE_CHIP } from './signoff'

/**
 * Why a run's changes are not on a review branch: a warning when they could not
 * be committed, a quiet note when the branch already has every one of them.
 */
export function RunLandNotice({ summary }: { summary: ReviewLandFailureSummary }) {
  return (
    <div className={`rounded-md border px-2 py-1.5 text-[12px] ${TONE_CHIP[summary.tone]}`}>
      <div className="font-medium">{summary.title}</div>
      <div>{summary.message}</div>
    </div>
  )
}
