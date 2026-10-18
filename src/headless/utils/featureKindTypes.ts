import type { Feature } from 'thefactory-tools/types'

/** What kind of work a feature is — who works it, and what it delivers. */
export type FeatureKind = NonNullable<Feature['kind']>

/** One choice of the feature editor's kind switch. */
export type FeatureKindOption = { value: FeatureKind; label: string }
