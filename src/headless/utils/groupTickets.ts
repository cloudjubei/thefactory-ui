import type { ExternalRef } from '../api'
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

/** A link a chip may open: only a web page, as a ticket's text and link come from outside. */
export function ticketLink(url: string | undefined): string | undefined {
  if (!url || !URL.canParse(url)) return undefined
  const { protocol } = new URL(url)
  return protocol === 'https:' || protocol === 'http:' ? url : undefined
}

export function ticketChipView(ticket: {
  key: string
  status?: string | undefined
  title?: string | undefined
  url?: string | undefined
}): TicketChipView {
  const { key, status, title } = ticket
  const url = ticketLink(ticket.url)
  const named = title ?? key
  return {
    key,
    ...(status ? { status } : {}),
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

function ticketRow(ticket: GroupTicket, starting: GroupTicketsState['starting']): GroupTicketRow {
  const { key, summary, priority, status, url, groupStory, canTake, chatOpen } = ticket
  return {
    key,
    summary,
    ...(priority ? { priority } : {}),
    chip: ticketChipView({ key, status, title: summary, url }),
    ...(groupStory ? { work: groupStory } : {}),
    chatOpen,
    canTake,
    ...(starting?.key === key ? { starting: starting.action } : {}),
    hint: chatOpen ? GROUP_TICKETS_TEXT.openChat(key) : GROUP_TICKETS_TEXT.discussTicket(key),
  }
}

function listLine(tickets: readonly GroupTicket[]): string {
  if (tickets.length === 0) return ''
  const withWork = tickets.filter((t) => t.groupStory).length
  const count = `${tickets.length} ticket${tickets.length === 1 ? '' : 's'}`
  if (withWork === 0) return count
  return `${count} · ${withWork} ${withWork === 1 ? 'has' : 'have'} work`
}

function sectionView(
  section: GroupTicketSection,
  rows: GroupTicketRow[],
  emptyLine: string,
  sayFailure = true,
): GroupTicketSectionView {
  const { list, readError, loadingMore } = section
  return {
    rows,
    line: listLine(list?.tickets ?? []),
    ...(list?.tickets.length === 0 ? { emptyLine } : {}),
    loading: !list && !readError,
    ...(readError && sayFailure ? { readError } : {}),
    canLoadMore: Boolean(list?.nextPageToken),
    loadingMore,
  }
}

/**
 * What the Tickets tab shows. A search stands in for the lists while it is on. The
 * next ticket is only ever one that can be taken, whatever Jira's list says of it.
 */
export function groupTicketsView(state: GroupTicketsState): GroupTicketsView {
  const { mine, sprint, search, starting, startError } = state
  if (mine.list?.connected === false || sprint.list?.connected === false) {
    return { kind: 'no-jira' }
  }
  const answered = mine.list || sprint.list || mine.readError || sprint.readError
  if (!answered) return { kind: 'loading' }

  const rowsOf = (section: GroupTicketSection) =>
    (section.list?.tickets ?? []).map((t) => ticketRow(t, starting))
  const mineRows = rowsOf(mine)
  const next = mineRows.find((r) => r.key === mine.list?.nextTicketKey && r.canTake)
  const sameFailure = mine.readError && mine.readError === sprint.readError
  return {
    kind: 'tickets',
    ...(next ? { next } : {}),
    mine: sectionView(
      mine,
      mineRows.filter((r) => r !== next),
      GROUP_TICKETS_TEXT.noneYours,
      !sameFailure,
    ),
    others: sectionView(sprint, rowsOf(sprint), GROUP_TICKETS_TEXT.noneOthers, !sameFailure),
    ...(search.query
      ? {
          search: {
            query: search.query,
            ...sectionView(search, rowsOf(search), GROUP_TICKETS_TEXT.noResults(search.query)),
          },
        }
      : {}),
    ...(sameFailure ? { readError: mine.readError! } : {}),
    ...(startError ? { startError } : {}),
    starting: starting !== undefined,
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
