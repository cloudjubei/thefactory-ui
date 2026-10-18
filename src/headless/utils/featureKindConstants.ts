import type { FeatureKind, FeatureKindOption } from './featureKindTypes'

/** The feature editor's kind switch, code first — absent is code. */
export const FEATURE_KIND_OPTIONS: readonly FeatureKindOption[] = [
  { value: 'code', label: 'Code' },
  { value: 'design', label: 'Design' },
]

/** What each kind means for the work, under the switch. */
export const FEATURE_KIND_HINTS: Record<FeatureKind, string> = {
  code: 'A developer builds it.',
  design: 'A designer drafts how it looks. You approve it in the Design view.',
}

/** The chip on a design feature wherever it is listed. */
export const FEATURE_KIND_DESIGN_CHIP = 'Design'
