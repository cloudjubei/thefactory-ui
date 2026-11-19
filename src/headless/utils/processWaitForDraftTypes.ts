import type { ProcessWaitFor, ProcessWaitForHow } from 'thefactory-tools/types'

/** One entry of a launch's "Wait for other work before proof", as the card holds it. */
export interface ProcessWaitForDraft {
  /** Keeps its row while it is edited. */
  key: string
  /** What people call that work: a ticket key, a story title. */
  label: string
  /** A branch, a commit or a pull request link, read by its shape. */
  target: string
  /** The project whose base must hold it; the run's own when absent. */
  projectId?: string
}

/** Every entry a launch card holds for one run, and whether the person changed them. */
export interface ProcessWaitForDrafts {
  rows: readonly ProcessWaitForDraft[]
  /** The next row's key. */
  nextKey: number
  /** The person changed the rows: only then does the launch send them. */
  edited: boolean
}

/** One entry's row on the card, with what its target was read as. */
export interface ProcessWaitForDraftRow extends ProcessWaitForDraft {
  kind?: ProcessWaitForHow
  kindLabel?: string
}

/** What a launch's decision says of the wait. */
export type LaunchWaitsForMetadata = { waitsFor?: ProcessWaitFor[] }

/** What a group launch's decision says of each leg's wait, by project. */
export type LaunchLegWaitsForMetadata = { legWaitsFor?: Record<string, ProcessWaitFor[]> }
