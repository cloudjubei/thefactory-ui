import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import {
  reviewBoxOf,
  reviewBoxProblem,
  reviewBoxWithOffer,
  reviewStartMode,
} from '../utils/colleagueReviewStart'
import { REVIEW_OFFER_TEXT } from '../utils/colleagueReviewSourceConstants'
import type { TicketReviewOffer } from '../utils/colleagueReviewSourceTypes'
import { COLLEAGUE_REVIEWS_EVENT } from '../utils/colleagueReviewStartConstants'
import type {
  ColleagueReviewMode,
  ColleagueReviewStarted,
  ReviewDraft,
  ReviewFileUpload,
  ReviewPasteBox,
} from '../utils/colleagueReviewStartTypes'
import { groupTicketStatuses, groupTicketsView, reviewOpenTicketKeys } from '../utils/groupTickets'
import type { LaunchAgentPickMetadata } from '../utils/launchAgentPickTypes'
import type {
  GroupTicketListName,
  GroupTicketsState,
  GroupTicketsView,
  TicketPlanStarted,
} from '../utils/groupTicketTypes'
import { GroupTicketsStore } from './groupTicketsStore'
import { useReviewCommits } from './useReviewCommits'
import { useTicketRuns } from './useTicketRuns'
import { colleagueReviewSourceStoreFor, useColleagueReviewSource } from './useColleagueReviewSource'

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
  /** Show a tab: its tickets at once when read before, read again either way. */
  pickTab: (tabId: string) => void
} & UseReviewPasteBox

/** What a ticket off every list says of itself, for the paste box to open on it. */
export interface TicketReviewKnown {
  reviewOpen: boolean
  offer?: TicketReviewOffer
}

/** The paste box over a group's tickets. */
export type UseReviewPasteBox = {
  /** The paste box, while it is open on a ticket. */
  reviewBox: ReviewPasteBox | undefined
  /**
   * Open the paste box on a ticket, with what was left in it last time — or,
   * with an update from Slack waiting on it, filled from that update. `known`
   * speaks for a ticket on no list read here, such as one opened on its page.
   */
  openReview: (ticketKey: string, known?: TicketReviewKnown) => void
  /** Dismiss the update from Slack waiting on a ticket: gone at once, back with why when refused. */
  dismissOffer: (ticketKey: string) => void
  /** Close the paste box; what it holds stays for the next time it opens on that ticket. */
  closeReview: () => void
  editReview: (draft: ReviewDraft) => void
  /** How the open box's round is reviewed: the person's pick, else the group's default. */
  reviewMode: ColleagueReviewMode
  /** Pick how the open box's round is reviewed. */
  setReviewMode: (mode: ColleagueReviewMode) => void
  /**
   * Start the open box's round: the box closes at once while the row shows the
   * round starting, and opens again with the draft and why when it fails.
   * Answers the round once it has started: its chat, and its run when it is
   * reviewed as one. `agent` is the agent picked for it; the chat's when left out.
   */
  startReview: (agent?: LaunchAgentPickMetadata) => Promise<ColleagueReviewStarted | undefined>
}

const stores = new Map<string, GroupTicketsStore>()

/** The one store of a group's tickets: its Tickets tab, its ticket pages and Settings share it. */
export function groupTicketsStoreFor(groupId: string): GroupTicketsStore {
  const held = stores.get(groupId)
  if (held) return held
  const store = new GroupTicketsStore(groupId)
  stores.set(groupId, store)
  return store
}

/**
 * A store of a group's tickets kept current: `read` runs once there is a token, as
 * its group stories change, since a story linked to a ticket gives that ticket its
 * work, as its watched Slack thread brings or settles updates, and on a reconnect.
 * `groupId === undefined` idles.
 */
export function useLiveTicketsStore(
  groupId: string | undefined,
  read: (store: GroupTicketsStore) => Promise<void>,
) {
  const { token } = useAuth()
  const { ws } = useApi()
  const store = useMemo(() => groupTicketsStoreFor(groupId ?? ''), [groupId])
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

/** The Tickets tab's tickets: the group's tabs, the one on screen, and a search. */
export function useGroupTickets(groupId: string): UseGroupTickets {
  const { store, state } = useLiveTicketsStore(groupId, readAll)
  const [query, setQuery] = useState('')

  useEffect(() => {
    store.typed(query)
    return store.stopTyping
  }, [query, store])

  const review = useReviewPasteBox(groupId, store, state)
  const commits = useReviewCommits(groupId, reviewOpenTicketKeys(state))
  const runs = useTicketRuns(groupId)

  return useMemo(
    () => ({
      view: groupTicketsView(state, Date.now(), commits, runs.index, runs.merges),
      query,
      setQuery,
      discuss: store.discuss,
      plan: store.plan,
      loadMore: store.loadMore,
      refresh: store.refresh,
      pickTab: (tabId: string) => void store.pickTab(tabId),
      ...review,
    }),
    [state, store, query, review, commits, runs],
  )
}

const EMPTY_DRAFT: ReviewDraft = { text: '', files: [] }

function ticketsOf(state: GroupTicketsState) {
  return [state.mine, ...Object.values(state.byTab), state.search].flatMap(
    (section) => section.list?.tickets ?? [],
  )
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
export function useReviewPasteBox(
  groupId: string,
  store: GroupTicketsStore,
  state: GroupTicketsState,
): UseReviewPasteBox {
  const { uploadChatFile, ws } = useApi()
  const source = colleagueReviewSourceStoreFor(ws)
  const groupDefault = useColleagueReviewSource(groupId).source.status?.settings.defaultMode
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
    (ticketKey: string, known?: TicketReviewKnown) => {
      const now = stateRef.current
      if (now.reviewing[ticketKey]) return
      const nextRound = isReviewOpen(now, ticketKey) || known?.reviewOpen === true
      const held = kept.current.get(ticketKey)
      const offer = offerOn(now, ticketKey) ?? known?.offer
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

  const setReviewMode = useCallback((mode: ColleagueReviewMode) => {
    setBox((open) => (open ? { ...open, mode } : open))
  }, [])
  const reviewMode = reviewStartMode(box?.mode, groupDefault)

  const startReview = useCallback(
    async (agent?: LaunchAgentPickMetadata) => {
      const open = boxRef.current
      if (!open || reviewBoxProblem(open)) return undefined
      kept.current.delete(open.ticketKey)
      setBox(undefined)
      const going = store.review(
        open.ticketKey,
        open.draft,
        upload,
        open.offer,
        reviewStartMode(open.mode, groupDefault),
        agent,
      )
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
    },
    [groupId, groupDefault, source, store, upload],
  )

  return useMemo(
    () => ({
      reviewBox: box,
      openReview,
      dismissOffer,
      closeReview,
      editReview,
      reviewMode,
      setReviewMode,
      startReview,
    }),
    [
      box,
      openReview,
      dismissOffer,
      closeReview,
      editReview,
      reviewMode,
      setReviewMode,
      startReview,
    ],
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
