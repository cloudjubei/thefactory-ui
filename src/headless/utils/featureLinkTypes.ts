/**
 * What a story page does with the feature its link names (`?feature=`): nothing, wait for the story,
 * open the feature, or drop a link to a feature the story no longer has.
 */
export type LinkedFeatureStep<F> =
  | { type: 'none' }
  | { type: 'loading' }
  | { type: 'open'; feature: F }
  | { type: 'missing' }
