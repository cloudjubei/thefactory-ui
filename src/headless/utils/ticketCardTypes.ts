/** Jira's three status categories as the app shows them, and one for a status with none known. */
export type TicketStatusTone = 'todo' | 'progress' | 'done' | 'unknown'

/** A ticket's status as a lozenge: its name, coloured by its category. */
export interface TicketStatusLozengeView {
  label: string
  tone: TicketStatusTone
}

/** One ticket as the backend previews it for a link. Its text comes from Jira: it is shown as plain text. */
export interface TicketPreview {
  key: string
  summary: string
  url: string
  status?: string
  /** Jira's category of the status: `new`, `indeterminate` or `done`. */
  statusCategory?: string
  issueType?: string
  priority?: string
  /** Who it is assigned to, by name. */
  assignee?: string
}

/** A ticket's preview as its chip reads it: not asked for yet, being read, read, or not readable. */
export type TicketPreviewState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; preview: TicketPreview }
  | { kind: 'failed'; reason: string }

/** One labelled fact on a ticket's card. */
export interface TicketCardFact {
  label: string
  value: string
}

/** A ticket's preview card: what a person reads at a glance, and the way to it in Jira. */
export interface TicketCardView {
  key: string
  title?: string
  issueType?: string
  status?: TicketStatusLozengeView
  facts: TicketCardFact[]
  /** Absent when the ticket has no web link. */
  open?: { label: string; url: string }
}

/** How a ticket's preview card is laid out. */
export type TicketCardLayout = 'unfurl' | 'compact'
