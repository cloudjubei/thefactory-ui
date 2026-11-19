import type {
  GroupTicketOverviewPart,
  GroupTicketPageLayout,
  GroupTicketPullRequest,
  GroupTicketTabsLayout,
} from './groupTicketPageTypes'
import type { GroupTicketToneLabel } from './groupTicketTabTypes'
import type { ColleagueReviewOfferState } from '../api/generated'

export const GROUP_TICKET_PAGE_LAYOUTS: readonly GroupTicketPageLayout[] = [
  'sections',
  'columns',
  'tabs',
]

/** The layout that ships. */
export const GROUP_TICKET_PAGE_DEFAULT_LAYOUT: GroupTicketPageLayout = 'sections'

export const GROUP_TICKET_PAGE_LAYOUT_LABELS: Record<GroupTicketPageLayout, string> = {
  sections: 'One column',
  columns: 'Ticket beside its work',
  tabs: 'A tab per part',
}

export const GROUP_TICKET_TABS_LAYOUTS: readonly GroupTicketTabsLayout[] = ['bar', 'side', 'menu']

/** The layout that ships. */
export const GROUP_TICKET_TABS_DEFAULT_LAYOUT: GroupTicketTabsLayout = 'bar'

export const GROUP_TICKET_TABS_LAYOUT_LABELS: Record<GroupTicketTabsLayout, string> = {
  bar: 'Tabs on top',
  side: 'Tabs at the side',
  menu: 'A tab menu',
}

export const GROUP_TICKET_UPDATE_STATE_VIEW: Record<
  ColleagueReviewOfferState,
  GroupTicketToneLabel
> = {
  new: { label: 'Waiting', tone: 'review' },
  dismissed: { label: 'Dismissed', tone: 'empty' },
  started: { label: 'Reviewed', tone: 'done' },
}

export const GROUP_TICKET_PR_STATE_VIEW: Record<
  GroupTicketPullRequest['state'],
  GroupTicketToneLabel
> = {
  open: { label: 'Open', tone: 'working' },
  merged: { label: 'Merged', tone: 'done' },
  closed: { label: 'Closed', tone: 'empty' },
}

export const GROUP_TICKET_PR_CHECKS_VIEW: Record<
  NonNullable<GroupTicketPullRequest['checks']>,
  GroupTicketToneLabel
> = {
  passing: { label: 'Checks pass', tone: 'done' },
  failing: { label: 'Checks fail', tone: 'stuck' },
  pending: { label: 'Checks running', tone: 'running' },
  none: { label: 'No checks', tone: 'empty' },
}

/** What a part that could not be read is called on the page. */
export const GROUP_TICKET_PART_FAILED: Record<GroupTicketOverviewPart, string> = {
  ticket: 'Could not read the ticket from Jira.',
  tab: 'Could not tell which tab it is in.',
  updates: 'Could not read its Slack updates.',
  review: 'Could not read its review.',
  pullRequests: 'Could not read every pull request.',
  story: 'Could not read its group story.',
  chats: 'Could not read its chats.',
}

/** The most web links an update shows from its text. */
export const GROUP_TICKET_UPDATE_LINKS_MAX = 6

export const GROUP_TICKET_PAGE_TEXT = {
  back: 'Tickets',
  loading: 'Loading…',
  readFailed: 'Could not read the ticket.',
  tryAgain: 'Try again',
  openInJira: 'Open in Jira',
  status: 'Status',
  priority: 'Priority',
  assignee: 'Assignee',
  unassigned: 'Unassigned',
  sprint: 'Sprint',
  noSprint: 'No sprint',
  sprintClosed: (name: string) => `${name} (closed)`,
  updated: 'Updated',
  tab: 'Tab',
  description: 'Description',
  ticket: 'Ticket',
  slack: 'Slack',
  noDescription: 'No description.',
  updates: 'Slack updates',
  noUpdates: 'No update from Slack.',
  review: 'Review',
  noReview: 'Not reviewed yet.',
  openReview: 'Open the review',
  round: (n: number) => `Round ${n}`,
  started: (when: string) => `Started ${when}`,
  recorded: (when: string) => `Recorded ${when}`,
  replyPosted: 'Reply posted',
  openFindings: (n: number) =>
    n === 0 ? 'No open findings' : `${n} open finding${n === 1 ? '' : 's'}`,
  runs: 'Review runs',
  runOf: (round: number) => `Round ${round} run`,
  pullRequests: 'Pull requests',
  noPullRequests: 'No pull request.',
  work: 'Work',
  story: 'Story',
  noStory: 'No story yet.',
  chats: 'Chats',
  noChats: 'No chat yet.',
  files: 'Files',
  links: 'Links',
  open: 'Open',
  partFailed: 'Could not read:',
} as const
