/** One way a story's features can be worked, as the launch approval offers it. */
export interface FeatureProcessOptionView {
  /** The feature process it nests. */
  processId: string
  label: string
  /** What it entails, in one plain line. */
  detail: string
}

/** The approval's metadata for a choice of feature process — what the launch validates. */
export interface FeatureProcessMetadata {
  featureProcessId: string
}
