import type { LinkedFeatureStep } from './featureLinkTypes'

/**
 * The step a story page takes for the feature its link names, once per link: `openedFeatureId` is
 * the feature the link already opened, so a story refresh does not open it again.
 */
export function linkedFeatureStep<F extends { id: string }>(
  story: { features: readonly F[] } | null | undefined,
  featureId: string | null | undefined,
  openedFeatureId: string | undefined,
): LinkedFeatureStep<F> {
  if (!featureId || featureId === openedFeatureId) return { type: 'none' }
  if (!story) return { type: 'loading' }
  const feature = story.features.find((f) => f.id === featureId)
  return feature ? { type: 'open', feature } : { type: 'missing' }
}
