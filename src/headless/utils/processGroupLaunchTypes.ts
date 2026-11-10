import type {
  ProcessBaseBranchOptions,
  ProcessGroupBuildMode,
  ProjectProcessDefaultCaps,
} from 'thefactory-tools/types'
import type { FakeDataInProduct } from './fakeDataInProductTypes'
import type { TicketLaunchMove } from './groupTicketTypes'

/** One project's part of a group run, as a launch asks for it. */
export interface ProcessGroupLegRequest {
  projectId: string
  storyId: string
  dependsOn?: string[]
  processId?: string
  /** The branch the agent asked this project's work to go off. */
  baseBranch?: string
}

/** One leg as the launch card shows it before the work starts. */
export interface ProcessGroupLaunchLeg {
  projectId: string
  projectTitle: string
  storyId: string
  storyTitle?: string
  dependsOn: string[]
  processId?: string
  features: number
  isPrerequisite: boolean
  /** The caps this project's launches start from. */
  defaultCaps?: ProjectProcessDefaultCaps
  problem?: string
  /** The branches this project's work may go off, its checkout's own preselected; absent off git. */
  baseBranches?: ProcessBaseBranchOptions
  /** The branch the leg would work off — the one asked for, else the preselected one. */
  baseBranch?: string
  /** The story's open run, started elsewhere: the leg follows it instead of starting another. */
  openRunId?: string
  /** What the launch card says of that run. */
  followsOpenRun?: string
  /** The features an earlier run already delivered, one line per run. */
  alreadyDone?: string[]
  /** The project's fake-data choice, present only when this leg's work is proved on app screens. */
  fakeDataInProduct?: FakeDataInProduct
}

/** What a group launch would start, and why it cannot when it cannot. */
export interface ProcessGroupLaunchPreview {
  groupId: string
  groupTitle?: string
  legs: ProcessGroupLaunchLeg[]
  waves: string[][]
  problems: string[]
  /** What launching would do to the group story's ticket. */
  ticketMove?: TicketLaunchMove
  /** How its legs build on each other; absent, each merges before the next starts. */
  buildMode?: ProcessGroupBuildMode
}

/** What the launch card shows of a `startGroupWork` ask. */
export interface StartGroupWorkGrantSummary {
  /** The group the ask names — the general chat's launch names one; a group chat's is its own. */
  groupId?: string
  title?: string
  /** The group story the launch runs: its ticket is what the card offers to move. */
  groupStoryId?: string
  legs: ProcessGroupLegRequest[]
  note?: string
  proofRequired: boolean
  runner?: 'cli' | 'api'
  spendCapUsd?: number
  /** The turn limit the agent asked for, as it sent it — read with `processGrantTurnLimitView`. */
  turnLimit?: unknown
}
