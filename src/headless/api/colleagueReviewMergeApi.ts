import type { ReviewMergeJob, ReviewMergeStart } from '../utils/colleagueReviewMergeTypes'
import { errorStatus } from './errorMessage'
import {
  approveAndMergeColleagueReview as approveAndMerge,
  getColleagueReviewMerge as getMerge,
} from './generated'

/** A ticket review's approve-and-merge, or `null` when none was started. */
export async function readColleagueReviewMerge(
  groupId: string,
  ticketKey: string,
): Promise<ReviewMergeJob | null> {
  try {
    const { data } = await getMerge({ path: { groupId, ticketKey }, throwOnError: true })
    return data
  } catch (err) {
    if (errorStatus(err) === 404) return null
    throw err
  }
}

/**
 * Approve a round's pull requests and merge them, the backend's first, then
 * post the Slack line in the update's thread. 409 when the round asked for
 * changes, unless `override`.
 */
export async function startColleagueReviewMerge(
  groupId: string,
  ticketKey: string,
  body: ReviewMergeStart,
): Promise<ReviewMergeJob> {
  const { data } = await approveAndMerge({ path: { groupId, ticketKey }, body, throwOnError: true })
  return data
}
