import { useCallback, useMemo } from 'react'
import { latestReviewRound } from 'thefactory-tools/utils'
import { useChatActions } from '../contexts/ChatActionsContext'
import {
  colleagueReviewCallKey,
  colleagueReviewCallRefusal,
  colleagueReviewCallRound,
  colleagueReviewCardView,
} from '../utils/colleagueReviewCard'
import type {
  ColleagueReviewCardView,
  ColleagueReviewTool,
} from '../utils/colleagueReviewCardTypes'
import { reviewCardMerge, reviewMergeStartBody } from '../utils/colleagueReviewMerge'
import type { ReviewCardMerge } from '../utils/colleagueReviewMergeTypes'
import { reviewThreadWorks } from '../utils/colleagueReviewSource'
import { useColleagueReview } from './useColleagueReview'
import { useColleagueReviewMerge } from './useColleagueReviewMerge'
import { useColleagueReviewSource } from './useColleagueReviewSource'

export type UseColleagueReviewCall = {
  view: ColleagueReviewCardView
  dropFinding: (findingId: string, note?: string) => void
  markGiven: (waitingOnId: string, note?: string) => void
  /** Post a round's reply in the group's watched thread; `again` posts it a second time, `text` is the person's edit of it. */
  postReply: (round: number, again: boolean, text?: string) => void
  /** Approve & merge on the row's round, while it is the latest and recorded. */
  merge: ReviewCardMerge | undefined
  /** Approve the round's pull requests and merge them, with the Slack line typed; `override` merges a round that asked for changes. */
  approveAndMerge: (slackText: string, override: boolean) => void
  /** A merge stopped on a pull request's base: resolve it here. */
  resolveHere: () => void
  /** A merge stopped on a pull request's base: ask the developer, with the ask as the person edited it. */
  askDeveloper: (text: string) => void
  /** The review this row offers to close: on the row that recorded its latest round. */
  closeFor: { groupId: string; ticketKey: string } | undefined
}

/**
 * A review tool row's card: the review the call was about, live, at the round
 * it was about. The review is found from the call's answer, its arguments, or
 * the review chat the row is in. Post in thread is offered while the group
 * watches a working Slack thread; Approve & merge on the latest recorded
 * round, followed live.
 */
export function useColleagueReviewCall(call: {
  tool: ColleagueReviewTool
  args?: unknown
  result?: unknown
  resultType?: string | undefined
}): UseColleagueReviewCall {
  const chat = useChatActions()
  const { tool, args, result, resultType } = call
  const key = colleagueReviewCallKey({
    args,
    result,
    chatContextId: chat?.chatContextId,
    groupId: chat?.groupId,
  })
  const live = useColleagueReview(key?.groupId, key?.ticketKey)
  const thread = reviewThreadWorks(useColleagueReviewSource(key?.groupId).source.status)
  const ticketKey = key?.ticketKey
  const known = key !== undefined
  const view = useMemo(() => {
    const round = colleagueReviewCallRound(tool, args, result)
    const refusal = colleagueReviewCallRefusal(result, resultType)
    return colleagueReviewCardView({
      tool,
      ticketKey,
      review: known ? live.review : null,
      ...(live.readError ? { readError: live.readError } : {}),
      ...(round !== undefined ? { round } : {}),
      ...(refusal ? { refusal } : {}),
      pending: live.pending,
      ...(live.actionError ? { actionError: live.actionError } : {}),
      thread,
    })
  }, [tool, args, result, resultType, ticketKey, known, live, thread])
  const shownRound = view.kind === 'review' ? view.round.n : undefined
  const {
    merge: mergeSnapshot,
    start,
    resolveHere,
    askDeveloper,
  } = useColleagueReviewMerge(key?.groupId, key?.ticketKey)
  const merge = useMemo(
    () =>
      shownRound !== undefined && known
        ? reviewCardMerge(live.review, shownRound, mergeSnapshot)
        : undefined,
    [shownRound, known, live.review, mergeSnapshot],
  )
  const approveAndMerge = useCallback(
    (slackText: string, override: boolean) => {
      if (shownRound !== undefined) start(reviewMergeStartBody(shownRound, slackText, override))
    },
    [shownRound, start],
  )
  const latestRound = live.review ? latestReviewRound(live.review) : undefined
  const closeFor = useMemo(
    () => (key && tool === 'record' && shownRound === latestRound ? key : undefined),
    [key, tool, shownRound, latestRound],
  )
  return {
    view,
    closeFor,
    dropFinding: live.dropFinding,
    markGiven: live.markGiven,
    postReply: live.postReply,
    merge,
    approveAndMerge,
    resolveHere,
    askDeveloper,
  }
}
