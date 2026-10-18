import type { Feature } from 'thefactory-tools/types'

import { FEATURE_KIND_DESIGN_CHIP } from './featureKindConstants'
import type { FeatureKind } from './featureKindTypes'

/** A feature's kind — one with none is code. */
export function featureKindOf(feature: Pick<Feature, 'kind'>): FeatureKind {
  return feature.kind ?? 'code'
}

/** The chip a feature carries for its kind: design features only, code is unmarked. */
export function featureKindChipLabel(feature: Pick<Feature, 'kind'>): string | undefined {
  return featureKindOf(feature) === 'design' ? FEATURE_KIND_DESIGN_CHIP : undefined
}

/**
 * The kind as the feature form saves it: a new code feature carries none, an edit always carries
 * it — leaving it out would keep a design feature design.
 */
export function featureKindPatch(
  kind: FeatureKind,
  mode: 'create' | 'edit',
): { kind?: FeatureKind } {
  return mode === 'create' && kind === 'code' ? {} : { kind }
}
