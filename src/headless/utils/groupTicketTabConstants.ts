import type {
  GroupTicketSide,
  GroupTicketStatusCategory,
  GroupTicketTabAction,
  GroupTicketTabSprint,
} from './groupTicketTabTypes'

/** Every action, in the order a row shows them. */
export const GROUP_TICKET_TAB_ACTIONS: readonly GroupTicketTabAction[] = [
  'take',
  'carry-on',
  'review',
  'replies',
  'approve-and-merge',
  'discuss',
]

export const GROUP_TICKET_TAB_ACTION_LABELS: Record<GroupTicketTabAction, string> = {
  take: 'Take ticket',
  'carry-on': 'Carry on',
  discuss: 'Discuss',
  review: 'Review',
  replies: 'Replies',
  'approve-and-merge': 'Approve & merge',
}

export const GROUP_TICKET_TAB_SPRINTS: readonly GroupTicketTabSprint[] = ['open', 'not-open', 'any']

export const GROUP_TICKET_TAB_SPRINT_LABELS: Record<GroupTicketTabSprint, string> = {
  open: 'In the open sprint',
  'not-open': 'Not in an open sprint',
  any: 'Any',
}

export const GROUP_TICKET_STATUS_CATEGORIES: readonly GroupTicketStatusCategory[] = [
  'new',
  'indeterminate',
  'done',
]

export const GROUP_TICKET_STATUS_CATEGORY_LABELS: Record<GroupTicketStatusCategory, string> = {
  new: 'Every to do',
  indeterminate: 'Every in progress',
  done: 'Every done',
}

export const GROUP_TICKET_SIDE_LABELS: Record<GroupTicketSide, string> = {
  yours: 'Yours',
  others: 'Others',
}

/** The most tabs a group may have, as the backend allows. */
export const GROUP_TICKET_TABS_MAX = 12

/** A new tab, before the person names it. */
export const GROUP_TICKET_NEW_TAB = {
  name: 'New tab',
  sprint: 'open' as GroupTicketTabSprint,
  yours: ['discuss'] as GroupTicketTabAction[],
  others: ['discuss'] as GroupTicketTabAction[],
}

export const GROUP_TICKET_TABS_TEXT = {
  heading: 'Ticket tabs',
  intro:
    'The tabs on the group’s Tickets tab: each shows the tickets in its statuses and sprint, Yours and Others with their own actions. A ticket shows in the first tab it matches.',
  defaults: 'These are the default tabs, from Jira’s status categories.',
  add: 'Add tab',
  reset: 'Reset to default',
  resetConfirm: 'Go back to the default tabs? The group’s own tabs are removed.',
  name: 'Name',
  statuses: 'Statuses',
  statusesHint: 'Jira status names, comma separated. With none and no category ticked, any status.',
  categories: 'Status groups',
  statusesPlaceholder: 'In Review, Code Review',
  sprint: 'Sprint',
  actions: 'Actions',
  moveUp: (name: string) => `Move ${name} up`,
  moveDown: (name: string) => `Move ${name} down`,
  remove: (name: string) => `Delete ${name}`,
  anyStatus: 'Any status',
  anySprint: 'Any sprint',
  saving: 'Saving…',
  readFailed: 'Could not read the ticket tabs.',
  saveFailed: 'The tabs were not saved.',
  tryAgain: 'Try again',
  tooMany: (max: number) => `At most ${max} tabs.`,
} as const

export const GROUP_TICKET_TAB_ROW_TEXT = {
  noTab: 'In no tab',
  emptyTab: 'No tickets in this tab.',
  noneYours: 'None of yours here.',
  noneOthers: 'Nobody else has one here.',
  tabsFailed: 'Could not read the ticket tabs.',
  carryOn: 'Carry on',
  carryOnHint: (title: string) => `Open ${title}`,
  openTicket: (key: string) => `Open ${key}`,
  noReplies: 'No replies yet',
  slackReplies: (n: number) => `${n} Slack ${n === 1 ? 'reply' : 'replies'}`,
  githubComments: (n: number) => `${n} GitHub ${n === 1 ? 'comment' : 'comments'}`,
  latest: (when: string) => `latest ${when}`,
  notOpenSprint: 'Not in the open sprint',
} as const
