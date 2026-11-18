import { useMemo } from 'react'
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
import { reviewThreadWorks } from '../utils/colleagueReviewSource'
import { useColleagueReview } from './useColleagueReview'
import { useColleagueReviewSource } from './useColleagueReviewSource'

export type UseColleagueReviewCall = {
  view: ColleagueReviewCardView
  dropFinding: (findingId: string, note?: string) => void
  markGiven: (waitingOnId: string, note?: string) => void
  /** Post a round's reply in the group's watched thread; `again` posts it a second time, `text` is the person's edit of it. */
  postReply: (round: number, again: boolean, text?: string) => void
}

/**
 * A review tool row's card: the review the call was about, live, at the round
 * it was about. The review is found from the call's answer, its arguments, or
 * the review chat the row is in. Post in thread is offered while the group
 * watches a working Slack thread.
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
  return {
    view,
    dropFinding: live.dropFinding,
    markGiven: live.markGiven,
    postReply: live.postReply,
  }
}
