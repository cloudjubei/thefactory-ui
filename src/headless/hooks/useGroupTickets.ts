import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { reviewBoxOf, reviewBoxProblem, reviewBoxWithOffer } from '../utils/colleagueReviewStart'
import { REVIEW_OFFER_TEXT } from '../utils/colleagueReviewSourceConstants'
import type { TicketReviewOffer } from '../utils/colleagueReviewSourceTypes'
import { COLLEAGUE_REVIEWS_EVENT } from '../utils/colleagueReviewStartConstants'
import type {
  ColleagueReviewStarted,
  ReviewDraft,
  ReviewFileUpload,
  ReviewPasteBox,
} from '../utils/colleagueReviewStartTypes'
import { groupTicketStatuses, groupTicketsView } from '../utils/groupTickets'
import type {
  GroupTicketListName,
  GroupTicketsState,
  GroupTicketsView,
  TicketPlanStarted,
} from '../utils/groupTicketTypes'
import { GroupTicketsStore } from './groupTicketsStore'
import { colleagueReviewSourceStoreFor } from './useColleagueReviewSource'

const GROUP_STORIES_EVENT = 'groupStories:updated'

export type UseGroupTickets = {
  /** What the Tickets tab shows. */
  view: GroupTicketsView
  /** What is typed in the search box. */
  query: string
  setQuery: (query: string) => void
  /** Open a ticket's chat to talk it over; answers it, or `undefined` with why in the view. */
  discuss: (ticketKey: string) => Promise<TicketPlanStarted | undefined>
  /** Open a ticket's planning chat; answers it, or `undefined` with why in the view. */
  plan: (ticketKey: string) => Promise<TicketPlanStarted | undefined>
  loadMore: (name: GroupTicketListName) => Promise<void>
  refresh: () => Promise<void>
  /** The paste box, while it is open on a ticket. */
  reviewBox: ReviewPasteBox | undefined
  /**
   * Open the paste box on a ticket, with what was left in it last time — or,
   * with an update from Slack waiting on it, filled from that update.
   */
  openReview: (ticketKey: string) => void
  /** Dismiss the update from Slack waiting on a ticket: gone at once, back with why when refused. */
  dismissOffer: (ticketKey: string) => void
  /** Close the paste box; what it holds stays for the next time it opens on that ticket. */
  closeReview: () => void
  editReview: (draft: ReviewDraft) => void
  /**
   * Start the open box's round: the box closes at once while the row shows the
   * round starting, and opens again with the draft and why when it fails.
   * Answers the round's chat once it has started.
   */
  startReview: () => Promise<ColleagueReviewStarted | undefined>
}

/**
 * A store of a group's tickets kept current: `read` runs once there is a token, as
 * its group stories change, since a story linked to a ticket gives that ticket its
 * work, as its watched Slack thread brings or settles updates, and on a reconnect.
 * `groupId === undefined` idles.
 */
function useLiveTicketsStore(
  groupId: string | undefined,
  read: (store: GroupTicketsStore) => Promise<void>,
) {
  const { token } = useAuth()
  const { ws } = useApi()
  const store = useMemo(() => new GroupTicketsStore(groupId ?? ''), [groupId])
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState)

  useEffect(() => {
    if (token && groupId) void read(store)
  }, [token, groupId, store, read])

  useEffect(() => {
    if (!token || !groupId) return
    const offUpdate = ws.on(GROUP_STORIES_EVENT, (data: unknown) => {
      if ((data as { groupId?: string })?.groupId === groupId) void read(store)
    })
    const offReview = ws.on(COLLEAGUE_REVIEWS_EVENT, (data: unknown) => {
      const update = data as { groupId?: string; ticketKey?: string } | undefined
      if (update?.groupId !== groupId) return
      if (update.ticketKey) store.markReviewOpen(update.ticketKey)
      else void read(store)
    })
    const offReconnect = ws.onReconnect(() => void read(store))
    return () => {
      offUpdate()
      offReview()
      offReconnect()
    }
  }, [ws, token, groupId, store, read])

  return { store, state }
}

const readAll = (store: GroupTicketsStore) => store.refresh()
const readMine = (store: GroupTicketsStore) => store.refreshMine()

/** The Tickets tab's tickets: the person's, the rest of the sprint, and a search. */
export function useGroupTickets(groupId: string): UseGroupTickets {
  const { store, state } = useLiveTicketsStore(groupId, readAll)
  const [query, setQuery] = useState('')

  useEffect(() => {
    store.typed(query)
    return store.stopTyping
  }, [query, store])

  const review = useReviewPasteBox(groupId, store, state)

  return useMemo(
    () => ({
      view: groupTicketsView(state),
      query,
      setQuery,
      discuss: store.discuss,
      plan: store.plan,
      loadMore: store.loadMore,
      refresh: store.refresh,
      ...review,
    }),
    [state, store, query, review],
  )
}

const EMPTY_DRAFT: ReviewDraft = { text: '', files: [] }

function ticketsOf(state: GroupTicketsState) {
  return [state.mine, state.sprint, state.search].flatMap((section) => section.list?.tickets ?? [])
}

function isReviewOpen(state: GroupTicketsState, ticketKey: string): boolean {
  return ticketsOf(state).some((t) => t.key === ticketKey && t.reviewOpen)
}

function offerOn(state: GroupTicketsState, ticketKey: string): TicketReviewOffer | undefined {
  return ticketsOf(state).find((t) => t.key === ticketKey && t.reviewOffer)?.reviewOffer
}

/**
 * The paste box over a store: one box at a time, each ticket's draft kept while
 * it is closed. A ticket an update from Slack waits on opens on that update at
 * once, filled as soon as it is read.
 */
function useReviewPasteBox(groupId: string, store: GroupTicketsStore, state: GroupTicketsState) {
  const { uploadChatFile, ws } = useApi()
  const source = colleagueReviewSourceStoreFor(ws)
  const [box, setBox] = useState<ReviewPasteBox | undefined>()
  const kept = useRef(new Map<string, ReviewPasteBox>())
  const stateRef = useRef(state)
  stateRef.current = state
  const boxRef = useRef(box)
  boxRef.current = box

  const upload = useCallback<ReviewFileUpload>(
    (context, file) => uploadChatFile(context, file),
    [uploadChatFile],
  )

  const fillFromOffer = useCallback(
    async (ticketKey: string, offerId: string) => {
      await store.loadOffers()
      const offer = store.getState().offers[offerId]
      setBox((open) => {
        if (open?.ticketKey !== ticketKey || open.offer?.id !== offerId) return open
        if (offer) return reviewBoxWithOffer(open, offer)
        if (open.offer.text !== undefined) return open
        return { ...open, offer: { ...open.offer, text: '' }, error: REVIEW_OFFER_TEXT.readFailed }
      })
    },
    [store],
  )

  const openReview = useCallback(
    (ticketKey: string) => {
      const now = stateRef.current
      if (now.reviewing[ticketKey]) return
      const nextRound = isReviewOpen(now, ticketKey)
      const held = kept.current.get(ticketKey)
      const offer = offerOn(now, ticketKey)
      if (offer && held?.offer?.id !== offer.id) {
        const whole = now.offers[offer.id]
        setBox(reviewBoxOf(ticketKey, nextRound, offer, whole))
        if (!whole) void fillFromOffer(ticketKey, offer.id)
        return
      }
      setBox({ ...(held ?? { ticketKey, draft: EMPTY_DRAFT }), nextRound })
    },
    [fillFromOffer],
  )

  const dismissOffer = useCallback(
    (ticketKey: string) => {
      const offer = offerOn(stateRef.current, ticketKey)
      if (offer) void source.settleOffer(groupId, offer.id, store.dismissOffer(ticketKey))
    },
    [groupId, source, store],
  )

  const closeReview = useCallback(() => {
    const open = boxRef.current
    if (open) kept.current.set(open.ticketKey, open)
    setBox(undefined)
  }, [])

  const editReview = useCallback((draft: ReviewDraft) => {
    setBox((open) => (open ? { ...open, draft } : open))
  }, [])

  const startReview = useCallback(async () => {
    const open = boxRef.current
    if (!open || reviewBoxProblem(open)) return undefined
    kept.current.delete(open.ticketKey)
    setBox(undefined)
    const going = store.review(open.ticketKey, open.draft, upload, open.offer)
    if (open.offer) {
      void source.settleOffer(
        groupId,
        open.offer.id,
        going.then((o) => o?.ok === true),
      )
    }
    const outcome = await going
    if (!outcome) return undefined
    if (outcome.ok) return outcome.started
    const failed: ReviewPasteBox = { ...open, draft: outcome.draft, error: outcome.error }
    if (boxRef.current) kept.current.set(open.ticketKey, failed)
    else setBox(failed)
    return undefined
  }, [groupId, source, store, upload])

  return useMemo(
    () => ({ reviewBox: box, openReview, dismissOffer, closeReview, editReview, startReview }),
    [box, openReview, dismissOffer, closeReview, editReview, startReview],
  )
}

/**
 * Each of the person's sprint tickets' status by key, for a group story's chip.
 * `groupId === undefined` idles, for a page whose story has no ticket.
 */
export function useGroupTicketStatuses(groupId: string | undefined): Record<string, string> {
  const { state } = useLiveTicketsStore(groupId, readMine)
  return useMemo(() => groupTicketStatuses(state.mine.list?.tickets), [state.mine.list])
}
