import type {
  ReviewFindingKind,
  ReviewFindingState,
  ReviewVerdict,
  ReviewWaitingOnState,
} from 'thefactory-tools/types'
import type { ColleagueReviewCardLayout, ReviewFindingGroupId } from './colleagueReviewCardTypes'
import type { ProcessStatusTone } from './processView'

export const COLLEAGUE_REVIEW_CARD_LAYOUTS: readonly ColleagueReviewCardLayout[] = [
  'stacked',
  'rounds',
  'summary',
]

/** The layout that ships. */
export const COLLEAGUE_REVIEW_CARD_DEFAULT_LAYOUT: ColleagueReviewCardLayout = 'stacked'

export const COLLEAGUE_REVIEW_CARD_LAYOUT_LABELS: Record<ColleagueReviewCardLayout, string> = {
  stacked: 'One stack',
  rounds: 'A tab per round',
  summary: 'A line that opens',
}

export const REVIEW_VERDICT_VIEW: Record<
  ReviewVerdict,
  { label: string; tone: ProcessStatusTone }
> = {
  approve: { label: 'Approve', tone: 'done' },
  'approve-with-notes': { label: 'Approve with notes', tone: 'review' },
  'changes-requested': { label: 'Changes requested', tone: 'working' },
}

export const REVIEW_FINDING_KIND_LABELS: Record<ReviewFindingKind, string> = {
  change: 'Change',
  request: 'Request',
  small: 'Small',
  question: 'Question',
}

export const REVIEW_FINDING_STATE_VIEW: Record<
  ReviewFindingState,
  { label: string; tone: ProcessStatusTone }
> = {
  open: { label: 'Open', tone: 'working' },
  'still-open': { label: 'Still open', tone: 'working' },
  fixed: { label: 'Fixed', tone: 'done' },
  'no-longer-applies': { label: 'No longer applies', tone: 'empty' },
  dropped: { label: 'Dropped by you', tone: 'queued' },
}

export const REVIEW_WAITING_STATE_VIEW: Record<
  ReviewWaitingOnState,
  { label: string; tone: ProcessStatusTone }
> = {
  outstanding: { label: 'Waiting', tone: 'on_hold' },
  given: { label: 'Given', tone: 'done' },
}

export const REVIEW_FINDING_GROUP_LABELS: Record<ReviewFindingGroupId, string> = {
  fixed: 'Fixed since last round',
  stillOpen: 'Still open',
  raised: 'New',
  noLongerApplies: 'No longer applies',
  dropped: 'Dropped by you',
  toCheck: 'To check this round',
}

/** The order a round's groups are listed in. */
export const REVIEW_FINDING_GROUP_ORDER: readonly ReviewFindingGroupId[] = [
  'toCheck',
  'fixed',
  'stillOpen',
  'raised',
  'noLongerApplies',
  'dropped',
]

export const COLLEAGUE_REVIEW_CARD_TEXT = {
  heading: 'Review',
  round: (n: number, of: number) => `Round ${n} of ${of}`,
  roundTab: (n: number) => `Round ${n}`,
  reviewing: 'Being reviewed',
  found: 'Found',
  waitingOn: 'Waiting on',
  reply: 'Reply',
  replyHint: 'Post it in Slack yourself.',
  copy: 'Copy',
  copied: 'Copied',
  drop: 'Drop',
  given: 'Given',
  givenByYou: 'Given · by you',
  note: 'Note (optional)',
  cancel: 'Cancel',
  evidence: 'Evidence',
  noEvidence: 'No evidence given.',
  earlier: (count: number) => (count === 1 ? 'Earlier round' : `Earlier rounds (${count})`),
  later: (latest: number) => `Round ${latest} is the latest: act on it there.`,
  showAll: 'Show findings',
  hideAll: 'Hide findings',
  nothingFound: 'Nothing to fix.',
  loading: 'Reading the review…',
  none: (key: string) => `No review of ${key} yet.`,
  noTicket: 'This chat is not a ticket’s review.',
  readFailed: 'Could not read the review.',
  refused: 'Not recorded. The agent was told why:',
  dropFailed: 'The finding was not dropped.',
  givenFailed: 'It was not marked given.',
  files: (count: number) => `${count} file${count === 1 ? '' : 's'}`,
  summaryFixed: (n: number) => `${n} fixed`,
  summaryStillOpen: (n: number) => `${n} still open`,
  summaryRaised: (n: number, first: boolean) => (first ? `${n} found` : `${n} new`),
  summaryNoLonger: (n: number) => `${n} no longer apply`,
  summaryDropped: (n: number) => `${n} dropped`,
  summaryToCheck: (n: number) => `${n} to check`,
  summaryWaiting: (n: number) => `waiting on ${n}`,
} as const
