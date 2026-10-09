import type { TicketConnectionAccess } from '../api/generated'

/** How each access level reads in the picker and in a binding's summary. */
export const TICKET_ACCESS_LABELS: Record<TicketConnectionAccess, string> = {
  read: 'Read only',
  'read-write': 'Read & write',
}

/** What each access level lets agents do, shown under the access choice. */
export const TICKET_ACCESS_DESCRIPTIONS: Record<TicketConnectionAccess, string> = {
  read: 'Agents can search and read issues, comments, history, sprints and attachments. They cannot change anything in Jira.',
  'read-write':
    'Agents can also create, edit, transition, assign, comment on, link and delete issues, log work and manage sprints, watchers and attachments. In a chat they ask before each change unless the chat is in auto mode; unattended runs make changes without asking.',
}

/** The picker's choice to follow the main group's Jira. */
export const TICKET_PICKER_INHERIT = '__inherit__'

/** The picker's choice of no Jira: an opt-out for a project, nothing for a group. */
export const TICKET_PICKER_NONE = '__none__'
