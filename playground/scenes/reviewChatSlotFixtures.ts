import {
  reviewReplyView,
  runReviewDecisionActions,
  type ReviewDecisionAction,
  type ReviewReplyView,
  type UseReviewChatSlot,
} from 'thefactory-ui/headless'
import { COMMITS_NEW, COMMITS_NONE, TABS_NOW } from './groupTicketTabsFixtures'
import { REVIEW_RUN_CHOICES } from './slackReviewFixtures'

const noop = () => undefined

const AGO = (minutes: number) => new Date(TABS_NOW - minutes * 60_000).toISOString()

/** Aashan's reply in the update's thread, waiting to start round 3 of OSC-409's inline review. */
export const CHAT_REPLY: ReviewReplyView = reviewReplyView(
  {
    id: 'o-3',
    kind: 'next-round',
    state: 'new',
    author: 'Aashan Shah',
    postedAt: AGO(45),
    text: 'Pushed the fix for the Irish currency: the plan page now reads it from the billing country, as checkout does. Recording attached.',
    files: 2,
  },
  2,
  TABS_NOW,
  COMMITS_NEW,
)

/** A long reply that only wrote back: nothing pushed since round 2. */
export const CHAT_REPLY_LONG: ReviewReplyView = reviewReplyView(
  {
    id: 'o-4',
    kind: 'next-round',
    state: 'new',
    author: 'Aashan Shah',
    postedAt: AGO(10),
    text: [
      'Thanks for the review. Before I change anything:',
      '1. The fallback to GBP is what product asked for in the ticket.',
      '2. The upgrade sheet is out of scope, it has its own ticket.',
      '3. Happy to rename the constant if you still want it.',
      'Can you confirm 1 and 2 before I push?',
      'I will wait for your answer.',
    ].join('\n'),
    files: 0,
  },
  2,
  TABS_NOW,
  COMMITS_NONE,
)

/** The run's approval actions, as RunReviewDecisionCard offers them. */
export const CHAT_RUN_ACTIONS: ReviewDecisionAction[] = runReviewDecisionActions(REVIEW_RUN_CHOICES)

/** A review chat's composer slot on fixed data. */
export const chatSlot = (over: Partial<UseReviewChatSlot> = {}): UseReviewChatSlot => ({
  kind: undefined,
  run: undefined,
  liveRun: undefined,
  answerGate: async () => true,
  carryOn: async () => true,
  reply: undefined,
  starting: false,
  startError: undefined,
  start: noop,
  notNow: noop,
  ...over,
})

/** What the chat said last, above its composer's place. */
export type Said = { who: string; text: string }

export const REPLY_TICKET = 'OSC-409'

const REPLY_SAID: Said[] = [
  {
    who: 'Agent',
    text: 'Round 2 is recorded: approve with notes. The reply is posted in Aashan’s thread.',
  },
  {
    who: 'Overseer',
    text: `${REPLY_TICKET}: Aashan Shah replied.\n\nPushed the fix for the Irish currency…\n\nStart round 3 from the card under the chat when you are ready.`,
  },
]

export const DECISION_SAID: Said[] = [
  {
    who: 'Agent',
    text: 'Round 2 is recorded: changes requested, one finding still open. The reply is drafted for your call.',
  },
]

const OUTSIDE_SAID: Said[] = [
  { who: 'Agent', text: 'Round 1 is recorded and the reply is posted in Saif’s thread.' },
  {
    who: 'Overseer',
    text: 'ZNR-767: Saif replied.\n\nFixed the retry and added the test…\n\nStart round 2 on the run when you are ready.',
  },
]

const PUSH_SAID: Said[] = [
  {
    who: 'Agent',
    text: 'Approve & merge: dev is brought into each pull request. One conflict was resolved and its checks ran.',
  },
]

/** What a review chat said last before its slot's card. */
export const chatSaid = (kind: UseReviewChatSlot['kind']): Said[] =>
  kind === 'run-outside' ? OUTSIDE_SAID : kind === 'run-push' ? PUSH_SAID : REPLY_SAID
