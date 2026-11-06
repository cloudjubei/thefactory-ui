import type { TicketConnectionAccess } from '../api/generated'
import type { TicketTransitionLayout, TicketTransitionStanding } from './ticketConnectionTypes'

/** How each access level reads in the picker and in a binding's summary. */
export const TICKET_ACCESS_LABELS: Record<TicketConnectionAccess, string> = {
  read: 'Read only',
  'read-write': 'Read & write',
}

/** What each access level lets agents do, shown under the access choice. */
export const TICKET_ACCESS_DESCRIPTIONS: Record<TicketConnectionAccess, string> = {
  read: 'Agents can search and read issues, comments, history, sprints and attachments. They cannot change anything in Jira.',
  'read-write':
    'Agents can also create, edit, transition, assign, comment on, link and delete issues, log work and manage sprints, watchers and attachments. Every change asks you first, showing the ticket and what changes. Runs only read.',
}

/** The picker's choice to follow the main group's Jira. */
export const TICKET_PICKER_INHERIT = '__inherit__'

/** The picker's choice of no Jira: an opt-out for a project, nothing for a group. */
export const TICKET_PICKER_NONE = '__none__'

/** How a binding's transition reads in its one-line summary. */
export const TICKET_TRANSITION_LABEL = (transition: string): string =>
  `Sign-off transition ${transition}`

export const TICKET_TRANSITION_FIELD = {
  label: 'Move the ticket at sign-off (optional)',
  heading: 'At sign-off',
  hint: 'The Jira transition id, e.g. 31. Leave blank to leave the ticket where it is.',
  placeholder: '31',
} as const

export const TICKET_TRANSITION_STANDING = {
  off: {
    label: 'Write-back off',
    tone: 'empty',
    text: 'This only applies once write-back is on. Until then, sign-off writes nothing to Jira.',
  },
  noConnection: {
    label: 'Nothing moves',
    tone: 'onhold',
    text: 'The connection is gone, so sign-off writes nothing to Jira.',
  },
  projectLimit: {
    label: 'Nothing moves',
    tone: 'onhold',
    text: 'Write-back needs no project limit, so sign-off writes nothing to Jira.',
  },
  classicToken: {
    label: 'Nothing moves',
    tone: 'onhold',
    text: 'Write-back needs a Jira sign-in or a scoped API token, so sign-off writes nothing to Jira.',
  },
  readOnly: {
    label: 'Nothing moves',
    tone: 'onhold',
    text: 'Write-back needs Read & write, so sign-off writes nothing to Jira.',
  },
  commentOnly: {
    label: 'Comment only',
    tone: 'done',
    text: 'Sign-off comments on the ticket and leaves it where it is.',
  },
  moves: {
    label: 'Moves the ticket',
    tone: 'done',
    text: 'Sign-off comments on the ticket, then applies this transition.',
  },
} as const satisfies Record<string, TicketTransitionStanding>

export const TICKET_TRANSITION_LAYOUTS: readonly TicketTransitionLayout[] = [
  'inline',
  'fold',
  'panel',
]

/** The layout that ships. */
export const TICKET_TRANSITION_DEFAULT_LAYOUT: TicketTransitionLayout = 'inline'

export const TICKET_TRANSITION_LAYOUT_LABELS: Record<TicketTransitionLayout, string> = {
  inline: 'In line',
  fold: 'Folded',
  panel: 'Own panel',
}
