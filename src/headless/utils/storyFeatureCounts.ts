import type { Feature } from 'thefactory-tools/types'
import { censusFeatures } from 'thefactory-tools/utils'

import type { StoryFeatureCounts } from './storyFeatureCountsTypes'

/**
 * A story row's feature counts. Verified work sits beside done, never folded
 * into it: only the sign-off makes a feature done.
 */
export function storyFeatureCounts(
  features: readonly Pick<Feature, 'status'>[] | undefined,
): StoryFeatureCounts {
  const census = censusFeatures(features ?? [])
  return {
    done: census.done,
    reviewable: census.reviewable,
    total: census.total,
    doneText: `${census.done}/${census.total}`,
    ...(census.reviewable > 0 ? { reviewableText: `${census.reviewable} reviewable` } : {}),
    title: census.label,
  }
}
