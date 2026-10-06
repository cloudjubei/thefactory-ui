/** A run chat's proposal to add a feature to the run before its sign-off. */
export const PROPOSE_RUN_FEATURE_TOOL_NAME = 'proposeRunFeature'

/** A run chat's proposal to change one of the run's features and send it back. */
export const PROPOSE_FEATURE_CHANGE_TOOL_NAME = 'proposeFeatureChange'

/** A run chat's proposal to record a decision on a "Needs you" item. */
export const RESOLVE_NEEDS_YOU_ITEM_TOOL_NAME = 'resolveNeedsYouItem'

export const RUN_PROPOSAL_TOOL_NAMES: readonly string[] = [
  PROPOSE_RUN_FEATURE_TOOL_NAME,
  PROPOSE_FEATURE_CHANGE_TOOL_NAME,
  RESOLVE_NEEDS_YOU_ITEM_TOOL_NAME,
]

export const RUN_PROPOSAL_DECLINE_LABEL = 'Not now'
export const RUN_PROPOSAL_LATER_LABEL = 'Decide later'

export const RUN_PROPOSAL_FEATURE = {
  kindLabel: 'New feature',
  effect:
    'Added to this run: it is built through its own pipeline on the same work branch before sign-off, and the sign-off waits for it.',
  approveLabel: 'Add to this run',
} as const

export const RUN_PROPOSAL_CHANGE = {
  kindLabel: 'Change a feature',
  effect:
    'Updates the feature and sends it back through a fix pass with this change, then back to sign-off.',
  approveLabel: 'Update and send back',
} as const

export const RUN_PROPOSAL_RESOLVE = {
  kindLabel: 'Mark resolved',
  effect: 'Records your decision on the sign-off; nothing reruns.',
  approveLabel: 'Resolve',
} as const

export const RUN_PROPOSAL_DEFER = {
  kindLabel: 'Leave for later',
  effect: 'Records that this is left for later on the sign-off; nothing reruns.',
  approveLabel: 'Leave for later',
} as const

export const RUN_PROPOSAL_NEW_STORY = {
  kindLabel: 'New story outside the run',
  effect: 'Records the new story as how this was settled; this run is not changed.',
  approveLabel: 'Resolve',
} as const

/** The labels of a proposal's detail lines. */
export const RUN_PROPOSAL_LINE_LABELS = {
  description: 'Description',
  acceptance: 'Acceptance',
  proofPlan: 'Proof plan',
  note: 'The request',
  proof: 'Proof required',
  decision: 'Decision',
  story: 'Story',
} as const
