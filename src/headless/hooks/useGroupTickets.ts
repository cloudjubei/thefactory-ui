import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { reviewDraftProblem } from '../utils/colleagueReviewStart'
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
  /** Open the paste box on a ticket, with what was left in it last time. */
  openReview: (ticketKey: string) => void
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
 * work, and on a reconnect. `groupId === undefined` idles.
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
      if (update?.groupId === groupId && update.ticketKey) store.markReviewOpen(update.ticketKey)
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

  const review = useReviewPasteBox(store, state)

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

function isReviewOpen(state: GroupTicketsState, ticketKey: string): boolean {
  return [state.mine, state.sprint, state.search].some((section) =>
    section.list?.tickets.some((t) => t.key === ticketKey && t.reviewOpen),
  )
}

/** The paste box over a store: one box at a time, each ticket's draft kept while it is closed. */
function useReviewPasteBox(store: GroupTicketsStore, state: GroupTicketsState) {
  const { uploadChatFile } = useApi()
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

  const openReview = useCallback((ticketKey: string) => {
    if (stateRef.current.reviewing[ticketKey]) return
    const nextRound = isReviewOpen(stateRef.current, ticketKey)
    const held = kept.current.get(ticketKey)
    setBox({ ...(held ?? { ticketKey, draft: EMPTY_DRAFT }), nextRound })
  }, [])

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
    if (!open || reviewDraftProblem(open.draft)) return undefined
    kept.current.delete(open.ticketKey)
    setBox(undefined)
    const outcome = await store.review(open.ticketKey, open.draft, upload)
    if (!outcome) return undefined
    if (outcome.ok) return outcome.started
    const failed: ReviewPasteBox = { ...open, draft: outcome.draft, error: outcome.error }
    if (boxRef.current) kept.current.set(open.ticketKey, failed)
    else setBox(failed)
    return undefined
  }, [store, upload])

  return useMemo(
    () => ({ reviewBox: box, openReview, closeReview, editReview, startReview }),
    [box, openReview, closeReview, editReview, startReview],
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
