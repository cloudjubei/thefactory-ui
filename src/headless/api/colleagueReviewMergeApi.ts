import type { ProcessDecisionClient } from 'thefactory-tools/types'
import type { ReviewMergeJob, ReviewMergeStart } from '../utils/colleagueReviewMergeTypes'
import { errorStatus } from './errorMessage'
import {
  approveAndMergeColleagueReview as approveAndMerge,
  askColleagueReviewDeveloper as askDeveloper,
  getColleagueReviewMerge as getMerge,
  resolveColleagueReviewMergeHere as resolveHere,
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

/** Resolve a merge stopped on a pull request's base here: the ticket's review run brings the base in, asks before pushing, then merges. */
export async function resolveColleagueReviewMergeHere(
  groupId: string,
  ticketKey: string,
  decidedVia: ProcessDecisionClient,
): Promise<ReviewMergeJob> {
  const { data } = await resolveHere({
    path: { groupId, ticketKey },
    body: { decidedVia },
    throwOnError: true,
  })
  return data
}

/** Ask the developer, in the update's thread, to bring the base in: the ask as the person edited it. */
export async function askColleagueReviewDeveloper(
  groupId: string,
  ticketKey: string,
  text: string,
  decidedVia: ProcessDecisionClient,
): Promise<ReviewMergeJob> {
  const { data } = await askDeveloper({
    path: { groupId, ticketKey },
    body: { text, decidedVia },
    throwOnError: true,
  })
  return data
}
