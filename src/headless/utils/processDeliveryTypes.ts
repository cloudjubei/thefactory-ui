import type {
  DeliveryMergeMethod,
  ProcessDecisionClient,
  ProcessRunPublication,
} from 'thefactory-tools/types'
import type { ProcessStatusTone } from './processView'

/** Whose delivery is read: one run's, or every leg's of a group run. */
export type ProcessDeliveryTarget =
  | { kind: 'run'; runId: string }
  | { kind: 'group'; groupRunId: string }

/** Where one repo's merge stands after Accept. */
export type ProcessMergePhase =
  | 'bringing-in-base'
  | 'waiting-for-checks'
  | 'merging'
  | 'merged'
  | 'already-merged'
  | 'conflict'
  | 'checks-failed'
  | 'failed'

/** One repo's merge after Accept, as the host reports it. */
export interface ProcessMergeProgress {
  phase: ProcessMergePhase
  method?: DeliveryMergeMethod
  /** Where the pull request's checks are shown on its host. */
  checksUrl?: string
  /** The checks that failed, by name. */
  failedChecks?: string[]
  error?: string
  at: number
}

/**
 * One repo of a run's delivery, as `GET …/delivery` answers it: what the
 * publish card shows and edits, what was published, and how its merge goes.
 */
export interface ProcessDeliveryRepo {
  runId: string
  projectId: string
  /** The group leg it is, in a group run. */
  legId?: string
  /** The project's name. */
  name: string
  /** The ticket key the branch is named from. */
  ticket?: string
  /** The template its published branch is named from. */
  branchTemplate: string
  /** The 2–4 word short name the branch is named from. */
  short: string
  prTitle: string
  baseBranch: string
  /** Who the branch is pushed and the pull request opened as, in words. */
  account?: string
  /** It has real changes: a repo without any is not published. */
  changed: boolean
  publication?: ProcessRunPublication
  merge?: ProcessMergeProgress
}

/** A run's or a group run's delivery. */
export interface ProcessDeliveryData {
  repos: ProcessDeliveryRepo[]
}

/** What the person changed of one repo on the publish card. */
export interface ProcessPublishEdit {
  short: string
  prTitle: string
}

/** One repo's edits as they are sent. */
export interface ProcessPublishRepoBody {
  projectId: string
  short: string
  prTitle: string
}

/** What `PUT …/delivery` takes: the publish card's edits. */
export interface ProcessPublishBody {
  repos: ProcessPublishRepoBody[]
}

/** What `POST /process-group-runs/:id/publish` takes: the edits, and who published. */
export interface ProcessGroupPublishBody extends ProcessPublishBody {
  decidedVia: ProcessDecisionClient
}

/** A link safe to open, with its words. */
export interface ProcessDeliveryLink {
  label: string
  url: string
}

/** One repo on the publish card. */
export interface ProcessPublishRow {
  projectId: string
  name: string
  baseBranch: string
  short: string
  prTitle: string
  /** The branch name the short name makes. */
  branch?: string
  /** Why the short name makes no branch name. */
  branchError?: string
  titleError?: string
  account?: string
  changed: boolean
}

/** The publish gate as its card shows it. */
export interface ProcessPublishView {
  title: string
  line: string
  rows: ProcessPublishRow[]
  /** Who it is pushed as, when every repo says the same. */
  account?: string
  noAccount: boolean
  publishing: boolean
  canPublish: boolean
  error?: string
}

/** What a run's published work shows: the badge, the pull request and the branch. */
export interface ProcessPublicationView {
  inReview: boolean
  badge: { label: string; tone: ProcessStatusTone }
  link?: ProcessDeliveryLink
  branch: string
}

/** One repo's merge after Accept, as a row shows it. */
export interface ProcessMergeRow {
  projectId: string
  runId: string
  legId?: string
  name: string
  label: string
  tone: ProcessStatusTone
  line?: string
  /** It is still on its way: the row shows it working. */
  active: boolean
  link?: ProcessDeliveryLink
  checksLink?: ProcessDeliveryLink
  /** What opening its run is for, where something waits there. */
  openLabel?: string
  canResolve: boolean
}

/** One run's or group run's delivery, as `ProcessDeliveryStore` keeps it. */
export interface ProcessDeliveryState {
  data: ProcessDeliveryData | undefined
  readError: string | null
  /** The publish card's edits, by project id. */
  edits: Readonly<Record<string, ProcessPublishEdit>>
  publishing: boolean
  actionError: string | null
}
