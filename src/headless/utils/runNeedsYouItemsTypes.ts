import type { ProcessNeedsYouItem } from 'thefactory-tools/types'

/** A run's "Needs you" items once read, or why they could not be. */
export type RunNeedsYouItemsResult =
  | { status: 'ready'; items: ProcessNeedsYouItem[] }
  | { status: 'failed'; message: string }

/** A run's "Needs you" items as a chip reads them: still loading, read, or failed. */
export type RunNeedsYouItemsState = RunNeedsYouItemsResult | { status: 'loading' }
