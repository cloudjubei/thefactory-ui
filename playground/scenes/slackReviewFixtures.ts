import type { ColleagueReview } from 'thefactory-tools/types'
import {
  reviewBoxOf,
  reviewCardMerge,
  reviewDecisionPullRequests,
  slackReviewSettingsView,
  type GroupTicket,
  type GroupTicketsState,
  type ProcessParkChoice,
  type ProviderOAuthState,
  type ReviewCardMerge,
  type ReviewMergeJob,
  type ReviewMergeSnapshot,
  type ReviewOffer,
  type ReviewPasteBox,
  type ReviewSourceSnapshot,
  type ReviewSourceStatus,
  type SlackConnectionEntry,
  type SlackReviewSettingsState,
  type TicketReviewOffer,
} from 'thefactory-ui/headless'
import { ROUND_TWO } from './colleagueReviewFixtures'
import { listOf, MINE, NEXT, OTHERS, read, ticketsState } from './groupTicketsFixtures'

/** The moment every Slack scene is drawn at, so “2 hours ago” reads the same on each load. */
export const SLACK_NOW = Date.parse('2026-11-17T12:00:00.000Z')

const API_BASE = 'http://localhost:7001'

export const THREAD_LINK = 'https://acme.slack.com/archives/C07REVIEWS/p1763380000123456'

export const SLACK_CONNECTION: SlackConnectionEntry = {
  id: 'slack-1',
  name: 'Slack',
  provider: 'slack',
  tokenSource: 'oauth',
  config: { clientId: '1234567890.9876543210', teamId: 'T01ACME', teamName: 'Acme', userId: 'U1' },
  createdAt: '2026-11-10T09:00:00.000Z',
  updatedAt: '2026-11-10T09:00:00.000Z',
  hasToken: true,
  hasRefreshToken: true,
}

const NO_OFFERS = { new: 0, started: 0, dismissed: 0 }

const NO_SETTINGS = { skipTicketStatuses: [] }

export const SOURCE_NONE: ReviewSourceStatus = {
  offering: 'ready',
  offers: NO_OFFERS,
  settings: NO_SETTINGS,
}

export const SOURCE_READY: ReviewSourceStatus = {
  source: {
    provider: 'slack',
    connectionId: 'slack-1',
    permalink: THREAD_LINK,
    channel: 'C07REVIEWS',
    threadTs: '1763380000.123456',
    setAt: '2026-11-17T09:00:00.000Z',
  },
  connection: { id: 'slack-1', status: 'connected', name: 'Slack', teamName: 'Acme' },
  offering: 'ready',
  lastPoll: { at: '2026-11-17T11:58:00.000Z', outcome: 'read', replies: 3, offers: 2 },
  offers: { new: 2, started: 4, dismissed: 1 },
  settings: NO_SETTINGS,
}

export const SOURCE_NO_BINDING: ReviewSourceStatus = {
  ...SOURCE_READY,
  offering: 'no-ticket-binding',
  lastPoll: { at: '2026-11-17T11:58:00.000Z', outcome: 'not-offering' },
  offers: NO_OFFERS,
}

export const SOURCE_READ_FAILED: ReviewSourceStatus = {
  ...SOURCE_READY,
  lastPoll: {
    at: '2026-11-17T11:40:00.000Z',
    outcome: 'failed',
    error: 'conversations.replies: ratelimited',
  },
}

export const SOURCE_SIGN_IN_AGAIN: ReviewSourceStatus = {
  ...SOURCE_READY,
  connection: { id: 'slack-1', status: 'sign-in-again', name: 'Slack', teamName: 'Acme' },
  lastPoll: { at: '2026-11-17T11:30:00.000Z', outcome: 'sign-in-again' },
}

/** A thread with every review setting set: two statuses skipped, a reaction, checks run unasked. */
export const SOURCE_SETTINGS_SET: ReviewSourceStatus = {
  ...SOURCE_READY,
  settings: {
    skipTicketStatuses: ['Done', 'Won’t do'],
    startReaction: 'eyes',
    runChecksUnasked: true,
  },
}

/** The same, with Slack refusing the reaction on the last read. */
export const SOURCE_REACTION_FAILED: ReviewSourceStatus = {
  ...SOURCE_SETTINGS_SET,
  lastPoll: {
    at: '2026-11-17T11:58:00.000Z',
    outcome: 'read',
    replies: 3,
    offers: 2,
    reactionError: 'Slack reactions.add: missing_scope',
  },
}

const READY_SIGN_IN: ProviderOAuthState = { step: 'ready', error: null }

type SettingsOptions = {
  status?: ReviewSourceStatus
  connections?: SlackConnectionEntry[]
  oauthSetup?: Record<string, boolean>
  clientId?: string
  signIn?: ProviderOAuthState
  pending?: ReviewSourceSnapshot['pending']
  actionError?: string
}

/** The Slack block's state as the hook hands it over, from fixed data. */
export function slackSettings(options: SettingsOptions = {}): SlackReviewSettingsState {
  const source: ReviewSourceSnapshot = {
    status: options.status ?? SOURCE_READY,
    readError: undefined,
    pending: options.pending,
    actionError: options.actionError,
  }
  return {
    view: slackReviewSettingsView({
      connections: options.connections ?? [SLACK_CONNECTION],
      oauthSetup: options.oauthSetup ?? { slack: true },
      source,
      apiBaseUrl: API_BASE,
      now: SLACK_NOW,
    }),
    clientId: options.clientId ?? '',
    signIn: options.signIn ?? READY_SIGN_IN,
  }
}

export const OFFER_FROM_ANA: TicketReviewOffer = {
  id: 'offer-ana',
  kind: 'first-round',
  author: 'Ana Ruiz',
  postedAt: '2026-11-17T10:05:00.000Z',
  permalink: 'https://acme.slack.com/archives/C07REVIEWS/p1763373900000100',
}

export const OFFER_FROM_PRIYA: TicketReviewOffer = {
  id: 'offer-priya',
  kind: 'next-round',
  author: 'Priya Shah',
  postedAt: '2026-11-17T11:40:00.000Z',
  permalink: 'https://acme.slack.com/archives/C07REVIEWS/p1763379600000200',
}

export const PRIYA_UPDATE = `OSC-402 round 2: fixed the week number for weeks that start on a Sunday, and the email now says “week 47” the way the app does.

PR: https://github.com/acme/coach-api/pull/418
Loom: https://www.loom.com/share/9a2b7c1d (0:40–2:15 shows the Sunday case)
Screenshots of the email in Gmail and Outlook attached.`

export const WHOLE_FROM_PRIYA: ReviewOffer = {
  ...OFFER_FROM_PRIYA,
  groupId: 'osc',
  ticketKey: 'OSC-402',
  provider: 'slack',
  messageTs: '1763379600.000200',
  text: PRIYA_UPDATE,
  attachments: [
    { fileId: 'F1', name: 'weekly-email-gmail.png', size: 182_000 },
    { fileId: 'F2', name: 'weekly-email-outlook.png', size: 201_000 },
  ],
  state: 'new',
  createdAt: '2026-11-17T11:40:05.000Z',
}

const withOffer = (tickets: GroupTicket[], key: string, offer: TicketReviewOffer) =>
  tickets.map((t) => (t.key === key ? { ...t, reviewOffer: offer } : t))

const OTHERS_OFFERED = withOffer(
  withOffer(
    OTHERS.map((t) => (t.key === 'OSC-402' ? { ...t, reviewOpen: true } : t)),
    'OSC-402',
    OFFER_FROM_PRIYA,
  ),
  'OSC-433',
  OFFER_FROM_ANA,
)

/** The sprint with two updates from Slack waiting: a next round on OSC-402, a first one on OSC-433. */
export function offeredTickets(over: Partial<GroupTicketsState> = {}): GroupTicketsState {
  return ticketsState({
    mine: read(listOf(MINE, { nextTicketKey: NEXT.key, reviewOfferCount: 2 })),
    sprint: read(listOf(OTHERS_OFFERED, { reviewOfferCount: 2 })),
    ...over,
  })
}

/** The paste box opened on Priya's update, filled from it. */
export const BOX_FROM_OFFER: ReviewPasteBox = reviewBoxOf(
  'OSC-402',
  true,
  OFFER_FROM_PRIYA,
  WHOLE_FROM_PRIYA,
)

/** The same box the moment it opens, while the update is read. */
export const BOX_READING_OFFER: ReviewPasteBox = reviewBoxOf(
  'OSC-402',
  true,
  OFFER_FROM_PRIYA,
  undefined,
)

/** The box with the person's edit and a file of their own beside Slack's. */
export const BOX_OFFER_EDITED: ReviewPasteBox = {
  ...BOX_FROM_OFFER,
  draft: {
    text: `${PRIYA_UPDATE}\n\nAlso check the Monday-start locale: Priya said it was not tested.`,
    files: [{ file: { name: 'my-notes.md', size: 2_400, blob: new Blob([]) } }],
  },
}

export const POSTED_LINK = 'https://acme.slack.com/archives/C07REVIEWS/p1763380900000300'

/** Round 2 with its reply posted in the thread. */
export const ROUND_TWO_POSTED: ColleagueReview = {
  ...ROUND_TWO,
  rounds: ROUND_TWO.rounds.map((r) =>
    r.n === 2
      ? {
          ...r,
          postedReply: {
            permalink: POSTED_LINK,
            ts: '1763380900.000300',
            postedAt: '2026-11-17T11:55:00.000Z',
          },
        }
      : r,
  ),
}

/** Round 2 posted after the person edited the drafted reply. */
export const ROUND_TWO_POSTED_EDITED: ColleagueReview = {
  ...ROUND_TWO_POSTED,
  rounds: ROUND_TWO_POSTED.rounds.map((r) =>
    r.n === 2 && r.postedReply
      ? {
          ...r,
          postedReply: {
            ...r.postedReply,
            text: 'Thanks Priya, the Sunday case reads right now. One thing left: the email subject still says “Week 46”.',
          },
        }
      : r,
  ),
}

/** Every review setting set, and rounds starting as a run. */
export const SOURCE_RUNS_BY_DEFAULT: ReviewSourceStatus = {
  ...SOURCE_SETTINGS_SET,
  settings: { ...SOURCE_SETTINGS_SET.settings, defaultMode: 'process' },
}

/** Round 2 with its update naming a web and a backend pull request. */
export const ROUND_TWO_WITH_PRS: ColleagueReview = {
  ...ROUND_TWO,
  rounds: ROUND_TWO.rounds.map((r) =>
    r.n === 2
      ? {
          ...r,
          submission: {
            ...r.submission,
            pullRequests: [
              {
                url: 'https://github.com/acme/coach-web/pull/112',
                host: 'github',
                owner: 'acme',
                repo: 'coach-web',
                number: 112,
              },
              {
                url: 'https://github.com/acme/coach-be/pull/390',
                host: 'github',
                owner: 'acme',
                repo: 'coach-be',
                number: 390,
              },
            ],
          },
        }
      : r,
  ),
}

/** Round 2's pull requests as Approve & merge lists them: the backend's first. */
export const ROUND_TWO_PRS = reviewDecisionPullRequests(ROUND_TWO_WITH_PRS)

const mergeJob = (over: Partial<ReviewMergeJob>): ReviewMergeJob => ({
  jobId: 'merge-1',
  groupId: 'osc',
  ticketKey: ROUND_TWO.ticketKey,
  round: 2,
  state: 'running',
  startedAt: '2026-11-17T12:00:00.000Z',
  pullRequests: ROUND_TWO_PRS.map((pr) => ({ url: pr.url, state: 'queued' as const })),
  ...over,
})

const urls = ROUND_TWO_PRS.map((pr) => pr.url)

export const MERGE_RUNNING = mergeJob({
  pullRequests: urls.map((url, at) =>
    at === 0
      ? { url, state: 'merged' as const }
      : {
          url,
          state: 'waiting-for-checks' as const,
          detail: 'Waiting on build, lint (2 of 5 done).',
        },
  ),
})

export const MERGE_MERGED = mergeJob({
  state: 'merged',
  finishedAt: '2026-11-17T12:09:00.000Z',
  pullRequests: urls.map((url) => ({ url, state: 'merged' as const })),
  summary: 'Both pull requests merged.',
  slack: {
    posted: true,
    permalink: 'https://acme.slack.com/archives/C07REVIEWS/p1763381400000400',
  },
})

export const MERGE_FAILED = mergeJob({
  state: 'failed',
  finishedAt: '2026-11-17T12:06:00.000Z',
  pullRequests: urls.map((url, at) =>
    at === 0
      ? { url, state: 'failed' as const, detail: 'Required check “e2e” failed.' }
      : { url, state: 'skipped' as const },
  ),
  summary: 'Stopped at the first pull request: its checks failed. Nothing else was merged.',
  slack: { posted: false, detail: 'Nothing posted: not every pull request merged.' },
})

const NO_MERGE: ReviewMergeSnapshot = {
  job: null,
  readError: undefined,
  starting: undefined,
  refusal: undefined,
  actionError: undefined,
}

/** Approve & merge on round 2 as the card gets it, from a fixed merge. */
export function roundTwoMerge(over: Partial<ReviewMergeSnapshot> = {}): ReviewCardMerge {
  return reviewCardMerge(ROUND_TWO_WITH_PRS, 2, { ...NO_MERGE, ...over })!
}

/** What a colleague review run's approval offers, as the backend raises it. */
export const REVIEW_RUN_CHOICES: ProcessParkChoice[] = [
  {
    choice: 'approve',
    label: 'Send the reply',
    detail: 'Post the reply, as you edited it, where the colleague’s update came from.',
    primary: true,
    action: {
      id: 'send-reply',
      label: 'Send the reply',
      detail: 'Post the reply, as you edited it, where the colleague’s update came from.',
      primary: true,
      editsText: true,
    },
  },
  {
    choice: 'approve',
    label: 'Approve & merge',
    detail: 'Approve the colleague’s pull requests and merge them.',
    action: {
      id: 'approve-and-merge',
      label: 'Approve & merge',
      detail: 'Approve the colleague’s pull requests and merge them.',
    },
  },
  {
    choice: 'request-changes',
    label: 'Send it back',
    detail: 'Review the round again with your note.',
    noteRequired: true,
  },
  { choice: 'abandon', label: 'Stop', detail: 'End the run: nothing is posted or merged.' },
]

/** Round 2's drafted reply. */
export const ROUND_TWO_REPLY = ROUND_TWO.rounds.find((r) => r.n === 2)?.reply ?? ''
