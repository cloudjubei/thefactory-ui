import type {
  JourneyDecisionKind,
  JourneyDecisionSource,
  JourneyTakeOverOutcome,
} from 'thefactory-tools/types'

import type { ProcessStatusTone } from './processView'
import type { EvidenceTile } from './reviewEvidenceViewTypes'

/** A badge of the day view: its words and its tone. */
export type JourneyBadge = { label: string; tone: ProcessStatusTone }

/** A goal taken off the day, and why. */
export type JourneyRemovedGoal = { key: string; goal: string; reason: string | undefined }

/** A goal swapped for another, and why. */
export type JourneyReplacedGoal = {
  key: string
  from: string
  to: string
  reason: string | undefined
}

/** How a goal went, as the evening said it. */
export type JourneyGoalStatusRow = { key: string; goal: string; status: JourneyBadge }

/** The evening question and the answer picked. */
export type JourneyProbeRow = {
  key: string
  question: string
  choice: string | undefined
  note: string | undefined
}

/** A card the product showed, and the reaction picked. */
export type JourneyCardRow = { key: string; card: string; reaction: string | undefined }

/** One decision the person made, and where its answer came from. */
export type JourneyDecisionRow = {
  key: string
  kind: JourneyDecisionKind
  label: string
  source: JourneyDecisionSource
  badge: JourneyBadge
  model: string | undefined
  cost: string | undefined
}

/** One time an agent took over the browser, and how it ended. */
export type JourneyTakeOverRow = {
  key: string
  goal: string
  saw: string
  outcome: JourneyTakeOverOutcome
  badge: JourneyBadge
  /** `12 turns`, when it said. */
  turns: string | undefined
  cost: string | undefined
}

/** One day as lived. */
export type JourneyDayView = {
  day: number
  title: string
  /** What its folded row says beside the title: decisions, live ones, take-overs. */
  line: string
  offered: readonly string[]
  removed: readonly JourneyRemovedGoal[]
  replaced: readonly JourneyReplacedGoal[]
  accepted: readonly string[]
  statuses: readonly JourneyGoalStatusRow[]
  /** What the journal got, said in a line; absent when the day log does not say. */
  journal: string | undefined
  probes: readonly JourneyProbeRow[]
  cards: readonly JourneyCardRow[]
  decisions: readonly JourneyDecisionRow[]
  takeOvers: readonly JourneyTakeOverRow[]
  /** The worst take-over of the day, for its folded row. */
  takeOverBadge: JourneyBadge | undefined
  costUsd: number | undefined
  cost: string | undefined
}

/** What a script step's view shows: the days from its day log, and the recording beside them. */
export type JourneyStepView = {
  days: readonly JourneyDayView[]
  /** `2 days · 9 decisions, 3 live · 1 take-over`; absent with no day log. */
  totalLine: string | undefined
  totalCost: string | undefined
  recording: EvidenceTile | undefined
  /** The screenshot filed when the script stopped short. */
  stoppedAt: EvidenceTile | undefined
  /** Lines of the day log that could not be read, said in a line. */
  unread: string | undefined
  /** Why there are no days to show; absent when there are. */
  empty: string | undefined
  /** The day open at first: the last one, where the days ended. */
  openDay: number | undefined
}
