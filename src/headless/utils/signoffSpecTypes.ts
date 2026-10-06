/** One feature's acceptance criteria, as the story spec card groups them under its chip. */
export type SignoffSpecCriteriaGroup = {
  key: string
  /** The feature's `story.feature` reference — its chip. */
  dependency: string
  title: string
  criteria: string[]
}
