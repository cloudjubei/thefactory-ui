import type { ColleagueReview } from 'thefactory-tools/types'
import type {
  ReviewOffer,
  ReviewReplyPost,
  ReviewSettingsChange,
  ReviewSourceStatus,
  ReviewThreadWatch,
} from '../utils/colleagueReviewSourceTypes'
import {
  clearColleagueReviewSource as clearSource,
  dismissColleagueReviewOffer as dismissOffer,
  getColleagueReviewSource as getSource,
  listColleagueReviewOffers as listOffers,
  postColleagueReviewReply as postReply,
  setColleagueReviewSource as setSource,
  setColleagueReviewSourceSettings as setSettings,
} from './generated'

/** The group's watched Slack thread, how it stands, and what it brought. */
export async function readColleagueReviewSource(groupId: string): Promise<ReviewSourceStatus> {
  const { data } = await getSource({ path: { groupId }, throwOnError: true })
  return data
}

/** Watch the thread a Slack message link is in, read through one of the person's Slack connections. */
export async function watchColleagueReviewThread(
  groupId: string,
  watch: ReviewThreadWatch,
): Promise<ReviewSourceStatus> {
  const { data } = await setSource({ path: { groupId }, body: watch, throwOnError: true })
  return data
}

/** Stop watching the group's thread; the updates it brought stay. */
export async function clearColleagueReviewThread(groupId: string): Promise<ReviewSourceStatus> {
  const { data } = await clearSource({ path: { groupId }, throwOnError: true })
  return data
}

/** Change the group's review settings: what is left out stays, an empty value clears. Answers the whole status. */
export async function setColleagueReviewSettings(
  groupId: string,
  change: ReviewSettingsChange,
): Promise<ReviewSourceStatus> {
  const { data } = await setSettings({ path: { groupId }, body: change, throwOnError: true })
  return data
}

/** The updates waiting for the person, newest first. */
export async function listWaitingReviewOffers(groupId: string): Promise<ReviewOffer[]> {
  const { data } = await listOffers({
    path: { groupId },
    query: { state: 'new' },
    throwOnError: true,
  })
  return data.offers
}

/** The person dismissed an update; dismissing it again changes nothing. */
export async function dismissReviewOffer(groupId: string, offerId: string): Promise<ReviewOffer> {
  const { data } = await dismissOffer({ path: { groupId, offerId }, throwOnError: true })
  return data
}

/**
 * Post a round's reply in the watched thread as the person: `again` posts one
 * already posted, `text` the person's edit in place of the drafted reply.
 */
export async function postColleagueReviewReply(
  groupId: string,
  ticketKey: string,
  round: number,
  post: ReviewReplyPost,
): Promise<ColleagueReview> {
  const { data } = await postReply({
    path: { groupId, ticketKey, round },
    body: {
      ...(post.again ? { again: true } : {}),
      ...(post.text !== undefined ? { text: post.text } : {}),
    },
    throwOnError: true,
  })
  return data as ColleagueReview
}
