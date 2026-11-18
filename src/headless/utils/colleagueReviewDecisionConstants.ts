import type { ReviewDecisionAction } from './colleagueReviewDecisionTypes'

/** The tool a review chat's agent ends an inline round with: the person's decision card. */
export const ASK_COLLEAGUE_REVIEW_DECISION_TOOL_NAME = 'askColleagueReviewDecision'

/** Send the reply, as the person edited it, in the update's Slack thread. */
export const REVIEW_DECISION_SEND_REPLY = 'send-reply'

/** Approve the round's pull requests and merge them. */
export const REVIEW_DECISION_APPROVE_AND_MERGE = 'approve-and-merge'

/** Keep reviewing with the person's note: the round goes again. */
export const REVIEW_DECISION_KEEP_REVIEWING = 'request-changes'

/** Stop here: nothing is posted or merged. */
export const REVIEW_DECISION_STOP = 'abandon'

/** The card's own words for the choices it knows, whichever side offers them. */
export const REVIEW_DECISION_LABELS: Readonly<Record<string, string>> = {
  [REVIEW_DECISION_SEND_REPLY]: 'Send in Slack',
  [REVIEW_DECISION_APPROVE_AND_MERGE]: 'Approve & merge',
  [REVIEW_DECISION_KEEP_REVIEWING]: 'Keep reviewing',
  [REVIEW_DECISION_STOP]: 'Stop',
}

/** What a review chat's card offers, in order. */
export const INLINE_REVIEW_DECISION_ACTIONS: readonly ReviewDecisionAction[] = [
  {
    id: REVIEW_DECISION_SEND_REPLY,
    label: REVIEW_DECISION_LABELS[REVIEW_DECISION_SEND_REPLY]!,
    primary: true,
    editsText: true,
    noteRequired: false,
  },
  {
    id: REVIEW_DECISION_APPROVE_AND_MERGE,
    label: REVIEW_DECISION_LABELS[REVIEW_DECISION_APPROVE_AND_MERGE]!,
    primary: false,
    editsText: false,
    noteRequired: false,
  },
  {
    id: REVIEW_DECISION_KEEP_REVIEWING,
    label: REVIEW_DECISION_LABELS[REVIEW_DECISION_KEEP_REVIEWING]!,
    primary: false,
    editsText: false,
    noteRequired: true,
  },
  {
    id: REVIEW_DECISION_STOP,
    label: REVIEW_DECISION_LABELS[REVIEW_DECISION_STOP]!,
    primary: false,
    editsText: false,
    noteRequired: false,
  },
]

export const REVIEW_DECISION_TEXT = {
  title: (ticketKey: string) => `Your call on ${ticketKey}`,
  titleNoTicket: 'Your call on the review',
  reply: 'Reply',
  replyHint: 'Edit it before it is sent, if you like.',
  note: 'What to look at next',
  notePlaceholder: 'e.g. Check the Monday-start locale too.',
  emptyReply: 'The reply is empty.',
  noteNeeded: 'Say what to look at next.',
  cancel: 'Cancel',
  later: 'Later',
  reading: 'Reading the round…',
  stopTitle: 'Stop the review?',
  stopBody: 'Nothing is posted or merged.',
  stopConfirm: 'Stop',
  mergeTitle: 'Approve and merge?',
  mergeBody: 'The round’s pull requests are approved and merged, the backend’s first.',
  mergeNone: 'The round lists no pull requests.',
  mergeConfirm: 'Approve & merge',
  failed: 'Your choice did not go through.',
  personOnly: 'Only you can decide here.',
  chose: (label: string) => `You chose: ${label}`,
} as const
