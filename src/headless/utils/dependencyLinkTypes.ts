/** The part of a resolved story / feature dependency that says where it opens. */
export type DependencyLinkTarget =
  | { kind: 'missing' }
  | { kind: 'story'; storyId: string }
  | { kind: 'feature'; storyId: string; featureId: string }
