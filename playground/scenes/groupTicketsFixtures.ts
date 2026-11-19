import type {
  GroupTicket,
  GroupTicketList,
  GroupTicketSection,
  GroupTicketsState,
  GroupTicketTab,
} from 'thefactory-ui/headless'

const JIRA = 'https://acme.atlassian.net/browse'

export const ticket = (
  key: string,
  summary: string,
  over: Partial<GroupTicket> = {},
): GroupTicket => ({
  key,
  summary,
  url: `${JIRA}/${key}`,
  status: 'To Do',
  statusCategory: 'new',
  issueType: 'Task',
  canTake: true,
  chatOpen: false,
  reviewOpen: false,
  ...over,
})

const started = (status: string, over: Partial<GroupTicket> = {}): Partial<GroupTicket> => ({
  status,
  statusCategory: 'indeterminate',
  canTake: false,
  ...over,
})

export const NEXT = ticket('OSC-418', 'Check-in reminders skip people on a paused plan', {
  priority: 'Highest',
})
export const WORKED = ticket(
  'OSC-412',
  'Show the renewal date on the plan page',
  started('In Progress', {
    priority: 'High',
    groupStory: { id: 'gs-renewal', title: 'Renewal date on the plan page' },
  }),
)
export const STARTED = ticket(
  'OSC-409',
  'Plan page shows the wrong currency for people in Ireland',
  started('In QA', { priority: 'High', chatOpen: true }),
)
const DISCUSSED = ticket('OSC-421', 'Coach notes lose their line breaks after an edit', {
  priority: 'Medium',
  chatOpen: true,
})
const FREE = ticket('OSC-430', 'Add an empty state to the goals list', { priority: 'Low' })

export const MINE: GroupTicket[] = [WORKED, STARTED, NEXT, DISCUSSED, FREE]

export const OTHERS: GroupTicket[] = [
  ticket(
    'OSC-402',
    'Weekly review email has the wrong week number',
    started('In Review', {
      priority: 'Medium',
      assignee: 'Priya Shah',
      groupStory: { id: 'gs-weekly', title: 'Weekly review email fixes' },
      chatOpen: true,
    }),
  ),
  ticket(
    'OSC-415',
    'A very long ticket title that someone pasted from a support thread, with the whole of the customer’s first sentence kept in it and more besides',
    started('In Progress', { assignee: 'Tom Reid' }),
  ),
  ticket('OSC-433', 'Goals list jumps when a goal is ticked', { priority: 'Medium' }),
  ticket('OSC-436', 'Remove the old onboarding survey'),
]

export const FOUND: GroupTicket[] = [
  ticket(
    'OSC-287',
    'Renewal reminder sent a day early',
    started('Done', { statusCategory: 'done', priority: 'High' }),
  ),
  WORKED,
  ticket('OSC-433', 'Goals list jumps when a goal is ticked', { priority: 'Medium' }),
]

export const listOf = (
  tickets: GroupTicket[],
  over: Partial<GroupTicketList> = {},
): GroupTicketList => ({
  connected: true,
  access: 'read-write',
  tickets,
  reviewOfferCount: 0,
  ...over,
})

export const read = (list: GroupTicketList): GroupTicketSection => ({
  list,
  readError: null,
  loadingMore: false,
})

export const NOT_READ: GroupTicketSection = { list: undefined, readError: null, loadingMore: false }

/** The one tab the Yours / Others scenes show: the open sprint, every action a side can take there. */
export const SPRINT_TAB: GroupTicketTab = {
  id: 'sprint',
  name: 'In the sprint',
  statuses: [],
  sprint: 'open',
  yours: ['take', 'carry-on', 'review', 'discuss'],
  others: ['take', 'review', 'discuss'],
}

/** A tab's list from the person's side and everyone else's, read on their own. */
function bothSides(mine: GroupTicketSection, others: GroupTicketSection): GroupTicketSection {
  const readError = mine.readError ?? others.readError
  if (!mine.list && !others.list) return { ...NOT_READ, readError }
  const connected = mine.list?.connected !== false && others.list?.connected !== false
  const nextPageToken = others.list?.nextPageToken ?? mine.list?.nextPageToken
  const nextTicketKey = mine.list?.nextTicketKey
  return {
    list: {
      connected,
      access: 'read-write',
      tickets: [
        ...(mine.list?.tickets ?? []).map((t) => ({ ...t, mine: true })),
        ...(others.list?.tickets ?? []).map((t) => ({ ...t, mine: false })),
      ],
      reviewOfferCount: Math.max(
        mine.list?.reviewOfferCount ?? 0,
        others.list?.reviewOfferCount ?? 0,
      ),
      ...(nextTicketKey ? { nextTicketKey } : {}),
      ...(nextPageToken ? { nextPageToken } : {}),
    },
    readError,
    loadingMore: false,
  }
}

/** What a scene changes: the person's side as `mine`, everyone else's as `sprint`, anything else as it is. */
export type TicketsStateOver = Partial<Omit<GroupTicketsState, 'mine'>> & {
  mine?: GroupTicketSection
  sprint?: GroupTicketSection
}

/** The sprint as a group with Jira sees it, in one tab; each state changes what it needs to. */
export const ticketsState = (over: TicketsStateOver = {}): GroupTicketsState => {
  const {
    mine = read(listOf(MINE, { nextTicketKey: NEXT.key })),
    sprint = read(listOf(OTHERS)),
    ...rest
  } = over
  return {
    mine: NOT_READ,
    tabs: { tabs: [SPRINT_TAB], custom: true, readError: null },
    tab: undefined,
    byTab: { [SPRINT_TAB.id]: bothSides(mine, sprint) },
    tabCounts: {
      [SPRINT_TAB.id]: (mine.list?.tickets.length ?? 0) + (sprint.list?.tickets.length ?? 0),
    },
    search: { ...NOT_READ, query: '' },
    starting: undefined,
    startError: null,
    reviewing: {},
    offers: {},
    offerError: null,
    ...rest,
  }
}

/** The rest of the sprint once a colleague's ticket in review has a review of its own. */
export const OTHERS_REVIEWED: GroupTicket[] = OTHERS.map((t) =>
  t.key === 'OSC-402' ? { ...t, reviewOpen: true } : t,
)
