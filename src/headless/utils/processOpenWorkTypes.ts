import type { ProcessOpenWorkChoice, ProcessOpenWorkState } from 'thefactory-tools/types'

/** One way to start a story over its open work, as the launch approval offers it. */
export interface ProcessOpenWorkOptionView {
  choice: ProcessOpenWorkChoice
  label: string
  /** What taking it entails, in plain words. */
  detail: string
  /** It can make things worse — shown marked. */
  risky: boolean
  available: boolean
  /** Why it cannot be taken, when it cannot. */
  reason?: string
}

/** A story's open work, arranged for the launch approval. */
export interface ProcessOpenWorkView {
  /** One line: which run, and where it stands. */
  headline: string
  /** What could go wrong starting over it, in plain words. */
  warnings: string[]
  /** The features that run holds. */
  holds?: string
  /** The features this launch would add to it or build on top of it. */
  adds?: string
  options: ProcessOpenWorkOptionView[]
}

/** The approval's metadata for a choice over open work — what the launch validates. */
export interface ProcessOpenWorkMetadata {
  openWork: ProcessOpenWorkChoice
  runId: string
  state: ProcessOpenWorkState
}

/** Work added to a run after it started, as its pipeline shows it. */
export interface ProcessAmendmentView {
  /** Per added step id, the tag its node carries: "Added <date>". */
  addedSteps: Record<string, string>
  /** One line per addition, oldest first: what came in, and what it closed or set aside. */
  notes: string[]
}
