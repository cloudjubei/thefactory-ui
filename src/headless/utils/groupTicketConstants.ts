import type { TakeNextTicketLayout, TicketChipLayout, TicketMoveLayout } from './groupTicketTypes'

/** The `provider` of a Jira ticket's link. */
export const JIRA_TICKET_PROVIDER = 'jira'

export const TAKE_NEXT_TICKET_LAYOUTS: readonly TakeNextTicketLayout[] = ['card', 'list', 'columns']

/** The layout that ships. */
export const TAKE_NEXT_TICKET_DEFAULT_LAYOUT: TakeNextTicketLayout = 'card'

export const TAKE_NEXT_TICKET_LAYOUT_LABELS: Record<TakeNextTicketLayout, string> = {
  card: 'Card, sprint folded',
  list: 'One list',
  columns: 'Side by side',
}

export const TICKET_CHIP_LAYOUTS: readonly TicketChipLayout[] = ['joined', 'split']

/** The layout that ships. */
export const TICKET_CHIP_DEFAULT_LAYOUT: TicketChipLayout = 'joined'

export const TICKET_CHIP_LAYOUT_LABELS: Record<TicketChipLayout, string> = {
  joined: 'One chip',
  split: 'Chip and pill',
}

export const TICKET_MOVE_LAYOUTS: readonly TicketMoveLayout[] = ['top', 'settings']

/** The layout that ships. */
export const TICKET_MOVE_DEFAULT_LAYOUT: TicketMoveLayout = 'top'

export const TICKET_MOVE_LAYOUT_LABELS: Record<TicketMoveLayout, string> = {
  top: 'First on the card',
  settings: 'With the settings',
}

export const TAKE_NEXT_TICKET_TEXT = {
  heading: 'Next ticket',
  take: 'Take ticket',
  starting: 'Starting…',
  explain: 'An agent reads it and proposes a group story for you to approve.',
  sprint: 'Your sprint',
  noTickets: 'Nothing is assigned to you in the open sprint.',
  allHaveWork: 'Every ticket in your sprint has work.',
  noWork: 'No work yet',
  next: 'Next',
  showMore: 'Show more',
  tryAgain: 'Try again',
  readFailed: 'Could not read your tickets.',
  planFailed: 'The plan did not start.',
  openStory: (title: string) => `Open “${title}”`,
  planTicket: (key: string) => `Plan ${key}`,
} as const

export const TICKET_CHIP_TEXT = {
  open: 'Open in Jira',
} as const

export const TICKET_MOVE_TEXT = {
  leaveIt: (key: string) => `Leave ${key} as it is`,
  moveIt: (change: string) => `Move the ticket: ${change}`,
} as const
