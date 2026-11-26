import { useCallback, useMemo } from 'react'
import type { ColleagueReviewCloseOutcome } from 'thefactory-tools/types'
import { useApi } from '../api/ApiContext'
import { reviewCloseView } from '../utils/colleagueReviewClose'
import type { ReviewCloseView } from '../utils/colleagueReviewCloseTypes'
import { colleagueReviewKey } from './colleagueReviewStore'
import { colleagueReviewStoreFor, useColleagueReview } from './useColleagueReview'
import { groupTicketsStoreFor } from './useGroupTickets'

export type UseColleagueReviewClose = {
  /** Where the review's closing stands: nothing to close, the action, resolved, or removed. */
  view: ReviewCloseView
  /**
   * Close the review as the person chose in its confirm. Shown at once on its
   * cards, its ticket's row and page; put back with why when the backend
   * refuses. Pressed again while one closing goes, it changes nothing.
   */
  close: (outcome: ColleagueReviewCloseOutcome, note?: string) => void
}

/**
 * Closing a ticket's review, for every place that offers it: the ticket's
 * page, its review run's page and the review's card share the one review and
 * the group's one tickets store, so a press on any shows on all. Either id
 * undefined idles.
 */
export function useColleagueReviewClose(
  groupId: string | undefined,
  ticketKey: string | undefined,
): UseColleagueReviewClose {
  const { ws, client } = useApi()
  const live = useColleagueReview(groupId, ticketKey)
  const store = colleagueReviewStoreFor(ws)

  const close = useCallback(
    (outcome: ColleagueReviewCloseOutcome, note?: string) => {
      if (!groupId || !ticketKey) return
      const tickets = groupTicketsStoreFor(groupId)
      const undo = tickets.markReviewClosed(ticketKey)
      void store
        .close(colleagueReviewKey(groupId, ticketKey), outcome, note, client)
        .then((closed) => {
          if (closed === false) undo()
        })
    },
    [store, groupId, ticketKey, client],
  )

  const { review, pending, actionError } = live
  const view = useMemo(
    () => reviewCloseView({ review, closing: pending.closing, error: actionError }, Date.now()),
    [review, pending.closing, actionError],
  )
  return useMemo(() => ({ view, close }), [view, close])
}
