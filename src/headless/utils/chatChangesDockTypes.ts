import type { ChatOpenChanges, CliRunVerdict, FilesEmittedArtifact } from '../api/generated'
import type { SignoffVerdictKey } from './checkMethodTypes'
import type { CommitReceiptFile, GitChangeFileView } from './gitChangeApprovalTypes'
import type { OpenChangesNoticeBusy } from './openChangesNoticeTypes'
import type { AlreadyOnBaseView, ReviewTone } from './runReviewTypes'

/** A short status word with the tone it is drawn in. */
export type ChatChangesTag = { label: string; tone: ReviewTone }

/** What the one-line marker under a chat turn is drawn from. */
export type ChatChangesMarkerInput = {
  runId: string
  /** The turn's captured changes, once read. */
  artifact?: Pick<
    FilesEmittedArtifact,
    'supersededBy' | 'discardedAt' | 'appliedAt' | 'heldBehindReview'
  > & { payload: { files: ReadonlyArray<unknown> } }
  /** The turn's changes could not be committed to a branch of their own. */
  landFailed?: boolean
  /** A process step's run: its review is a report to open, never a decision. */
  reportOnly?: boolean
  /** A process step's run filed checks to report. */
  hasReport?: boolean
  /** The branch the changes wait on and what became of it. */
  review?: { branch: string; shadow?: boolean; mergedAt?: number; rejectedAt?: number }
  /** The decision already made on the run, when there is one. */
  decision?: CliRunVerdict['decision']
  /** The run whose changes the chat's bar holds. */
  openRunId?: string
  /** Whether the chat can open a review from here. */
  canOpen: boolean
  /** The turn's change is already on its base: what to say in place of a marker. */
  alreadyOnBase?: AlreadyOnBaseView
  /** The files the turn changed, as its review lists them. */
  changeFiles?: readonly GitChangeFileView[]
  /** Every commit the chat's approved commit asks made — a receipt that already says the change is there. */
  receiptShas?: readonly string[]
}

/** The marker's link: what it says, and whether the bar below already holds that review. */
export type ChatChangesMarkerAction = { label: string; inBar: boolean }

/** The marker under a chat turn, or the one-line notice of changes settled elsewhere. */
export type ChatChangesMarkerView =
  | { kind: 'notice'; text: string }
  | {
      kind: 'already'
      /** "Already on dev as 0956f8c — nothing left to review". */
      text: string
      /** What "View the change" opens to — set only when the record names the commit. */
      change?: { files: CommitReceiptFile[]; message?: string }
    }
  | {
      kind: 'marker'
      label: string
      branch?: string
      status?: ChatChangesTag
      /** A second line, for changes kept apart from the chat's open ones. */
      note?: string
      action?: ChatChangesMarkerAction
    }

/** The open run's verdict, as the bar sums it up. */
export type ChatChangesVerdictInput = {
  key: SignoffVerdictKey
  /** How many checks did not pass. */
  failed: number
}

/** What the bar above the message box is drawn from. */
export type ChatChangesBarInput = {
  /** The chat's open changes: `undefined` until read, `null` once none wait. */
  openChanges: ChatOpenChanges | null | undefined
  /** The open run's verdict, once its checks are read. */
  verdict?: ChatChangesVerdictInput
  busy?: OpenChangesNoticeBusy
  error?: string
  /** The open run's change is already on its base: nothing waits. */
  alreadyOnBase?: boolean
}

/** The bar that holds the decision on the chat's open changes. */
export type ChatChangesBarView = {
  runId: string
  /** "10 files wait for your decision". */
  title: string
  /** "10 files wait for you" — for a phone's row. */
  shortTitle: string
  verdict?: ChatChangesTag
  /** That they no longer fit the checkout. */
  unfit?: string
  /** How long they have waited, once an hour or more. */
  waited?: string
  /** Waited past the limit the chat's badge counts them from. */
  overdue: boolean
  canDiscard: boolean
  busy?: OpenChangesNoticeBusy
  error?: string
}

/** What the head of an opened review is drawn from. */
export type ChatReviewHeaderInput = {
  /** How many files the run changed, once its changes are read. */
  fileCount?: number
  landFailed?: boolean
  /** Set when the base branch already holds every change — there is nothing waiting. */
  alreadyOnBase?: { baseRef?: string }
  reportOnly?: boolean
  review?: { branch: string; shadow?: boolean }
}

/** The head of an opened review. */
export type ChatReviewHeaderView = { title: string; branch?: string }

/** Where an opened review shows: beside the chat, or over it. */
export type ChatReviewLayout = 'side' | 'sheet'

/** What a host's review can ask of the chat it opened from. */
export type ChatReviewActions = {
  /** Puts a draft in the chat's message box, and brings the chat back when the review covers it. */
  draftMessage: (text: string) => void
  /** Closes the review. */
  close: () => void
}
