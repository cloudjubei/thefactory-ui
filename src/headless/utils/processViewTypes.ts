import type { ProcessStatusTone } from './processView'

/**
 * How a pipeline node's marker is drawn — one answer both renderers draw, so
 * web and native cannot disagree about what a state looks like.
 */
export interface ProcessNodeLook {
  tone: ProcessStatusTone
  /** `solid` — a filled mark; `ring` — an outline; `dashed` — what has not run yet. */
  shape: 'solid' | 'ring' | 'dashed'
  /** Only running work spins. */
  spin: boolean
  /** A verdict (`✓` `!` `?`) where there is one, else the step's ordinal. */
  glyph: string
}

/** The one line under a node, and whether it is history rather than the current verdict. */
export interface ProcessNodeSummary {
  text: string
  muted: boolean
}

/** How a run a person ended reads — see `processRunPersonEnding`. */
export interface ProcessRunPersonEnding {
  choice: 'request-changes' | 'reject' | 'abandon' | 'close-unmerged'
  /** One word or two for a badge: "Changes requested", "Rejected", "Abandoned", "Closed without merging". */
  label: string
  tone: ProcessStatusTone
  /** The decision as a sentence: where it was made, and the person's words. */
  line: string
}

/** What a step is handed and what ends it, as the Processes view says them. */
export interface ProcessStepToolsView {
  /** What ends the step. */
  exitLabel: string
  /** The tools it is handed, by name. Empty when it runs no agent. */
  tools: readonly string[]
  /** The line those tools fold under. Absent when there are none. */
  toolsLabel?: string
  /** Why it is handed none. */
  noTools?: string
}
