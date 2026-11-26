import type { ColleagueReview } from 'thefactory-tools/types'
import type {
  ColleagueReviewStartBody,
  ColleagueReviewStarted,
} from '../utils/colleagueReviewStartTypes'
import type { ReviewCloseAnswer, ReviewCloseBody } from '../utils/colleagueReviewCloseTypes'
import type { ReviewCommits } from '../utils/reviewCommitsTypes'
import { errorStatus } from './errorMessage'
import { client } from './generated/client.gen'

const reviewUrl = (groupId: string, ticketKey: string): string =>
  `/api/v1/groups/${encodeURIComponent(groupId)}/tickets/${encodeURIComponent(ticketKey)}/review`

const JSON_HEADERS = { 'Content-Type': 'application/json' }

/**
 * Start the next round of a ticket's review with a colleague's pasted update and
 * the paths of its files, already uploaded to the review's chat. Written by hand
 * until the SDK is generated from these routes.
 */
export async function startColleagueReview(
  groupId: string,
  ticketKey: string,
  body: ColleagueReviewStartBody,
): Promise<ColleagueReviewStarted> {
  const { data } = await client.post({
    url: reviewUrl(groupId, ticketKey),
    body,
    headers: JSON_HEADERS,
    throwOnError: true,
  })
  return data as ColleagueReviewStarted
}

/** A ticket's review, or `null` when it has none yet. */
export async function readColleagueReview(
  groupId: string,
  ticketKey: string,
): Promise<ColleagueReview | null> {
  try {
    const { data } = await client.get({ url: reviewUrl(groupId, ticketKey), throwOnError: true })
    return data as ColleagueReview
  } catch (err) {
    if (errorStatus(err) === 404) return null
    throw err
  }
}

/** A ticket's pull requests against the heads its review's last round reviewed. */
export async function readColleagueReviewCommits(
  groupId: string,
  ticketKey: string,
): Promise<ReviewCommits> {
  const { data } = await client.get({
    url: `${reviewUrl(groupId, ticketKey)}/commits`,
    throwOnError: true,
  })
  return data as ReviewCommits
}

/** A group's reviews, most recently changed first. */
export async function listColleagueReviews(groupId: string): Promise<ColleagueReview[]> {
  const { data } = await client.get({
    url: `/api/v1/groups/${encodeURIComponent(groupId)}/reviews`,
    throwOnError: true,
  })
  return (data as { reviews: ColleagueReview[] }).reviews
}

async function postNote(url: string, note: string | undefined): Promise<ColleagueReview> {
  const { data } = await client.post({
    url,
    body: note ? { note } : {},
    headers: JSON_HEADERS,
    throwOnError: true,
  })
  return data as ColleagueReview
}

/** The person drops a finding: no later round has to answer it. */
export function dropColleagueReviewFinding(
  groupId: string,
  ticketKey: string,
  findingId: string,
  note?: string,
): Promise<ColleagueReview> {
  return postNote(
    `${reviewUrl(groupId, ticketKey)}/findings/${encodeURIComponent(findingId)}/drop`,
    note,
  )
}

/** The person marks a decision or approval the work waited on as given. */
export function markColleagueReviewWaitingGiven(
  groupId: string,
  ticketKey: string,
  waitingOnId: string,
  note?: string,
): Promise<ColleagueReview> {
  return postNote(
    `${reviewUrl(groupId, ticketKey)}/waiting-on/${encodeURIComponent(waitingOnId)}/given`,
    note,
  )
}

/**
 * Close a ticket's review, as the person chose in its confirm: `resolved`
 * keeps it, marked closed; `remove` deletes it with its chat and offers.
 * Its run ends either way, and nothing is posted. Closing it again answers
 * the same.
 */
export async function closeColleagueReview(
  groupId: string,
  ticketKey: string,
  body: ReviewCloseBody,
): Promise<ReviewCloseAnswer> {
  const { data } = await client.post({
    url: `${reviewUrl(groupId, ticketKey)}/close`,
    body,
    headers: JSON_HEADERS,
    throwOnError: true,
  })
  return data as ReviewCloseAnswer
}
