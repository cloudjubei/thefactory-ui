import type { ExternalRef } from '../api'
import { reviewOfferRowView } from './colleagueReviewSource'
import { reviewStartLabel } from './colleagueReviewStart'
import {
  CHAT_TICKET_METADATA_KEY,
  GROUP_TICKETS_TEXT,
  JIRA_TICKET_PROVIDER,
  TICKET_CHIP_TEXT,
} from './groupTicketConstants'
import type {
  GroupRunStartedWords,
  GroupTicket,
  GroupTicketRow,
  GroupTicketSection,
  GroupTicketSectionView,
  GroupTicketsState,
  GroupTicketsView,
  TicketChipView,
  TicketLaunchMove,
  TicketMoveDecision,
  TicketMoveFieldView,
  TicketMoveOutcome,
} from './groupTicketTypes'
import { GROUP_TICKET_TAB_ROW_TEXT } from './groupTicketTabConstants'
import {
  groupTicketRepliesView,
  groupTicketRowActions,
  groupTicketShownTab,
  groupTicketTabItems,
} from './groupTicketTabs'
import type { GroupTicketTab } from './groupTicketTabTypes'
import { ticketStatusTone } from './ticketStatus'

const NO_SECTION: GroupTicketSection = { list: undefined, readError: null, loadingMore: false }

/** A link a chip may open: only a web page, as a ticket's text and link come from outside. */
export function ticketLink(url: string | undefined): string | undefined {
  if (!url || !URL.canParse(url)) return undefined
  const { protocol } = new URL(url)
  return protocol === 'https:' || protocol === 'http:' ? url : undefined
}

export function ticketChipView(ticket: {
  key: string
  status?: string | undefined
  statusCategory?: string | undefined
  title?: string | undefined
  url?: string | undefined
}): TicketChipView {
  const { key, status, title } = ticket
  const url = ticketLink(ticket.url)
  const named = title ?? key
  const tone = status ? ticketStatusTone(ticket.statusCategory) : 'unknown'
  return {
    key,
    ...(status ? { status } : {}),
    ...(tone !== 'unknown' ? { statusTone: tone } : {}),
    ...(url ? { url } : {}),
    label: status ? `${key} · ${status}` : key,
    hint: url ? `${named} — ${TICKET_CHIP_TEXT.open}` : named,
  }
}

/** The Jira ticket a group story is linked to. */
export function groupStoryTicketRef(story: {
  externalIds?: readonly ExternalRef[]
}): ExternalRef | undefined {
  return story.externalIds?.find((ref) => ref.provider === JIRA_TICKET_PROVIDER)
}

/** The ticket a ticket's chat keeps on itself, when it holds one. */
function chatTicketRef(metadata: Record<string, unknown> | undefined): ExternalRef | undefined {
  const ticket = metadata?.[CHAT_TICKET_METADATA_KEY] as Partial<ExternalRef> | undefined
  return typeof ticket?.externalId === 'string' ? (ticket as ExternalRef) : undefined
}

/**
 * The tickets a chat is about, for its context dropdown: the one it keeps first,
 * then those of the group stories its story is a part of, each once.
 */
export function chatContextTickets({
  metadata,
  memberships = [],
}: {
  metadata?: Record<string, unknown> | undefined
  memberships?: readonly { title: string; externalIds?: readonly ExternalRef[] }[]
}): TicketChipView[] {
  const own = chatTicketRef(metadata)
  const views = [
    ...(own ? [ticketChipView({ key: own.externalId, url: own.url })] : []),
    ...memberships.flatMap(({ title, externalIds }) => {
      const ref = groupStoryTicketRef({ ...(externalIds ? { externalIds } : {}) })
      return ref ? [ticketChipView({ key: ref.externalId, title, url: ref.url })] : []
    }),
  ]
  return views.filter((view, at) => views.findIndex((t) => t.key === view.key) === at)
}

/** Each sprint ticket's status by key: what a group story's chip reads its status from. */
export function groupTicketStatuses(
  tickets: readonly Pick<GroupTicket, 'key' | 'status'>[] | undefined,
): Record<string, string> {
  return Object.fromEntries(
    (tickets ?? []).flatMap((t) => (t.status ? [[t.key, t.status] as const] : [])),
  )
}

/** A group story's chip. A ticket off the sprint list has no status to show, so it says its key. */
export function groupStoryTicketChip(
  story: { externalIds?: readonly ExternalRef[] },
  statuses: Readonly<Record<string, string>>,
): TicketChipView | undefined {
  const ref = groupStoryTicketRef(story)
  if (!ref) return undefined
  return ticketChipView({
    key: ref.externalId,
    status: statuses[ref.externalId],
    title: ref.title,
    url: ref.url,
  })
}

function ticketRow(
  ticket: GroupTicket,
  tab: GroupTicketTab | undefined,
  state: Pick<GroupTicketsState, 'starting' | 'reviewing'>,
  now: number,
): GroupTicketRow {
  const { key, summary, priority, status, statusCategory, url, groupStory, chatOpen } = ticket
  const review = state.reviewing[key]
  const actions = groupTicketRowActions(ticket, tab)
  const { starting } = state
  return {
    key,
    summary,
    ...(priority ? { priority } : {}),
    chip: ticketChipView({ key, status, statusCategory, title: summary, url }),
    ...(groupStory ? { work: groupStory } : {}),
    chatOpen,
    reviewOpen: ticket.reviewOpen,
    ...(review ? { reviewing: reviewStartLabel(review) } : {}),
    ...(ticket.reviewOffer ? { offer: reviewOfferRowView(ticket.reviewOffer, now) } : {}),
    actions,
    ...(ticket.replies && actions.includes('replies')
      ? { replies: groupTicketRepliesView(ticket.replies, now) }
      : {}),
    ...(starting?.key === key ? { starting: starting.action } : {}),
    hint: GROUP_TICKET_TAB_ROW_TEXT.openTicket(key),
  }
}

function listLine(rows: readonly GroupTicketRow[]): string {
  if (rows.length === 0) return ''
  const withWork = rows.filter((r) => r.work).length
  const count = `${rows.length} ticket${rows.length === 1 ? '' : 's'}`
  if (withWork === 0) return count
  return `${count} · ${withWork} ${withWork === 1 ? 'has' : 'have'} work`
}

function sideView(rows: GroupTicketRow[], emptyLine: string | undefined): GroupTicketSectionView {
  return {
    rows,
    line: listLine(rows),
    ...(rows.length === 0 && emptyLine ? { emptyLine } : {}),
    loading: false,
    canLoadMore: false,
    loadingMore: false,
  }
}

function searchView(
  search: GroupTicketsState['search'],
  rows: GroupTicketRow[],
): GroupTicketSectionView {
  const { list, readError, loadingMore } = search
  return {
    rows,
    line: listLine(rows),
    ...(list?.tickets.length === 0
      ? { emptyLine: GROUP_TICKETS_TEXT.noResults(search.query) }
      : {}),
    loading: !list && !readError,
    ...(readError ? { readError } : {}),
    canLoadMore: Boolean(list?.nextPageToken),
    loadingMore,
  }
}

/**
 * What the Tickets tab shows: the group's tabs with their counts, and the tab
 * on screen split into the person's tickets and everyone else's, each row
 * with its tab's actions for its side. A search stands in for the tab while
 * it is on, each row with the actions of the tab it falls in. The next
 * ticket is only ever one of the person's the tab lets them take. `now` says
 * how long ago each update and reply came.
 */
export function groupTicketsView(state: GroupTicketsState, now = Date.now()): GroupTicketsView {
  const { tabs: read, byTab, tabCounts, search, startError, offerError } = state
  const tabs = read.tabs
  if (!tabs) return read.readError ? { kind: 'failed', error: read.readError } : { kind: 'loading' }
  const shown = groupTicketShownTab(tabs, state.tab)
  const section = (shown && byTab[shown.id]) || NO_SECTION
  const { list } = section
  if (list?.connected === false || search.list?.connected === false) return { kind: 'no-jira' }

  const rows = (list?.tickets ?? []).map((t) => ticketRow(t, shown, state, now))
  const mineKeys = new Set((list?.tickets ?? []).filter((t) => t.mine).map((t) => t.key))
  const mineRows = rows.filter((r) => mineKeys.has(r.key))
  const next = mineRows.find((r) => r.key === list?.nextTicketKey && r.actions.includes('take'))
  const empty = list !== undefined && list.tickets.length === 0
  const say = (line: string) => (list && !empty ? line : undefined)
  const tabOf = (ticket: GroupTicket) => tabs.find((t) => t.id === ticket.tabId)
  const mine = sideView(
    mineRows.filter((r) => r !== next),
    next ? undefined : say(GROUP_TICKET_TAB_ROW_TEXT.noneYours),
  )
  return {
    kind: 'tickets',
    tabs: groupTicketTabItems(tabs, tabCounts),
    tab: shown?.id ?? '',
    ...(next ? { next } : {}),
    mine: { ...mine, loading: !list && !section.readError },
    others: sideView(
      rows.filter((r) => !mineKeys.has(r.key)),
      say(GROUP_TICKET_TAB_ROW_TEXT.noneOthers),
    ),
    ...(empty ? { emptyLine: GROUP_TICKET_TAB_ROW_TEXT.emptyTab } : {}),
    canLoadMore: Boolean(list?.nextPageToken),
    loadingMore: section.loadingMore,
    ...(search.query
      ? {
          search: {
            query: search.query,
            ...searchView(
              search,
              (search.list?.tickets ?? []).map((t) => ticketRow(t, tabOf(t), state, now)),
            ),
          },
        }
      : {}),
    ...(section.readError ? { readError: section.readError } : {}),
    ...(startError ? { startError } : {}),
    starting: state.starting !== undefined,
    offerCount: (list ?? search.list)?.reviewOfferCount ?? 0,
    ...(offerError ? { offerError } : {}),
  }
}

/** What a launch card draws of a ticket: a whole move to tick, why there is none, or nothing. */
export function ticketMoveField(
  move: TicketLaunchMove | undefined,
): TicketMoveFieldView | undefined {
  if (!move) return undefined
  const { ticketKey, ticketTitle, ticketUrl, ticketStatus, change, transitionId, unavailable } =
    move
  const named = {
    chip: ticketChipView({
      key: ticketKey,
      status: ticketStatus,
      title: ticketTitle,
      url: ticketUrl,
    }),
    ...(ticketTitle ? { title: ticketTitle } : {}),
  }
  if (unavailable) return { kind: 'unavailable', ...named, text: unavailable }
  if (!change || !transitionId) return undefined
  return { kind: 'offer', ...named, change, decision: { ticketKey, transitionId } }
}

/** The move a launch sends: the one the card offered, only while it is ticked. */
export function ticketMoveDecisionOf(
  field: TicketMoveFieldView | undefined,
  ticked: boolean,
): TicketMoveDecision | undefined {
  return field?.kind === 'offer' && ticked ? field.decision : undefined
}

/**
 * What a started run says. The backend ends its sentence with what became of the
 * ticket; a move that failed is lifted out to stand on its own, and said once.
 */
export function groupRunStartedWords(started: {
  message: string
  ticketMove?: TicketMoveOutcome
}): GroupRunStartedWords {
  const { message, ticketMove } = started
  if (!ticketMove || ticketMove.moved) return { message }
  return {
    message: message.endsWith(ticketMove.message)
      ? message.slice(0, -ticketMove.message.length).trimEnd()
      : message,
    notMoved: ticketMove.message,
  }
}
