import type { ResourceLink } from 'thefactory-tools/types'
import type { ProcessStatusTone } from './processView'

/** What a preview card's button opens, and what it says. */
export type ReferencePreviewAction = { label: string; link: ResourceLink }

/** A reference's preview card, arranged for one render on every client. */
export type ReferencePreview = {
  /** What it is, over its title — "Feature in Backend", "Process run". */
  caption: string
  title: string
  /** Its status as a pill, where it has one. */
  status?: { label: string; tone: ProcessStatusTone }
  /** A line each: what it says, and its value. A line with no label is plain text. */
  lines: ReadonlyArray<{ label: string; value: string }>
  /** The one click that opens it; absent for what is gone or still being looked up. */
  primary?: ReferencePreviewAction
}

/** A process run's preview card: its own, plus whether it offers the run's chat. */
export type RunReferencePreview = ReferencePreview & {
  /** A nested run has no chat of its own — its parent's is the one. */
  offersChat: boolean
}
