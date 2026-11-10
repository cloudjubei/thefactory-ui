import { JIRA_STATUS_CATEGORY_TONE } from './ticketCardConstants'
import type { TicketStatusLozengeView, TicketStatusTone } from './ticketCardTypes'

/** The tone of one of Jira's status categories; unknown for any other, or none. Pure. */
export function ticketStatusTone(statusCategory: string | undefined): TicketStatusTone {
  const key = statusCategory?.trim().toLowerCase() ?? ''
  return Object.hasOwn(JIRA_STATUS_CATEGORY_TONE, key) ? JIRA_STATUS_CATEGORY_TONE[key]! : 'unknown'
}

/** A status as its lozenge, or `undefined` for no status. Pure. */
export function ticketStatusLozenge(
  status: string | undefined,
  statusCategory?: string,
): TicketStatusLozengeView | undefined {
  const label = status?.trim()
  return label ? { label, tone: ticketStatusTone(statusCategory) } : undefined
}
