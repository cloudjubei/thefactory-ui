import { ticketStatusesText } from './colleagueReviewSource'
import {
  GROUP_TICKET_TAB_ACTIONS,
  GROUP_TICKET_TAB_ROW_TEXT as TEXT,
  GROUP_TICKET_STATUS_CATEGORY_LABELS,
  GROUP_TICKET_TAB_SPRINT_LABELS,
  GROUP_TICKET_TABS_TEXT,
} from './groupTicketTabConstants'
import type {
  GroupTicketReplies,
  GroupTicketRepliesView,
  GroupTicketTab,
  GroupTicketTabAction,
  GroupTicketTabItem,
} from './groupTicketTabTypes'
import { timeAgo } from './time'

/** The tab bar: each tab by name, counted once a read said how many it holds. Pure. */
export function groupTicketTabItems(
  tabs: readonly GroupTicketTab[],
  counts: Readonly<Record<string, number>>,
): GroupTicketTabItem[] {
  return tabs.map((tab) => ({ id: tab.id, label: tab.name, count: counts[tab.id] }))
}

/** The tab on screen: the one picked while the group still has it, else the first. Pure. */
export function groupTicketShownTab(
  tabs: readonly GroupTicketTab[] | undefined,
  picked: string | undefined,
): GroupTicketTab | undefined {
  return tabs?.find((tab) => tab.id === picked) ?? tabs?.[0]
}

/** What a row's ticket says of itself that decides its actions. */
export interface GroupTicketActionFacts {
  mine?: boolean
  canTake: boolean
  reviewOpen: boolean
  groupStory?: { id: string; title: string }
}

/** What can apply to a ticket at all, whatever its tab offers. */
function applies(action: GroupTicketTabAction, ticket: GroupTicketActionFacts): boolean {
  if (action === 'take') return ticket.canTake
  if (action === 'carry-on') return ticket.groupStory !== undefined
  if (action === 'approve-and-merge') return ticket.reviewOpen
  if (action === 'replies') return ticket.mine === true
  return true
}

/**
 * A row's actions: its tab's for the person's side, each once, in the order a
 * row shows them, less those that cannot apply to it. A ticket in no tab is
 * only discussed. Pure.
 */
export function groupTicketRowActions(
  ticket: GroupTicketActionFacts,
  tab: GroupTicketTab | undefined,
): GroupTicketTabAction[] {
  if (!tab) return ['discuss']
  const side = new Set(ticket.mine ? tab.yours : tab.others)
  return GROUP_TICKET_TAB_ACTIONS.filter((action) => side.has(action) && applies(action, ticket))
}

/** A row's replies in a line, and how long ago the newest came. Pure. */
export function groupTicketRepliesView(
  replies: GroupTicketReplies,
  now: number,
): GroupTicketRepliesView {
  const parts = [
    ...(replies.slack > 0 ? [TEXT.slackReplies(replies.slack)] : []),
    ...(replies.github > 0 ? [TEXT.githubComments(replies.github)] : []),
  ]
  if (parts.length === 0) return { line: TEXT.noReplies, none: true }
  const at = replies.latest ? Date.parse(replies.latest) : Number.NaN
  return {
    line: parts.join(' · '),
    ...(Number.isNaN(at) ? {} : { when: timeAgo(now, at) }),
    none: false,
  }
}

/** What a tab shows, in a line: its statuses and its sprint. Pure. */
export function groupTicketTabSummary(tab: GroupTicketTab): string {
  const named = [
    ...(tab.categories ?? []).map((c) => GROUP_TICKET_STATUS_CATEGORY_LABELS[c]),
    ...(tab.statuses.length ? [ticketStatusesText(tab.statuses)] : []),
  ]
  const statuses = named.length ? named.join(', ') : GROUP_TICKET_TABS_TEXT.anyStatus
  const sprint =
    tab.sprint === 'any'
      ? GROUP_TICKET_TABS_TEXT.anySprint
      : GROUP_TICKET_TAB_SPRINT_LABELS[tab.sprint]
  return `${statuses} · ${sprint}`
}
