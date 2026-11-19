import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ProcessRun } from 'thefactory-tools/types'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { COLLEAGUE_REVIEWS_EVENT } from '../utils/colleagueReviewStartConstants'
import { reviewOfChat } from '../utils/colleagueReviewStart'
import type { ReviewFileUpload } from '../utils/colleagueReviewStartTypes'
import type { ReviewGateAnswer } from '../utils/colleagueReviewDecisionTypes'
import type { LaunchAgentPickMetadata } from '../utils/launchAgentPickTypes'
import { reviewChatLiveRun, reviewChatSlotKind } from '../utils/reviewChatSlot'
import type { ReviewChatSlotKind } from '../utils/reviewChatSlotTypes'
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
import { useProcessRun } from './useProcessRun'
import { useProcessRuns } from './useProcessRuns'
import { useReviewCommits } from './useReviewCommits'

const NO_GROUP = ''
const NO_KEYS: readonly string[] = []

export type UseReviewChatSlot = {
  /** What takes the composer's place now; nothing while the chat is no review's or nothing needs the person. */
  kind: ReviewChatSlotKind | undefined
  /** The review run holding the chat, while it needs the person. */
  run: ProcessRun | undefined
  /** The review run holding the chat, its card shown or not: what a typed message answers at its approval. */
  liveRun: ProcessRun | undefined
  /** Answer the run's approval from its card; `false` when refused. */
  answerGate: (answer: ReviewGateAnswer) => Promise<boolean>
  /** Start the round from the reply the run waited for; `false` when refused. */
  carryOn: () => Promise<boolean>
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
 * What a review chat (`review-<KEY>`) shows in its composer's place, live.
 * While a colleague review run holds the chat, the run's own card whenever
 * it needs the person — its approval, a push, a reply it waited for — so the
 * chat is never a dead end. In an inline review, the reply waiting to start
 * the next round, with what was pushed since the last round; Start begins it
 * inline from that offer at once, one round however often it is pressed, and
 * the card goes once the offer is started or settled elsewhere. Not now hides
 * it for this view.
 */
export function useReviewChatSlot(chatId: string | undefined): UseReviewChatSlot {
  const { token } = useAuth()
  const { ws, uploadChatFile } = useApi()
  const key = reviewOfChat(chatId)
  const groupId = key?.groupId
  const ticketKey = key?.ticketKey

  const { runs } = useProcessRuns()
  const live = key ? reviewChatLiveRun(runs, chatId) : undefined
  const runHook = useProcessRun(live?.id)
  const run = live ? (runHook.run ?? (live as ProcessRun)) : undefined

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
  const shownId = run ? `${run.id}:${run.park?.parkedAt ?? 0}` : waiting?.id
  const kind = reviewChatSlotKind(run, waiting !== undefined, live !== undefined)
  const shown = kind !== undefined && shownId !== hidden && !(kind === 'reply' && !reply)

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

  const answerGate = runHook.answerGate
  const resume = runHook.resume
  const carryOn = useCallback(() => resume('resolved'), [resume])
  const notNow = useCallback(() => setHidden(shownId), [shownId])

  return {
    kind: shown ? kind : undefined,
    run: shown && kind !== 'reply' ? run : undefined,
    liveRun: run,
    answerGate,
    carryOn,
    reply: shown && kind === 'reply' ? reply : undefined,
    starting: going !== undefined && going === waiting?.id,
    startError,
    start,
    notNow,
  }
}
