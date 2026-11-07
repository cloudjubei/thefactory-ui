import type { TicketConnectionAccess } from '../api/generated'
import type { TicketTransitionLayout, TicketTransitionStanding } from './ticketConnectionTypes'

/** How each access level reads in the picker and in a binding's summary. */
export const TICKET_ACCESS_LABELS: Record<TicketConnectionAccess, string> = {
  read: 'Read only',
  'read-write': 'Read & write',
}

/** The providers a project or group can bind. Azure DevOps stays out: its write-back is off by policy. */
export const TICKET_BINDABLE_PROVIDERS: readonly string[] = ['jira', 'github']

/** What the access choice is about: agents have Jira tools, and only a sign-off writes to GitHub. */
export const TICKET_ACCESS_COPY = {
  jira: {
    heading: 'What agents may do',
    ariaLabel: 'What agents may do in Jira',
    descriptions: {
      read: 'Agents can search and read issues, comments, history, sprints and attachments. They cannot change anything in Jira.',
      'read-write':
        'Agents can also create, edit, transition, assign, comment on, link and delete issues, log work and manage sprints, watchers and attachments. Every change asks you first, showing the ticket and what changes. Runs only read.',
    },
  },
  github: {
    heading: 'What sign-off may do',
    ariaLabel: 'What sign-off may do on GitHub',
    descriptions: {
      read: 'Sign-off writes nothing to GitHub. Agents get no GitHub tools here.',
      'read-write':
        'Sign-off can comment on the issue and set its state. Agents get no GitHub tools here.',
    },
  },
} as const satisfies Record<
  string,
  { heading: string; ariaLabel: string; descriptions: Record<TicketConnectionAccess, string> }
>

/** The words of the connection picker. */
export const TICKET_PICKER_COPY = {
  label: 'Tickets',
  placeholder: 'Choose a ticket connection',
  noConnections: 'No ticket connection yet. Add one in Settings → Tickets.',
  inherited: (group: string | undefined, summary: string) =>
    `Agents here use ${group}'s connection: ${summary}.`,
  notConnected: 'Agents here get no ticket connection.',
  deleted: 'This connection was deleted, so nothing reaches its tickets. Choose another.',
} as const

/** The picker's choice to follow the main group's connection. */
export const TICKET_PICKER_INHERIT = '__inherit__'

/** The picker's choice of no connection: an opt-out for a project, nothing for a group. */
export const TICKET_PICKER_NONE = '__none__'

/** How a binding's status reads in its one-line summary. */
export const TICKET_TRANSITION_LABEL = (status: string): string => `Sign-off moves to ${status}`

/** The transition list's choice to leave the ticket alone: no status is saved. */
export const TICKET_TRANSITION_LEAVE = '__leave__'

/** GitHub's states as a person reads them. Its value stays the state itself. */
export const GITHUB_STATE_LABELS: Readonly<Record<string, string>> = {
  open: 'Open',
  closed: 'Closed',
}

/** How long typing project keys settles before the statuses are read again. */
export const TICKET_STATUSES_READ_DELAY_MS = 400

export const TICKET_TRANSITION_FIELD = {
  label: 'Move the ticket at sign-off',
  heading: 'At sign-off',
  hint: 'The status a sign-off moves the ticket to.',
  leave: 'Leave the ticket where it is',
  reading: 'Reading the statuses…',
  saved: (status: string) => `${status} (not on this list)`,
  placeholder: 'Done',
  typeHint: (reason: string) => `${reason} Type a status name, or leave this blank.`,
  listFailed: 'Could not read the statuses.',
  noStatuses: 'The connection listed no statuses.',
  noConnection: 'The connection is gone.',
} as const

export const TICKET_TRANSITION_STANDING = {
  off: {
    label: 'Write-back off',
    tone: 'empty',
    text: 'This only applies once write-back is on. Until then, sign-off writes nothing to the ticket.',
  },
  noConnection: {
    label: 'Nothing moves',
    tone: 'onhold',
    text: 'The connection is gone, so sign-off writes nothing to the ticket.',
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
    text: 'Write-back needs Read & write, so sign-off writes nothing to the ticket.',
  },
  commentOnly: {
    label: 'Comment only',
    tone: 'done',
    text: 'Sign-off comments on the ticket and leaves it where it is.',
  },
  moves: {
    label: 'Moves the ticket',
    tone: 'done',
    text: 'Sign-off comments on the ticket, then moves it to this status. A ticket that cannot get there stays put, and the run says so.',
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
