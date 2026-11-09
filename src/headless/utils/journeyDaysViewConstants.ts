import type {
  JourneyDecisionKind,
  JourneyDecisionSource,
  JourneyTakeOverOutcome,
} from 'thefactory-tools/types'

import type { JourneyBadge } from './journeyDaysViewTypes'

const plural = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`

/** Every word of a script step's day view. */
export const JOURNEY_DAYS_COPY = {
  day: (day: number): string => `Day ${day}`,
  days: (count: number): string => plural(count, 'day'),
  decisions: (count: number): string => plural(count, 'decision'),
  live: (count: number): string => `${count} live`,
  takeOvers: (count: number): string => plural(count, 'take-over'),
  turns: (count: number): string => plural(count, 'turn'),
  offered: 'Offered',
  removed: 'Removed',
  replaced: 'Replaced',
  accepted: 'Accepted',
  statuses: 'Statuses',
  journal: 'Journal',
  probe: 'Evening question',
  cards: 'Cards',
  decisionsHeading: 'Decisions',
  takeOversHeading: 'Take-overs',
  stoppedAt: 'Where it stopped',
  wrote: (text: string | undefined): string => (text ? text : 'Wrote an entry.'),
  wroteNothing: 'Wrote nothing.',
  saw: 'Saw',
  noPick: 'No answer picked',
  noLog: 'No day log was filed for this step.',
  logUnreadable: 'The day log could not be read.',
  stillLiving: 'The days are being lived. The day log shows once the script ends.',
  loading: 'Loading…',
  unread: (count: number): string => `${plural(count, 'line')} of the day log could not be read.`,
} as const

/** What each decision is called on its row. */
export const JOURNEY_DECISION_LABELS: Readonly<Record<JourneyDecisionKind, string>> = {
  energy: 'Energy',
  'morning-review': 'Morning review',
  'replacement-pick': 'Replacement',
  'goal-status': 'Goal statuses',
  journal: 'Journal',
  probe: 'Evening question',
  card: 'Card',
  reply: 'Reply',
}

/** Where a decision's answer came from, as its badge says it. */
export const JOURNEY_SOURCE_BADGES: Readonly<Record<JourneyDecisionSource, JourneyBadge>> = {
  plan: { label: 'Plan', tone: 'empty' },
  live: { label: 'Live', tone: 'running' },
}

/** How a take-over ended, as its badge says it. */
export const JOURNEY_TAKE_OVER_BADGES: Readonly<Record<JourneyTakeOverOutcome, JourneyBadge>> = {
  'handed-back': { label: 'Handed back', tone: 'done' },
  failed: { label: 'Failed', tone: 'stuck' },
}

/** How each goal status is said, and its tone; any other status is said as the log has it. */
export const JOURNEY_STATUS_BADGES: Readonly<Record<string, JourneyBadge>> = {
  done: { label: 'Done', tone: 'done' },
  in_motion: { label: 'In motion', tone: 'running' },
  not_done: { label: 'Not done', tone: 'stuck' },
  not_yet: { label: 'Not yet', tone: 'queued' },
}
