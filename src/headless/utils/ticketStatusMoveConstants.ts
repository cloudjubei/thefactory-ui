import type { TicketStatusMoveLayout, TicketStatusMoveOutcome } from './ticketStatusMoveTypes'

/** The agent tool that moves a Jira ticket through its workflow. */
export const TICKET_STATUS_MOVE_TOOL = 'transitionJiraIssue'

export const TICKET_STATUS_MOVE_OUTCOME: Readonly<Record<TicketStatusMoveOutcome, string>> = {
  asking: 'Waiting for your approval',
  moving: 'Moving…',
  moved: 'Moved',
  failed: 'Not moved',
  declined: 'Not moved — you declined',
  cancelled: 'Not moved — cancelled',
}

export const TICKET_STATUS_MOVE_TEXT = {
  unknownTicket: 'Unknown ticket',
  comment: 'Comment',
  arrow: '→',
  transitionId: (id: string) => `Transition ${id}`,
} as const

export const TICKET_STATUS_MOVE_ASK = {
  ask: 'The agent wants to move a ticket',
  tag: 'Jira',
  headline: (key: string, target: string | undefined) =>
    target ? `Move ${key} to ${target}` : `Move ${key}`,
  noTicket: 'Move a ticket',
  verb: 'Move',
} as const

export const TICKET_STATUS_MOVE_LAYOUTS: readonly TicketStatusMoveLayout[] = ['lozenges', 'line']

export const TICKET_STATUS_MOVE_DEFAULT_LAYOUT: TicketStatusMoveLayout = 'lozenges'

export const TICKET_STATUS_MOVE_LAYOUT_LABELS: Readonly<Record<TicketStatusMoveLayout, string>> = {
  lozenges: 'Lozenges',
  line: 'Arrow line',
}
