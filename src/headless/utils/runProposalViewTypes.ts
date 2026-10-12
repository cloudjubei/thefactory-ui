import type {
  ProcessIntegrationMode,
  ProcessIntegrationOptions,
  ProcessRetryMode,
  ProcessRetryOffer,
  ProcessTurnLimit,
} from 'thefactory-tools/types'

import type { ProcessRunClosureRow } from './processRunClosureViewTypes'

/** Which of a run chat's proposals an approval is for. */
export type RunProposalKind =
  | 'feature'
  | 'change'
  | 'start'
  | 'withdraw'
  | 'rerun'
  | 'resolve'
  | 'park'
  | 'stop'
  | 'gate'
  | 'land'
  | 'resolve-conflict'
  | 'send-back'
  | 'revive'
  | 'delete'
  | 'group-park'
  | 'group-stop'
  | 'group-delete'
  | 'group-landed'
  | 'group-resume'
  | 'remove-process'
  | 'turn-limit'
  | 'close-features'

/**
 * One part of what a proposal says, collapsed to a line on its card and opened
 * on demand: words as markdown, criteria as a numbered list, proof as chips.
 */
export type RunProposalSection = {
  key: string
  label: string
  /** The one line the card shows while the section is closed. */
  summary: string
  /** The whole text, as markdown, when open. */
  markdown?: string
  /** Numbered criteria, when the text is a list of them. */
  items?: string[]
  /** Proof kinds, shown as chips. */
  chips?: string[]
}

/** A run chat's proposal as its approval card shows it. */
export type RunProposalView = {
  kind: RunProposalKind
  kindLabel: string
  /** The kind chip's tone: blue for new work, amber for a change, green for a decision, red for an ending or a delete. */
  tone: 'review' | 'working' | 'done' | 'stuck'
  title: string
  /** The feature it changes, by id, when it changes one. */
  featureId: string | undefined
  /** The new story it records, by id, when it records one. */
  storyId: string | undefined
  /** The "Needs you" item it settles, by id. */
  needsYouItemId: string | undefined
  sections: RunProposalSection[]
  /** What happens on approval, in one line. */
  effect: string
  approveLabel: string
  /** How the work lands, when approving lands it — shown, and changeable, on the card. */
  landing?: RunProposalLanding
  /** Approving cannot be undone: the button reads as a danger. */
  danger?: boolean
  /** What the person can change on the card before approving, beside how the work lands. */
  edit?: RunProposalEdit
}

/**
 * How approved work lands, as the host stated it on the card: the way and the
 * ways offered, the branches, who and what, and every option the sign-off
 * would offer — what a person changes it with.
 */
export type RunProposalLanding = {
  mode: ProcessIntegrationMode
  modes: ProcessIntegrationMode[]
  workBranch: string
  baseRef: string
  /** A project with no git of its own: it lands by its one way, and nothing more is chosen. */
  shadow: boolean
  /** Merge or squash: the credential it is committed as, and how it reads. */
  commitAs?: string
  commitAsLabel?: string
  message?: string
  /** Merge or squash: the result is built and type-checked before the base branch moves. */
  buildFirst?: boolean
  /** Pull request: the credential it is opened as, and its words. */
  pullRequestAccount?: string
  pullRequest?: { title: string; body: string }
  options?: ProcessIntegrationOptions
}

/** What the host stated on a start's ask: each change it runs and what they run on. */
export type RunProposalStartDetail = {
  changes: Array<{ id: string; kind: string; title: string; summary: string; featureId?: string }>
  model?: string
}

/**
 * What a run action's card lets the person change before approving: how a
 * retried step's agent starts, the turn limit, what each feature of an ended
 * run is left as — each read from what the host stated on the ask.
 */
export type RunProposalEdit = {
  retry?: ProcessRetryOffer
  turnLimit?: { limit: ProcessTurnLimit; runner: 'api' | 'cli' }
  closure?: ProcessRunClosureRow[]
}

/** The person's picks on a card's editable parts, as they stand. */
export type RunProposalEditState = {
  retryMode?: ProcessRetryMode
  turnLimit?: ProcessTurnLimit
  closure?: ProcessRunClosureRow[]
}
