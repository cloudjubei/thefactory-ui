import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { COLLEAGUE_REVIEWS_EVENT } from '../utils/colleagueReviewStartConstants'
import { reviewOfChat } from '../utils/colleagueReviewStart'
import type { ReviewFileUpload } from '../utils/colleagueReviewStartTypes'
import type { LaunchAgentPickMetadata } from '../utils/launchAgentPickTypes'
import { reviewChatSlotKind } from '../utils/reviewChatSlot'
import type { ReviewChatSlotKind } from '../utils/reviewChatSlotTypes'
import { ticketReviewRunLine } from '../utils/ticketReviewRun'
import type { TicketRunState } from '../utils/ticketRunStateTypes'
import {
  reviewReplyBoxOffer,
  reviewReplySources,
  reviewReplyView,
  waitingReviewReply,
} from '../utils/reviewReply'
import { REVIEW_REPLY_TEXT } from '../utils/reviewReplyConstants'
import type { ReviewReplyView } from '../utils/reviewReplyTypes'
import { colleagueReviewSourceStoreFor } from './useColleagueReviewSource'
import { useColleagueReview } from './useColleagueReview'
import { groupTicketsStoreFor } from './useGroupTickets'
import { useReviewCommits } from './useReviewCommits'
import { useTicketReviewRun } from './useTicketReviewRun'

const NO_GROUP = ''
const NO_KEYS: readonly string[] = []

export type UseReviewChatSlot = {
  /** What shows by the composer now; nothing while the chat is no review's or nothing concerns the person. */
  kind: ReviewChatSlotKind | undefined
  /** The ticket's review run still going, in one line with the run to open: the run is never in this chat. */
  runLine: TicketRunState | undefined
  /** The reply waiting to start an inline review's next round. */
  reply: ReviewReplyView | undefined
  /** The round is starting: the card says so at once, a repeat press does nothing. */
  starting: boolean
  /** Why the round did not start. */
  startError: string | undefined
  /** Start the next round inline from the reply, on the agent picked. */
  start: (agent: LaunchAgentPickMetadata) => void
  /** Hide the card for this view; the composer comes back. */
  notNow: () => void
}

/**
 * What an inline review chat (`review-<KEY>`) shows by its composer, live. A
 * review run never works in this chat — it has its own, on its page — so
 * while the ticket has one going, found by the ticket, the chat only points
 * to it in one line, above the composer, which stays. With no run, the reply
 * waiting to start the next round takes the composer's place, with what was
 * pushed since the last round; Start begins it inline from that offer at
 * once, one round however often it is pressed, and the card goes once the
 * offer is started or settled elsewhere. Not now hides it for this view.
 */
export function useReviewChatSlot(chatId: string | undefined): UseReviewChatSlot {
  const { token } = useAuth()
  const { ws, uploadChatFile } = useApi()
  const key = reviewOfChat(chatId)
  const groupId = key?.groupId
  const ticketKey = key?.ticketKey

  const { run, merge } = useTicketReviewRun(groupId, ticketKey)
  const runLine = useMemo(
    () => (run ? ticketReviewRunLine(run, Date.now(), merge ?? undefined) : undefined),
    [run, merge],
  )

  const store = groupTicketsStoreFor(groupId ?? NO_GROUP)
  const tickets = useSyncExternalStore(store.subscribe, store.getState, store.getState)
  useEffect(() => {
    if (!token || !groupId) return
    void store.loadOffers()
    const offReview = ws.on(COLLEAGUE_REVIEWS_EVENT, (data: unknown) => {
      if ((data as { groupId?: string } | undefined)?.groupId === groupId) void store.loadOffers()
    })
    const offReconnect = ws.onReconnect(() => void store.loadOffers())
    return () => {
      offReview()
      offReconnect()
    }
  }, [token, groupId, store, ws])

  const waiting = ticketKey
    ? waitingReviewReply(reviewReplySources(tickets.offers, ticketKey))
    : undefined
  const review = useColleagueReview(waiting ? groupId : undefined, ticketKey).review
  const commitsKeys = useMemo(
    () => (waiting && ticketKey ? [ticketKey] : NO_KEYS),
    [waiting, ticketKey],
  )
  const commits = useReviewCommits(groupId, commitsKeys)[ticketKey ?? '']
  const latestRound = review?.rounds.length ?? 0
  const reply = useMemo(
    () => (waiting ? reviewReplyView(waiting, latestRound, Date.now(), commits) : undefined),
    [waiting, latestRound, commits],
  )

  const [hidden, setHidden] = useState<string | undefined>()
  const [going, setGoing] = useState<string | undefined>()
  const [startError, setStartError] = useState<string | undefined>()
  const kind = reviewChatSlotKind(run !== undefined, waiting !== undefined)
  const shown =
    kind === 'run-link'
      ? runLine !== undefined
      : kind === 'reply' && waiting?.id !== hidden && reply !== undefined

  const upload = useCallback<ReviewFileUpload>(
    (context, file) => uploadChatFile(context, file),
    [uploadChatFile],
  )
  const start = useCallback(
    (agent: LaunchAgentPickMetadata) => {
      const offerId = waiting?.id
      const offer = offerId ? tickets.offers[offerId] : undefined
      if (!groupId || !ticketKey || !offer || going === offer.id) return
      setGoing(offer.id)
      setStartError(undefined)
      const outcome = store.review(
        ticketKey,
        { text: offer.text, files: [] },
        upload,
        reviewReplyBoxOffer(offer),
        'inline',
        agent,
      )
      void colleagueReviewSourceStoreFor(ws).settleOffer(
        groupId,
        offer.id,
        outcome.then((o) => o?.ok === true),
      )
      void outcome.then((o) => {
        if (o?.ok === true) {
          setHidden(offer.id)
          void store.loadOffers()
          return
        }
        if (o) setStartError(o.error || REVIEW_REPLY_TEXT.failed)
        setGoing(undefined)
      })
    },
    [waiting, tickets.offers, groupId, ticketKey, going, store, upload, ws],
  )

  const notNow = useCallback(() => setHidden(waiting?.id), [waiting?.id])

  return {
    kind: shown ? kind : undefined,
    runLine: shown && kind === 'run-link' ? runLine : undefined,
    reply: shown && kind === 'reply' ? reply : undefined,
    starting: going !== undefined && going === waiting?.id,
    startError,
    start,
    notNow,
  }
}
