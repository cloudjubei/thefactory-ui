import { acceptanceCriteriaLines } from './signoffPage'
import type { SignoffSpecCriteriaGroup } from './signoffSpecTypes'

/**
 * Every feature's acceptance criteria, grouped under the feature's chip in the
 * story's order — what the story spec card's checklist chip opens. A feature
 * that lists none is left out. Pure.
 */
export function signoffSpecCriteria(
  storyId: string,
  features: readonly { id: string; title: string; acceptance: string | undefined }[],
): SignoffSpecCriteriaGroup[] {
  return features.flatMap((f) => {
    const criteria = acceptanceCriteriaLines(f.acceptance)
    return criteria.length > 0
      ? [{ key: f.id, dependency: `${storyId}.${f.id}`, title: f.title, criteria }]
      : []
  })
}
