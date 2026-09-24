/** A story row's feature counts, as every client shows them. */
export type StoryFeatureCounts = {
  done: number
  reviewable: number
  total: number
  /** "done/total" — accepted work only. */
  doneText: string
  /** "N reviewable" — verified work waiting for its sign-off; absent when there is none. */
  reviewableText?: string
  /** The whole count in words, for a tooltip or an accessible label. */
  title: string
}
