import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { latestReviewRound } from 'thefactory-tools/utils'
import { reviewCardMerge, reviewMergeStartBody } from '../utils/colleagueReviewMerge'
import type { ReviewCardMerge } from '../utils/colleagueReviewMergeTypes'
import type { TicketReviewOffer } from '../utils/colleagueReviewSourceTypes'
import { reviewStartLabel } from '../utils/colleagueReviewStart'
import { COLLEAGUE_REVIEWS_EVENT } from '../utils/colleagueReviewStartConstants'
import { groupTicketPageView } from '../utils/groupTicketPage'
import type { GroupTicketOverview, GroupTicketPageState } from '../utils/groupTicketPageTypes'
import type { GroupTicketAction, TicketPlanStarted } from '../utils/groupTicketTypes'
import { GroupTicketOverviewStore } from './groupTicketOverviewStore'
import { useColleagueReview } from './useColleagueReview'
import { useColleagueReviewMerge } from './useColleagueReviewMerge'
import {
  groupTicketsStoreFor,
  useReviewPasteBox,
  type TicketReviewKnown,
  type UseReviewPasteBox,
} from './useGroupTickets'

const GROUP_STORIES_EVENT = 'groupStories:updated'

const overviews = new Map<string, GroupTicketOverviewStore>()

function overviewStoreFor(groupId: string): GroupTicketOverviewStore {
  const held = overviews.get(groupId)
  if (held) return held
  const store = new GroupTicketOverviewStore(groupId)
  overviews.set(groupId, store)
  return store
}

/** The update a ticket's page opens the paste box on: the newest still waiting or put aside. */
function knownOf(overview: GroupTicketOverview | undefined): TicketReviewKnown {
  const update = overview?.updates.find((u) => u.state !== 'started')
  const offer: TicketReviewOffer | undefined =
    update && update.state !== 'started'
      ? {
          id: update.id,
          kind: update.kind,
          author: update.author,
          postedAt: update.postedAt,
          permalink: update.permalink,
          state: update.state,
          files: update.files,
        }
      : undefined
  return { reviewOpen: overview?.review !== undefined, ...(offer ? { offer } : {}) }
}

export type UseGroupTicketPage = UseReviewPasteBox & {
  state: GroupTicketPageState
  /** What is opening the ticket's chat right now. */
  starting: GroupTicketAction | undefined
  /** A chat is opening on any ticket: nothing else can open one. */
  busy: boolean
  /** Why the last chat did not open. */
  startError: string | undefined
  /** What the Review button says while a round starts. */
  reviewing: string | undefined
  discuss: () => Promise<TicketPlanStarted | undefined>
  take: () => Promise<TicketPlanStarted | undefined>
  /** Open the paste box on the ticket, on its newest update when one waits. */
  review: () => void
  /** Approve & merge on the review's latest round; absent while there is none to merge. */
  merge: ReviewCardMerge | undefined
  approveAndMerge: (slackText: string, override: boolean) => void
  refresh: () => void
}

/**
 * A ticket's page, live: its overview read once and kept, so it opens again
 * at once, read again as its group stories or its review change and on a
 * reconnect. Its actions are the Tickets tab's own, on the group's one
 * store, so a press on the page and one on its row are the same press.
 */
export function useGroupTicketPage(groupId: string, ticketKey: string): UseGroupTicketPage {
  const { token } = useAuth()
  const { ws } = useApi()
  const store = overviewStoreFor(groupId)
  const tickets = groupTicketsStoreFor(groupId)
  const subscribe = useCallback(
    (listener: () => void) => store.listen(ticketKey, listener),
    [store, ticketKey],
  )
  const snapshot = useSyncExternalStore(
    subscribe,
    () => store.snapshot(ticketKey),
    () => store.snapshot(ticketKey),
  )
  const ticketsState = useSyncExternalStore(tickets.subscribe, tickets.getState, tickets.getState)

  const refresh = useCallback(() => void store.read(ticketKey), [store, ticketKey])

  useEffect(() => {
    if (!token) return
    void store.read(ticketKey)
    if (!tickets.getState().tabs.tabs) void tickets.readTabs()
  }, [token, store, tickets, ticketKey])

  useEffect(() => {
    if (!token) return
    const offStories = ws.on(GROUP_STORIES_EVENT, (data: unknown) => {
      if ((data as { groupId?: string })?.groupId === groupId) refresh()
    })
    const offReview = ws.on(COLLEAGUE_REVIEWS_EVENT, (data: unknown) => {
      const update = data as { groupId?: string; ticketKey?: string } | undefined
      if (update?.groupId === groupId && (!update.ticketKey || update.ticketKey === ticketKey))
        refresh()
    })
    const offReconnect = ws.onReconnect(refresh)
    return () => {
      offStories()
      offReview()
      offReconnect()
    }
  }, [ws, token, groupId, ticketKey, refresh])

  const box = useReviewPasteBox(groupId, tickets, ticketsState)
  const { openReview } = box
  const { overview } = snapshot
  const review = useCallback(
    () => openReview(ticketKey, knownOf(overview)),
    [openReview, ticketKey, overview],
  )

  const after = useCallback(
    async (going: Promise<TicketPlanStarted | undefined>) => {
      const started = await going
      if (started) refresh()
      return started
    },
    [refresh],
  )
  const discuss = useCallback(() => after(tickets.discuss(ticketKey)), [after, tickets, ticketKey])
  const take = useCallback(() => after(tickets.plan(ticketKey)), [after, tickets, ticketKey])

  const live = useColleagueReview(overview?.review ? groupId : undefined, ticketKey)
  const { merge: mergeSnapshot, start } = useColleagueReviewMerge(
    overview?.review ? groupId : undefined,
    ticketKey,
  )
  const latest = live.review ? latestReviewRound(live.review) : undefined
  const merge = useMemo(
    () => (latest !== undefined ? reviewCardMerge(live.review, latest, mergeSnapshot) : undefined),
    [latest, live.review, mergeSnapshot],
  )
  const approveAndMerge = useCallback(
    (slackText: string, override: boolean) => {
      if (latest !== undefined) start(reviewMergeStartBody(latest, slackText, override))
    },
    [latest, start],
  )

  const tabs = ticketsState.tabs.tabs
  const state = useMemo<GroupTicketPageState>(() => {
    if (snapshot.overview) {
      return {
        kind: 'page',
        page: groupTicketPageView(ticketKey, snapshot.overview, tabs, Date.now()),
        refreshing: snapshot.reading,
      }
    }
    if (snapshot.readError) return { kind: 'failed', error: snapshot.readError }
    return { kind: 'loading' }
  }, [snapshot, ticketKey, tabs])

  const phase = ticketsState.reviewing[ticketKey]
  const starting =
    ticketsState.starting?.key === ticketKey ? ticketsState.starting.action : undefined
  return {
    ...box,
    state,
    starting,
    busy: ticketsState.starting !== undefined,
    startError: ticketsState.startError ?? undefined,
    reviewing: phase ? reviewStartLabel(phase) : undefined,
    discuss,
    take,
    review,
    merge,
    approveAndMerge,
    refresh,
  }
}
