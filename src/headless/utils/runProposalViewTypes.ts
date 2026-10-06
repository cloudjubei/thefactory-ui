/** Which of a run chat's proposals an approval is for. */
export type RunProposalKind = 'feature' | 'change' | 'resolve'

/** One labelled line of what a proposal says. */
export type RunProposalLine = { label: string; text: string }

/** A run chat's proposal as its approval card shows it. */
export type RunProposalView = {
  kind: RunProposalKind
  kindLabel: string
  /** The kind chip's tone: blue for new work, amber for a change, green for a decision. */
  tone: 'review' | 'working' | 'done'
  title: string
  /** The feature it changes, by id, when it changes one. */
  featureId: string | undefined
  /** The new story it records, by id, when it records one. */
  storyId: string | undefined
  /** The "Needs you" item it settles, by id. */
  needsYouItemId: string | undefined
  lines: RunProposalLine[]
  /** What happens on approval, in a sentence. */
  effect: string
  approveLabel: string
}
