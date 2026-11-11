import type { ProcessRunFeatureSplit } from 'thefactory-tools/types'

import { acceptanceCriteriaLines } from './signoffPage'
import { SIGNOFF_SPEC_MOVED } from './signoffSpecConstants'
import type { SignoffSpecCriteriaGroup } from './signoffSpecTypes'

/**
 * Every feature's acceptance criteria, grouped under the feature's chip in the
 * story's order — what the story spec card's checklist chip opens — each with
 * what its run moved out of it into which follow-up (`splits`, the run's
 * `featureSplits`). A feature that lists none and had nothing moved is left
 * out. Pure.
 */
export function signoffSpecCriteria(
  storyId: string,
  features: readonly { id: string; title: string; acceptance: string | undefined }[],
  splits: readonly ProcessRunFeatureSplit[] = [],
): SignoffSpecCriteriaGroup[] {
  return features.flatMap((f) => {
    const criteria = acceptanceCriteriaLines(f.acceptance)
    const moved = splits
      .filter((s) => s.featureId === f.id)
      .map((s) => SIGNOFF_SPEC_MOVED(s.followUp.title, s.moved))
    if (criteria.length === 0 && moved.length === 0) return []
    return [
      {
        key: f.id,
        dependency: `${storyId}.${f.id}`,
        title: f.title,
        criteria,
        ...(moved.length > 0 ? { moved } : {}),
      },
    ]
  })
}
