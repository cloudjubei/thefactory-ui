import type { GroupTicketsLayout, TicketChipLayout, TicketMoveLayout } from './groupTicketTypes'

/** The `provider` of a Jira ticket's link. */
export const JIRA_TICKET_PROVIDER = 'jira'

export const GROUP_TICKETS_LAYOUTS: readonly GroupTicketsLayout[] = [
  'sections',
  'segmented',
  'columns',
]

/** The layout that ships. */
export const GROUP_TICKETS_DEFAULT_LAYOUT: GroupTicketsLayout = 'sections'

export const GROUP_TICKETS_LAYOUT_LABELS: Record<GroupTicketsLayout, string> = {
  sections: 'One after the other',
  segmented: 'One list at a time',
  columns: 'Side by side',
}

/** How long typing rests before a search goes to Jira. */
export const GROUP_TICKETS_SEARCH_WAIT_MS = 350

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

export const GROUP_TICKETS_TEXT = {
  heading: 'Tickets',
  search: 'Find a ticket',
  searchHint: 'Find any ticket by key or words',
  searching: 'Searching…',
  results: 'Results',
  noResults: (query: string) => `No ticket matches “${query}”.`,
  next: 'Next ticket',
  explain: 'An agent reads it and proposes a group story for you to approve.',
  yours: 'Yours',
  others: 'Others in the sprint',
  othersShort: 'Others',
  noneYours: 'Nothing is assigned to you in the open sprint.',
  noneOthers: 'Nobody else has tickets in the open sprint.',
  take: 'Take ticket',
  starting: 'Starting…',
  discuss: 'Discuss',
  opening: 'Opening…',
  chatOpen: 'Chat open',
  noWork: 'No group story',
  loading: 'Loading…',
  showMore: 'Show more',
  tryAgain: 'Try again',
  noJira: 'This group has no Jira.',
  connectJira: 'Connect it in Settings → Group',
  readFailed: 'Could not read the tickets.',
  searchFailed: 'Could not search the tickets.',
  planFailed: 'The plan did not start.',
  discussFailed: 'The chat did not open.',
  discussTicket: (key: string) => `Discuss ${key}`,
  openChat: (key: string) => `Open the chat on ${key}`,
} as const

export const TICKET_CHIP_TEXT = {
  open: 'Open in Jira',
} as const

export const TICKET_MOVE_TEXT = {
  leaveIt: (key: string) => `Leave ${key} as it is`,
  moveIt: (change: string) => `Move the ticket: ${change}`,
} as const
