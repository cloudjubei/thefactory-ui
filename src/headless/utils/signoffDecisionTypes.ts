import type { ProcessDroppedChangeAcceptedRow } from 'thefactory-tools/types'

import type { ScreenPair } from './reviewEvidenceViewTypes'
import type { SignoffAttentionItem, SignoffRequestOutcome } from './signoffPageTypes'

/** A step the side panel can open — a run, one of its steps and, optionally, one attempt. */
export type SignoffStepTarget = { runId: string; stepId: string; entryId?: string }

/** The newest fix pass, as the decision's request item names and opens it. */
export type SignoffDecisionFix = {
  /** "Fix · pass 2" — its step chip. */
  label: string
  /** Its section on the page, opened when no side panel is at hand. */
  sectionId: string
  /** Where its proof is — the fix pass's verify attempt, when it has one. */
  step: SignoffStepTarget | undefined
}

/** What the decision card's attention list is built from. */
export type SignoffDecisionInput = {
  request: SignoffRequestOutcome | undefined
  /** The fix pass the request was answered by. */
  fix: SignoffDecisionFix | undefined
  attention: readonly SignoffAttentionItem[]
  /** Each file a merge into the work branch was accepted dropping a side of, as the run's record words it. */
  droppedAccepted: readonly ProcessDroppedChangeAcceptedRow[]
}

/** How an attention item reads at a glance: met, not met, or worth a look. */
export type SignoffDecisionTone = 'done' | 'stuck' | 'working'

/** The one icon-or-chip action an attention item offers. */
export type SignoffDecisionAction =
  /** The fix pass's step chip: the side panel on its proof, else its section. */
  | { kind: 'step'; label: string; sectionId: string; step: SignoffStepTarget | undefined }
  /** What Verify said about a section — its row on the page. */
  | { kind: 'verify'; label: string; sectionId: string }

/** One line of the decision card's attention list: an icon, one line, its chips. */
export type SignoffDecisionItem = {
  key: string
  tone: SignoffDecisionTone
  /** The section's `story.feature` chip before the line; absent for the request. */
  dependency: string | undefined
  /** What to call the section when it has no reference — "Fix · pass 2". */
  label: string | undefined
  text: string
  /** The counted before/after pairs, each a thumbnail chip that opens the pair viewer. */
  pairs: ScreenPair[]
  actions: SignoffDecisionAction[]
}
