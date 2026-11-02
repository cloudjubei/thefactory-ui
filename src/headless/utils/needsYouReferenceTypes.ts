import type {
  ProcessNeedsYouItem,
  ReferenceDescription,
  ResourceLink,
} from 'thefactory-tools/types'
import type { ReferencePreview } from './referencePreviewTypes'

/** A link to one "Needs you" item of a run's final report. */
export type NeedsYouItemLink = Extract<ResourceLink, { kind: 'run' }> & { needsYouItemId: string }

/** What a "Needs you" item's chip is drawn from. */
export type NeedsYouReferenceInput = {
  link: NeedsYouItemLink
  /** The item as the run's report lists it now; absent once it no longer does. */
  item: ProcessNeedsYouItem | undefined
  runTitle?: string
}

/** A "Needs you" item as its chip shows it: what it reads, its pill, and its preview card. */
export type NeedsYouReferenceView = {
  description: ReferenceDescription
  status?: ReferencePreview['status']
  /** Absent for an item that is gone: the chip's own card says so. */
  card?: ReferencePreview
}
