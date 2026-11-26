import {
  reviewReplyView,
  type ReviewReplyView,
  type UseReviewChatSlot,
} from 'thefactory-ui/headless'
import { COMMITS_NEW, COMMITS_NONE, TABS_NOW } from './groupTicketTabsFixtures'

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

/** An inline review chat's slot on fixed data. */
export const chatSlot = (over: Partial<UseReviewChatSlot> = {}): UseReviewChatSlot => ({
  kind: undefined,
  runLine: undefined,
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

/** OSC-409's inline chat while a later round of its review goes as a run. */
export const RUN_ELSEWHERE_SAID: Said[] = [
  {
    who: 'Agent',
    text: 'Round 2 is recorded: approve with notes. The reply is posted in Aashan’s thread.',
  },
  { who: 'You', text: 'What did round 1 say about the currency fallback?' },
  {
    who: 'Agent',
    text: 'Round 1 asked for the billing country to decide the currency, as checkout does. Round 3 is being reviewed in its run.',
  },
]

/** What an inline review chat said last before its slot. */
export const chatSaid = (kind: UseReviewChatSlot['kind']): Said[] =>
  kind === 'run-link' ? RUN_ELSEWHERE_SAID : REPLY_SAID
