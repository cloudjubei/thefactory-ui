import type { ExternalRef } from '../api'
import {
  JIRA_TICKET_PROVIDER,
  TAKE_NEXT_TICKET_TEXT,
  TICKET_CHIP_TEXT,
} from './groupTicketConstants'
import type {
  GroupRunStartedWords,
  GroupTicket,
  GroupTicketRow,
  GroupTicketsState,
  TakeNextTicketView,
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

function ticketRow(ticket: GroupTicket, planning: string | undefined): GroupTicketRow {
  const { key, summary, priority, status, url, groupStory } = ticket
  return {
    key,
    summary,
    ...(priority ? { priority } : {}),
    chip: ticketChipView({ key, status, title: summary, url }),
    ...(groupStory ? { work: groupStory } : {}),
    planning: planning === key,
    hint: groupStory
      ? TAKE_NEXT_TICKET_TEXT.openStory(groupStory.title)
      : TAKE_NEXT_TICKET_TEXT.planTicket(key),
  }
}

function sprintLine(rows: readonly GroupTicketRow[]): string {
  if (rows.length === 0) return ''
  const withWork = rows.filter((r) => r.work).length
  const tickets = `${rows.length} ticket${rows.length === 1 ? '' : 's'}`
  if (withWork === 0) return tickets
  return `${tickets} · ${withWork} ${withWork === 1 ? 'has' : 'have'} work`
}

/**
 * What the Stories tab shows of the sprint, or `undefined` for nothing at all: a
 * group with no Jira sees no trace of it, and neither does one still being read.
 */
export function takeNextTicketView(state: GroupTicketsState): TakeNextTicketView | undefined {
  const { list, readError, loadingMore, planning, planError } = state
  if (list && !list.connected) return undefined
  if (!list && !readError) return undefined
  const rows = (list?.tickets ?? []).map((t) => ticketRow(t, planning))
  const next = rows.find((r) => r.key === list?.nextTicketKey)
  const noNextLine = !list
    ? undefined
    : rows.length === 0
      ? TAKE_NEXT_TICKET_TEXT.noTickets
      : next
        ? undefined
        : TAKE_NEXT_TICKET_TEXT.allHaveWork
  return {
    ...(next ? { next } : {}),
    rows,
    sprintLine: sprintLine(rows),
    ...(noNextLine ? { noNextLine } : {}),
    ...(readError ? { readError } : {}),
    ...(planError ? { planError } : {}),
    canLoadMore: Boolean(list?.nextPageToken),
    loadingMore,
    planning: planning !== undefined,
  }
}

/** A sprint row's press: a row with work opens it; one without starts its plan, one at a time. */
export function pressTicketRow(
  row: Pick<GroupTicketRow, 'key' | 'work'>,
  planning: boolean,
  on: { onOpenStory: (groupStoryId: string) => void; onPlan: (ticketKey: string) => void },
): void {
  if (row.work) on.onOpenStory(row.work.id)
  else if (!planning) on.onPlan(row.key)
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
