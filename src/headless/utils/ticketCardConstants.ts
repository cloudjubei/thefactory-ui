import type { ProcessStatusTone } from './processView'
import type { TicketCardLayout, TicketStatusTone } from './ticketCardTypes'

/** Jira's status category keys. */
export const JIRA_STATUS_CATEGORY_TONE: Readonly<Record<string, TicketStatusTone>> = {
  new: 'todo',
  indeterminate: 'progress',
  done: 'done',
}

/**
 * The app's own status tone each lozenge is drawn in: to-do grey, in progress
 * blue, done green. A status with no category known keeps the grey pill a
 * ticket chip always had.
 */
export const TICKET_STATUS_TONE: Readonly<Record<TicketStatusTone, ProcessStatusTone>> = {
  todo: 'empty',
  progress: 'running',
  done: 'done',
  unknown: 'queued',
}

export const TICKET_CARD_TEXT = {
  open: 'Open in Jira',
  loading: 'Reading the ticket…',
  failed: 'Could not read this ticket',
  priority: 'Priority',
  assignee: 'Assignee',
  unassigned: 'Unassigned',
  preview: (key: string) => `${key}. Show the ticket`,
} as const

export const TICKET_CARD_LAYOUTS: readonly TicketCardLayout[] = ['unfurl', 'compact']

export const TICKET_CARD_DEFAULT_LAYOUT: TicketCardLayout = 'unfurl'

export const TICKET_CARD_LAYOUT_LABELS: Readonly<Record<TicketCardLayout, string>> = {
  unfurl: 'Unfurl',
  compact: 'Compact',
}
