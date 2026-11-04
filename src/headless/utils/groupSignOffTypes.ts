import type {
  ExternalRef,
  LoomWalkthroughItem,
  ProcessDecisionClient,
  ProcessGroupGoingLive,
  ProcessGroupLegStatus,
  ProcessParkChoice,
  ProcessRunStatus,
  ProofKind,
  ReviewEvidenceRef,
  SignOffOutputView,
} from 'thefactory-tools/types'
import type { CheckMethodRow } from './checkMethodTypes'
import type { TicketChipView } from './groupTicketTypes'
import type { ProcessStatusTone } from './processView'

/** Where a repo stands with its pull request, as the group sign-off route says it. */
export type GroupSignOffPullRequestState =
  | 'waiting'
  | 'unread'
  | 'to-open'
  | 'left-out'
  | 'opening'
  | 'opened'
  | 'failed'
  | 'by-hand'
  | 'merged'

export interface GroupSignOffPullRequest {
  state: GroupSignOffPullRequestState
  title?: string
  leftOut?: string
  files?: string[]
  generated?: string[]
  url?: string
  compareUrl?: string
  error?: string
}

export interface GroupSignOffRepo {
  legId: string
  projectId: string
  title: string
  status: ProcessGroupLegStatus
  runId?: string
  branch?: string
  baseRef?: string
  evidence: ReviewEvidenceRef[]
  pullRequest: GroupSignOffPullRequest
}

export interface GroupSignOffAttachment {
  evidenceId: string
  projectId: string
  kind: 'screenshot' | 'recording' | 'file' | 'link'
  name: string
  mediaType?: string
  /** Relative to `/api/v1`; absent for a link. */
  downloadPath?: string
  url?: string
}

/** What `GET /process-group-runs/:id/sign-off` answers. */
export interface GroupSignOffData {
  groupRunId: string
  title: string
  status: ProcessRunStatus
  canDecide: boolean
  canRetry: boolean
  canEditOutputs: boolean
  tickets: ExternalRef[]
  repos: GroupSignOffRepo[]
  outputs: SignOffOutputView[]
  goingLive: ProcessGroupGoingLive
  walkthrough: LoomWalkthroughItem[]
  attachments: GroupSignOffAttachment[]
}

/** The one decision, as a person takes it. */
export interface GroupSignOffDecision {
  choice: 'approve' | 'request-changes' | 'reject'
  legId?: string
  note?: string
  requestedProof?: readonly ProofKind[]
}

export type GroupSignOffDecisionBody = GroupSignOffDecision & {
  decidedVia: ProcessDecisionClient
}

/** One output's document. */
export interface SignOffOutputDocument {
  evidenceId: string
  projectId: string
  label: string
  text: string
  editable: boolean
}

/** Why an edit could not go on as it was. `changed`: the document moved on under it. `closed`: the sign-off was decided. */
export type SignOffOutputDraftNotice = 'changed' | 'closed'

/** An edit not saved yet. It outlives every read of the sign-off. */
export interface SignOffOutputDraft {
  text: string
  /** The version it was started from, which saving names. */
  baseEvidenceId: string
  notice?: SignOffOutputDraftNotice
  error?: string
}

/** Fetching one attachment's file. */
export interface SignOffAttachmentFetch {
  busy: boolean
  error?: string
}

/** One group run's sign-off, as `GroupSignOffStore` keeps it. */
export interface GroupSignOffState {
  /** Undefined until read. */
  data: GroupSignOffData | undefined
  readError: string | null
  /** The decision or retry being sent. */
  acting: GroupSignOffDecision['choice'] | 'retry' | undefined
  actionError: string | null
  /** Each document read, by the version it is. */
  documents: Readonly<Record<string, SignOffOutputDocument>>
  /** Why a section's document could not be read, by section key. */
  documentErrors: Readonly<Record<string, string>>
  /** Edits not saved, by section key. */
  drafts: Readonly<Record<string, SignOffOutputDraft>>
  /** The section keys being saved. */
  saving: readonly string[]
  /** Attachments being fetched, or that failed to, by evidence id. */
  fetches: Readonly<Record<string, SignOffAttachmentFetch>>
}

/** Where a group run's one sign-off stands. */
export type GroupSignOffPhase = 'building' | 'deciding' | 'submitted' | 'ended'

/** A link safe to open, with its words. */
export interface GroupSignOffLink {
  label: string
  url: string
}

/** One repo's row. */
export interface GroupSignOffRepoRow {
  legId: string
  projectId: string
  name: string
  storyTitle: string
  runId?: string
  /** `work-branch → main`. */
  branchLine?: string
  badge: { label: string; tone: ProcessStatusTone }
  /** What it gets and why, in a line. */
  line?: string
  /** A pull request's title: agent-written, so text only. */
  prTitle?: string
  filesLine?: string
  link?: GroupSignOffLink
  error?: string
  busy: boolean
}

/** One thing to attach. */
export interface GroupSignOffAttachmentRow {
  key: string
  name: string
  projectName: string
  kindLabel: string
  link?: GroupSignOffLink
  attachment: GroupSignOffAttachment
  busy: boolean
  error?: string
}

/** The sign-off as its screens show it. */
export interface GroupSignOffScreen {
  phase: GroupSignOffPhase
  badge: { label: string; tone: ProcessStatusTone }
  title: string
  /** Where it stands, in a line. */
  line: string
  tickets: TicketChipView[]
  repos: GroupSignOffRepoRow[]
  /** What the decision does: which repos get a pull request. */
  plan?: string
  goingLive?: string
  /** The decision's answers; empty but at `deciding`. */
  choices: ProcessParkChoice[]
  /** The repos changes can be requested of. */
  sendBack: GroupSignOffRepoRow[]
  canRetry: boolean
  attachments: GroupSignOffAttachmentRow[]
  /** How many Loom walkthrough items wait for a recording. */
  loomLeft: number
  /** The outputs with an edit not saved: a decision waits for them. */
  unsaved: string[]
}

/** A stretch of an output's text. An unfilled placeholder stands out. */
export interface SignOffTextSegment {
  text: string
  unfilled: boolean
}

/** An edit as its section shows it. */
export interface SignOffOutputDraftView {
  text: string
  saving: boolean
  notice?: { kind: SignOffOutputDraftNotice; text: string }
  error?: string
  problem?: string
}

/** One repo's document of an output, or the only one. */
export interface SignOffOutputSectionView {
  key: string
  projectId: string
  /** The repo's name; absent for an output with one document for all. */
  heading?: string
  written: boolean
  loading: boolean
  text?: string
  segments: SignOffTextSegment[]
  /** Each placeholder not filled yet, once. */
  unfilled: string[]
  editable: boolean
  draft?: SignOffOutputDraftView
  error?: string
}

/** One output behind its chip. */
export interface SignOffOutputPanelView {
  label: string
  perRepo: boolean
  sections: SignOffOutputSectionView[]
}

/** An output as a chip beside Report, Tests and Build. */
export interface SignOffOutputChipView {
  key: string
  row: Pick<CheckMethodRow, 'id' | 'label' | 'state' | 'available'>
  panel: SignOffOutputPanelView
}

/** What an output's panel does. */
export interface SignOffOutputActions {
  startEdit: (key: string) => void
  changeDraft: (key: string, text: string) => void
  cancelEdit: (key: string) => void
  saveDraft: (key: string) => Promise<boolean>
  /** Put the person's edit over the version that moved on under it. */
  keepEdit: (key: string) => Promise<boolean>
}

/** How the group sign-off lays out its repos' evidence. */
export type GroupSignOffLayout = 'decision-first' | 'repo-folds' | 'side-by-side'

/** How an output's panel lays out its sections. */
export type SignOffOutputLayout = 'stacked' | 'repo-switch' | 'columns'

/** How the page after submitting orders what is left to do. */
export type GroupSignOffSubmittedLayout = 'steps' | 'post-first' | 'columns'
