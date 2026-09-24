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
