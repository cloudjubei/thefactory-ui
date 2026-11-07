import type { TicketPostLayout } from './ticketPostTypes'

export const TICKET_POST_TEXT = {
  heading: 'On tickets',
  posts: (tickets: string, transition: string | undefined): string =>
    `Posts a comment on ${tickets}${transition ? `, then moves to ${transition}` : ''}.`,
  held: (tickets: string, why: string): string => `${tickets}: ${why.replace(/\.+$/, '')}.`,
  noReason: 'Nothing is posted',
  showComment: 'Read the comment',
  hideComment: 'Hide the comment',
  commentLabel: 'The comment',
  failed: 'Could not read what approving would post.',
} as const

/** How many tickets a line names before it counts the rest. */
export const TICKET_POST_NAMED_MAX = 3

export const TICKET_POST_LAYOUTS: readonly TicketPostLayout[] = ['fold', 'quoted']

/** The layout that ships. */
export const TICKET_POST_DEFAULT_LAYOUT: TicketPostLayout = 'fold'

export const TICKET_POST_LAYOUT_LABELS: Record<TicketPostLayout, string> = {
  fold: 'Folded',
  quoted: 'In full',
}
