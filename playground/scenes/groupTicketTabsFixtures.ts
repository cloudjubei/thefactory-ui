import {
  groupTicketPageView,
  groupTicketTabsEditorView,
  reviewCardMerge,
  type GroupTicket,
  type GroupTicketOverview,
  type GroupTicketPageState,
  type GroupTicketsState,
  type GroupTicketTab,
  type GroupTicketTabsEditorView,
  type ReviewCardMerge,
  type ReviewMergeJob,
  type ReviewMergeSnapshot,
  type ReviewCommitsView,
} from 'thefactory-ui/headless'
import { listOf, NOT_READ, read, ticket } from './groupTicketsFixtures'
import { ROUND_TWO_PRS, ROUND_TWO_WITH_PRS } from './slackReviewFixtures'

/** Every ticket scene is told against this time. */
export const TABS_NOW = Date.parse('2026-11-19T12:00:00.000Z')
const AGO = (minutes: number) => new Date(TABS_NOW - minutes * 60_000).toISOString()

/** The tabs a group gets before it sets any: Jira's status categories. */
export const DEFAULT_TABS: GroupTicketTab[] = [
  {
    id: 'to-do',
    name: 'To do',
    statuses: [],
    categories: ['new'],
    sprint: 'open',
    yours: ['take', 'discuss'],
    others: ['take', 'discuss'],
  },
  {
    id: 'in-progress',
    name: 'In progress',
    statuses: [],
    categories: ['indeterminate'],
    sprint: 'open',
    yours: ['carry-on', 'discuss'],
    others: ['discuss'],
  },
  {
    id: 'done',
    name: 'Done',
    statuses: [],
    categories: ['done'],
    sprint: 'open',
    yours: ['discuss'],
    others: ['discuss'],
  },
]

/** OSC's own tabs, as its group set them. */
export const OSC_TABS: GroupTicketTab[] = [
  {
    id: 'pending',
    name: 'Pending',
    statuses: ['To Do', 'Ready'],
    sprint: 'open',
    yours: ['take', 'discuss'],
    others: ['take', 'discuss'],
  },
  {
    id: 'in-progress',
    name: 'In progress',
    statuses: ['In Progress'],
    sprint: 'open',
    yours: ['carry-on', 'discuss'],
    others: ['discuss'],
  },
  {
    id: 'in-review',
    name: 'In review',
    statuses: ['In Review', 'Code Review'],
    sprint: 'open',
    yours: ['replies', 'approve-and-merge', 'discuss'],
    others: ['review', 'discuss'],
  },
  {
    id: 'in-qa',
    name: 'In QA',
    statuses: ['In QA'],
    sprint: 'open',
    yours: ['discuss'],
    others: ['discuss'],
  },
  {
    id: 'done',
    name: 'Done',
    statuses: [],
    categories: ['done'],
    sprint: 'any',
    yours: ['discuss'],
    others: ['discuss'],
  },
  {
    id: 'icebox',
    name: 'Icebox',
    statuses: [],
    sprint: 'not-open',
    yours: ['take', 'discuss'],
    others: ['take', 'discuss'],
  },
]

const OSC_COUNTS = {
  pending: 4,
  'in-progress': 3,
  'in-review': 3,
  'in-qa': 2,
  done: 18,
  icebox: 41,
}

const inProgress = (over: Partial<GroupTicket> = {}): Partial<GroupTicket> => ({
  status: 'In Progress',
  statusCategory: 'indeterminate',
  canTake: false,
  ...over,
})

const inReview = (over: Partial<GroupTicket> = {}): Partial<GroupTicket> => ({
  status: 'In Review',
  statusCategory: 'indeterminate',
  canTake: false,
  ...over,
})

export const PENDING_TICKETS: GroupTicket[] = [
  ticket('OSC-418', 'Check-in reminders skip people on a paused plan', {
    priority: 'Highest',
    mine: true,
    tabId: 'pending',
  }),
  ticket('OSC-430', 'Add an empty state to the goals list', {
    priority: 'Low',
    mine: true,
    tabId: 'pending',
  }),
  ticket('OSC-433', 'Goals list jumps when a goal is ticked', {
    priority: 'Medium',
    mine: false,
    assignee: 'Tom Reid',
    tabId: 'pending',
  }),
  ticket('OSC-436', 'Remove the old onboarding survey', { mine: false, tabId: 'pending' }),
]

export const IN_PROGRESS_TICKETS: GroupTicket[] = [
  ticket(
    'OSC-412',
    'Show the renewal date on the plan page',
    inProgress({
      priority: 'High',
      mine: true,
      tabId: 'in-progress',
      groupStory: { id: 'gs-renewal', title: 'Renewal date on the plan page' },
      chatOpen: true,
    }),
  ),
  ticket(
    'OSC-415',
    'A very long ticket title that someone pasted from a support thread, with the whole of the customer’s first sentence kept in it and more besides',
    inProgress({ mine: false, assignee: 'Tom Reid', tabId: 'in-progress' }),
  ),
  ticket(
    'OSC-421',
    'Coach notes lose their line breaks after an edit',
    inProgress({ mine: false, assignee: 'Priya Shah', tabId: 'in-progress' }),
  ),
]

export const IN_REVIEW_TICKETS: GroupTicket[] = [
  ticket(
    'OSC-409',
    'Plan page shows the wrong currency for people in Ireland',
    inReview({
      priority: 'High',
      mine: true,
      tabId: 'in-review',
      reviewOpen: true,
      groupStory: { id: 'gs-currency', title: 'Currency on the plan page' },
      replies: { slack: 2, github: 3, latest: AGO(40) },
    }),
  ),
  ticket(
    'OSC-411',
    'Export coach notes as a PDF',
    inReview({ mine: true, tabId: 'in-review', replies: { slack: 0, github: 0 } }),
  ),
  ticket(
    'OSC-402',
    'Weekly review email has the wrong week number',
    inReview({
      priority: 'Medium',
      mine: false,
      assignee: 'Priya Shah',
      tabId: 'in-review',
      reviewOpen: true,
      reviewOffer: {
        id: 'offer-priya-2',
        kind: 'next-round',
        author: 'Priya Shah',
        postedAt: AGO(25),
        permalink: 'https://acme.slack.com/archives/C07REVIEWS/p1763380600000200',
        state: 'new',
        files: 2,
      },
    }),
  ),
]

const replyOffer = (
  id: string,
  author: string,
  minutesAgo: number,
  files = 0,
): NonNullable<GroupTicket['reviewOffer']> => ({
  id,
  kind: 'next-round',
  author,
  postedAt: AGO(minutesAgo),
  permalink: `https://acme.slack.com/archives/C07REVIEWS/p17633806${String(minutesAgo).padStart(4, '0')}00300`,
  state: 'new',
  files,
})

/** In review with everyone else's tickets split: four under review, two not reviewed yet. */
export const REVIEWING_TICKETS: GroupTicket[] = [
  IN_REVIEW_TICKETS[0]!,
  ticket(
    'OSC-398',
    'Streak counter resets at midnight in the wrong time zone',
    inReview({ mine: false, assignee: 'Tom Reid', tabId: 'in-review', reviewOpen: true }),
  ),
  ticket(
    'OSC-402',
    'Weekly review email has the wrong week number',
    inReview({
      priority: 'Medium',
      mine: false,
      assignee: 'Priya Shah',
      tabId: 'in-review',
      reviewOpen: true,
      reviewOffer: replyOffer('offer-priya-2', 'Priya Shah', 25, 2),
    }),
  ),
  ticket(
    'OSC-405',
    'Coach can see notes from a client who left the programme',
    inReview({
      priority: 'High',
      mine: false,
      assignee: 'Aashan Patel',
      tabId: 'in-review',
      reviewOpen: true,
      reviewOffer: replyOffer('offer-aashan-3', 'Aashan Patel', 70),
    }),
  ),
  ticket(
    'OSC-407',
    'Goal reminders send twice after a plan change',
    inReview({ mine: false, assignee: 'Saif Khan', tabId: 'in-review', reviewOpen: true }),
  ),
  ticket(
    'OSC-414',
    'Sign-up form keeps the old email after a typo is fixed',
    inReview({ mine: false, assignee: 'Tom Reid', tabId: 'in-review' }),
  ),
  ticket(
    'OSC-417',
    'Dark mode: the plan card border disappears',
    inReview({ priority: 'Low', mine: false, assignee: 'Priya Shah', tabId: 'in-review' }),
  ),
]

/** What each reviewed ticket's pull requests did since its last round, as the list reads it. */
export const REVIEWING_COMMITS: Readonly<Record<string, ReviewCommitsView>> = {
  'OSC-402': { label: '3 new commits', tone: 'news' },
  'OSC-405': { label: 'No new commits', tone: 'quiet' },
  'OSC-407': { label: 'Rewritten since review', tone: 'warn' },
  'OSC-398': { label: 'No new commits', tone: 'quiet' },
}

/** OSC's Tickets tab: its six tabs, `tab` on screen read from `tickets`. */
export function oscTickets(
  tab: string,
  tickets: GroupTicket[],
  over: Partial<GroupTicketsState> = {},
): GroupTicketsState {
  return {
    mine: NOT_READ,
    tabs: { tabs: OSC_TABS, custom: true, readError: null },
    tab,
    byTab: {
      [tab]: read(
        listOf(tickets, {
          reviewOfferCount: tickets.filter((t) => t.reviewOffer?.state === 'new').length,
          ...(tab === 'pending' ? { nextTicketKey: 'OSC-418' } : {}),
        }),
      ),
    },
    tabCounts: OSC_COUNTS,
    search: { ...NOT_READ, query: '' },
    starting: undefined,
    startError: null,
    reviewing: {},
    offers: {},
    offerError: null,
    ...over,
  }
}

/** A group with no tabs of its own: the defaults, on To do. */
export function defaultTickets(): GroupTicketsState {
  const toDo = PENDING_TICKETS.map((t) => ({ ...t, tabId: 'to-do' }))
  return {
    ...oscTickets('to-do', toDo),
    tabs: { tabs: DEFAULT_TABS, custom: false, readError: null },
    tabCounts: { 'to-do': 4, 'in-progress': 6, done: 18 },
  }
}

/** OSC's In QA tab with nothing in it. */
export function emptyTab(): GroupTicketsState {
  return { ...oscTickets('in-qa', []), tabCounts: { ...OSC_COUNTS, 'in-qa': 0 } }
}

const PRIYA_TEXT = `OSC-409 round 2 is up:
BE https://github.com/acme/coach-be/pull/418
FE https://github.com/acme/coach-web/pull/77
Currency now comes from the person's billing country, so Ireland shows €.`

/** Everything about OSC-409, the person's ticket in review. */
export const OVERVIEW_FULL: GroupTicketOverview = {
  ticket: {
    key: 'OSC-409',
    url: 'https://acme.atlassian.net/browse/OSC-409',
    summary: 'Plan page shows the wrong currency for people in Ireland',
    status: 'In Review',
    statusCategory: 'indeterminate',
    priority: 'High',
    assignee: 'Kamil Nowak',
    sprint: { name: 'OSC Sprint 47', open: true },
    description:
      'People in Ireland see prices in £ on the plan page.\n\nSteps: sign in as an Irish test account, open Plan. Expected: € everywhere, as on checkout.',
    updatedAt: AGO(35),
    mine: true,
  },
  tabId: 'in-review',
  actions: ['replies', 'approve-and-merge', 'discuss'],
  updates: [
    {
      id: 'u-2',
      kind: 'next-round',
      author: 'Kamil Nowak',
      postedAt: AGO(95),
      permalink: 'https://acme.slack.com/archives/C07REVIEWS/p1763380000000900',
      state: 'started',
      files: 2,
      text: PRIYA_TEXT,
      fileNames: ['plan-ireland-after.png', 'checkout-ireland.png'],
    },
    {
      id: 'u-1',
      kind: 'first-round',
      author: 'Kamil Nowak',
      postedAt: AGO(60 * 26),
      permalink: 'https://acme.slack.com/archives/C07REVIEWS/p1763290000000100',
      state: 'dismissed',
      files: 0,
      text: 'OSC-409 ready for review https://github.com/acme/coach-be/pull/411',
      fileNames: [],
    },
  ],
  review: {
    rounds: [
      {
        n: 1,
        verdict: 'changes-requested',
        startedAt: AGO(60 * 25),
        recordedAt: AGO(60 * 24),
        postedReply: {
          permalink: 'https://acme.slack.com/archives/C07REVIEWS/p1763291000000150',
          postedAt: AGO(60 * 24),
        },
      },
      { n: 2, verdict: 'approve-with-notes', startedAt: AGO(90), recordedAt: AGO(70) },
    ],
    openFindings: 1,
    runs: [
      { id: 'run-r1', status: 'succeeded', round: 1, projectId: 'coach-be' },
      { id: 'run-r2', status: 'parked', round: 2, projectId: 'coach-be' },
    ],
  },
  pullRequests: [
    {
      url: 'https://github.com/acme/coach-be/pull/418',
      repo: 'coach-be',
      number: 418,
      title: 'Currency from the billing country',
      state: 'open',
      checks: 'passing',
    },
    {
      url: 'https://github.com/acme/coach-web/pull/77',
      repo: 'coach-web',
      number: 77,
      title: 'Plan page reads the currency from the API',
      state: 'open',
      checks: 'pending',
    },
  ],
  story: {
    id: 'gs-currency',
    title: 'Currency on the plan page',
    parts: [
      { projectId: 'coach-be', storyId: 's-be', title: 'Currency from billing', status: 'Done' },
      {
        projectId: 'coach-web',
        storyId: 's-web',
        title: 'Plan page currency',
        status: 'In review',
      },
    ],
  },
  chats: [
    {
      context: { type: 'GROUP_TOPIC', groupId: 'osc', topicId: 'review-OSC-409' } as never,
      chatContextId: 'c-review',
      title: 'Review · OSC-409',
      updatedAt: AGO(70),
    },
    {
      context: { type: 'GROUP_TOPIC', groupId: 'osc', topicId: 'ticket-OSC-409' } as never,
      chatContextId: 'c-ticket',
      title: 'OSC-409 · Plan page currency',
      updatedAt: AGO(60 * 30),
    },
  ],
}

/** The same ticket with GitHub and the chats failing: the rest still shows. */
export const OVERVIEW_PART_FAILED: GroupTicketOverview = {
  ...OVERVIEW_FULL,
  pullRequests: [],
  chats: [],
  problems: ['pullRequests', 'chats'],
}

/** A colleague's ticket nobody reviews or works on yet: its update shows, its pull requests as plain links, nothing read from GitHub. */
export const OVERVIEW_LINKS_ONLY: GroupTicketOverview = (() => {
  const { review: _review, story: _story, ...rest } = OVERVIEW_FULL
  return {
    ...rest,
    ticket: { ...OVERVIEW_FULL.ticket!, assignee: 'Priya Shah', mine: false },
    actions: ['review', 'discuss'],
    updates: [{ ...OVERVIEW_FULL.updates[0]!, kind: 'first-round', state: 'new' }],
    pullRequests: OVERVIEW_FULL.pullRequests.map(({ url, repo, number }) => ({
      url,
      repo,
      number,
    })),
    chats: [],
  }
})()

/** A ticket Jira could not be read for. */
export const OVERVIEW_NO_TICKET: GroupTicketOverview = (() => {
  const { ticket: _gone, ...rest } = OVERVIEW_FULL
  return { ...rest, problems: ['ticket'] }
})()

export const pageState = (
  overview: GroupTicketOverview,
  commits?: ReviewCommitsView,
): GroupTicketPageState => ({
  kind: 'page',
  page: groupTicketPageView('OSC-409', overview, OSC_TABS, TABS_NOW, commits),
  refreshing: false,
})

/** Commits pushed on the ticket's pull requests since its review's last round. */
export const COMMITS_NEW: ReviewCommitsView = { label: '3 new commits', tone: 'news' }

/** Nothing pushed since the last round. */
export const COMMITS_NONE: ReviewCommitsView = { label: 'No new commits', tone: 'quiet' }

/** A pull request's history rewritten since the last round. */
export const COMMITS_REWRITTEN: ReviewCommitsView = {
  label: 'Rewritten since review',
  tone: 'warn',
}

const AASHAN_TEXT =
  'Pushed the fix for the Irish currency: the plan page now reads it from the billing country, as checkout does.'

const AASHAN_LONG = [
  'Thanks for the review, all three points are in:',
  '1. Currency now comes from the billing country on the plan page and on the upgrade sheet.',
  '2. The fallback is the account country, then GBP, with a test for each.',
  '3. I renamed `PLAN_CURRENCY_FALLBACK` to `PLAN_DEFAULT_CURRENCY` as you asked.',
  'The recording of the Irish account is in the thread above.',
  'Let me know if the e2e should cover the upgrade sheet too.',
].join('\n')

/** A reply in the update's thread, waiting to start round 3. */
const pageReplyOffer = (over: Partial<GroupTicketOverview['updates'][number]> = {}) => ({
  id: 'u-3',
  kind: 'next-round' as const,
  author: 'Aashan Shah',
  postedAt: AGO(60),
  permalink: 'https://acme.slack.com/archives/C07REVIEWS/p1763390000000950',
  state: 'new' as const,
  files: 0,
  text: AASHAN_TEXT,
  fileNames: [] as string[],
  ...over,
})

const INLINE_REVIEW: GroupTicketOverview['review'] = {
  ...OVERVIEW_FULL.review!,
  runs: [],
}

const withReply = (
  reply: ReturnType<typeof pageReplyOffer>,
  review: GroupTicketOverview['review'] = INLINE_REVIEW,
): GroupTicketOverview => ({
  ...OVERVIEW_FULL,
  updates: [reply, ...OVERVIEW_FULL.updates],
  ...(review ? { review } : {}),
})

/** OSC-409 reviewed inline, Aashan's reply waiting to start round 3. */
export const OVERVIEW_REPLY = withReply(pageReplyOffer())

/** A long reply, cut on the page. */
export const OVERVIEW_REPLY_LONG = withReply(pageReplyOffer({ text: AASHAN_LONG }))

/** A reply with two files. */
export const OVERVIEW_REPLY_FILES = withReply(
  pageReplyOffer({ files: 2, fileNames: ['plan-ireland-after.png', 'upgrade-sheet.mov'] }),
)

/** A reply while the round 2 review run still holds the review: it starts its own round. */
export const OVERVIEW_REPLY_RUN = withReply(pageReplyOffer(), OVERVIEW_FULL.review)

/** No reply yet, but the pull requests moved since the last round. */
export const OVERVIEW_PUSHED: GroupTicketOverview = { ...OVERVIEW_FULL, review: INLINE_REVIEW }

const mergeJob = (over: Partial<ReviewMergeJob>): ReviewMergeJob => ({
  jobId: 'merge-2',
  groupId: 'osc',
  ticketKey: 'OSC-402',
  round: 2,
  state: 'merged',
  startedAt: '2026-11-17T12:00:00.000Z',
  finishedAt: '2026-11-17T12:09:00.000Z',
  pullRequests: ROUND_TWO_PRS.map((pr) => ({ url: pr.url, state: 'merged' as const })),
  summary: 'Both pull requests merged.',
  slack: {
    posted: true,
    permalink: 'https://acme.slack.com/archives/C07REVIEWS/p1763381400000400',
  },
  ...over,
})

/** Merged, and the ticket moved to the group's merged status. */
export const MERGE_MOVED = mergeJob({
  ticket: { moved: true, status: 'In QA', from: 'In Review', detail: 'Moved OSC-402 to In QA' },
})

/** Merged, and Jira refused the move. */
export const MERGE_NOT_MOVED = mergeJob({
  ticket: {
    moved: false,
    status: 'In QA',
    from: 'In Review',
    error: 'OSC-402 not moved: Jira has no transition from In Review to In QA.',
  },
})

const NO_MERGE: ReviewMergeSnapshot = {
  job: null,
  readError: undefined,
  starting: undefined,
  refusal: undefined,
  actionError: undefined,
  choosing: undefined,
}

export const mergeWith = (job: ReviewMergeJob | null): ReviewCardMerge =>
  reviewCardMerge(ROUND_TWO_WITH_PRS, 2, { ...NO_MERGE, job })!

export const editorView = (
  tabs: GroupTicketTab[],
  custom: boolean,
  over: { saving?: number; saveError?: string } = {},
): GroupTicketTabsEditorView =>
  groupTicketTabsEditorView({
    tabs: { tabs, custom },
    readError: null,
    saving: over.saving ?? 0,
    saveError: over.saveError ?? null,
  })
