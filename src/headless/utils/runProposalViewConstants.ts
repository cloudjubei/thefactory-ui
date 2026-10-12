/** A run chat's proposal to add a feature to the run, waiting to start. */
export const PROPOSE_RUN_FEATURE_TOOL_NAME = 'proposeRunFeature'

/** A run chat's proposal to change one of the run's features, its rework waiting to start. */
export const PROPOSE_FEATURE_CHANGE_TOOL_NAME = 'proposeFeatureChange'

/** A run chat's proposal to start the changes waiting on the run. */
export const PROPOSE_RUN_START_TOOL_NAME = 'proposeRunStart'

/** A run chat's proposal to take a waiting change off the run. */
export const WITHDRAW_RUN_CHANGE_TOOL_NAME = 'withdrawRunChange'

/** A run chat's proposal to run one of the run's steps again. */
export const PROPOSE_STEP_RERUN_TOOL_NAME = 'proposeStepRerun'

/** A run chat's proposal to record a decision on a "Needs you" item. */
export const RESOLVE_NEEDS_YOU_ITEM_TOOL_NAME = 'resolveNeedsYouItem'

/** A run chat's proposal to answer the stop the run waits on the person at — "Try again" among them. */
export const ANSWER_RUN_PARK_TOOL_NAME = 'answerRunPark'

/** A run chat's proposal to stop the run and everything it launched. */
export const STOP_PROCESS_RUN_TOOL_NAME = 'stopProcessRun'

/** Decide the gate the run waits at — approve, request changes, reject — as the sign-off does. */
export const DECIDE_RUN_GATE_TOOL_NAME = 'decideRunGate'

/** Try again to land approved work that did not land. */
export const RETRY_RUN_INTEGRATION_TOOL_NAME = 'retryRunIntegration'

/** Send work whose landing conflicted to an agent to resolve. */
export const RESOLVE_RUN_INTEGRATION_CONFLICT_TOOL_NAME = 'resolveRunIntegrationConflict'

/** Send a run that ended on a request for changes back for them. */
export const SEND_RUN_BACK_TOOL_NAME = 'sendRunBackForChanges'

/** Take a stopped run back up where it was, as the run's Resume does. */
export const REVIVE_PROCESS_RUN_TOOL_NAME = 'reviveProcessRun'

/** Delete a run and everything it produced. */
export const REMOVE_PROCESS_RUN_TOOL_NAME = 'removeProcessRun'

/** Answer a group run's park. */
export const ANSWER_GROUP_RUN_PARK_TOOL_NAME = 'answerGroupRunPark'

/** Stop a group run and every leg still working. */
export const STOP_PROCESS_GROUP_RUN_TOOL_NAME = 'stopProcessGroupRun'

/** Delete an ended group run and everything its legs own. */
export const REMOVE_PROCESS_GROUP_RUN_TOOL_NAME = 'removeProcessGroupRun'

/** Record a leg's work as landed on its base branch outside its run. */
export const MARK_GROUP_LEG_LANDED_TOOL_NAME = 'markGroupLegLanded'

/** Resume an ended group run whose skipped legs can now start. */
export const RESUME_ENDED_GROUP_RUN_TOOL_NAME = 'resumeEndedGroupRun'

/** Delete one of a project's own process definitions. */
export const REMOVE_PROCESS_TOOL_NAME = 'removeProcess'

/** Set how many turns each step agent of a run takes from now on. */
export const SET_RUN_TURN_LIMIT_TOOL_NAME = 'setRunTurnLimit'

/** Settle the features a run that ended without a sign-off worked on. */
export const CLOSE_RUN_FEATURES_TOOL_NAME = 'closeRunFeatures'

export const RUN_PROPOSAL_TOOL_NAMES: readonly string[] = [
  PROPOSE_RUN_FEATURE_TOOL_NAME,
  PROPOSE_FEATURE_CHANGE_TOOL_NAME,
  PROPOSE_RUN_START_TOOL_NAME,
  WITHDRAW_RUN_CHANGE_TOOL_NAME,
  PROPOSE_STEP_RERUN_TOOL_NAME,
  RESOLVE_NEEDS_YOU_ITEM_TOOL_NAME,
  ANSWER_RUN_PARK_TOOL_NAME,
  STOP_PROCESS_RUN_TOOL_NAME,
  DECIDE_RUN_GATE_TOOL_NAME,
  RETRY_RUN_INTEGRATION_TOOL_NAME,
  RESOLVE_RUN_INTEGRATION_CONFLICT_TOOL_NAME,
  SEND_RUN_BACK_TOOL_NAME,
  REVIVE_PROCESS_RUN_TOOL_NAME,
  REMOVE_PROCESS_RUN_TOOL_NAME,
  ANSWER_GROUP_RUN_PARK_TOOL_NAME,
  STOP_PROCESS_GROUP_RUN_TOOL_NAME,
  REMOVE_PROCESS_GROUP_RUN_TOOL_NAME,
  MARK_GROUP_LEG_LANDED_TOOL_NAME,
  RESUME_ENDED_GROUP_RUN_TOOL_NAME,
  REMOVE_PROCESS_TOOL_NAME,
  SET_RUN_TURN_LIMIT_TOOL_NAME,
  CLOSE_RUN_FEATURES_TOOL_NAME,
]

export const RUN_PROPOSAL_DECLINE_LABEL = 'Not now'
export const RUN_PROPOSAL_LATER_LABEL = 'Decide later'

export const RUN_PROPOSAL_FEATURE = {
  kindLabel: 'New feature',
  effect: 'Adds it to the story and stages it on this run — nothing starts yet.',
  approveLabel: 'Add to this run (staged)',
} as const

export const RUN_PROPOSAL_CHANGE = {
  kindLabel: 'Change a feature',
  effect: 'Updates the feature and stages its rework on this run — nothing starts yet.',
  approveLabel: 'Stage change',
} as const

export const RUN_PROPOSAL_START = {
  kindLabel: 'Start the changes',
  effect:
    'The run leaves its sign-off and works these changes in one pass — no step twice — then asks for sign-off again.',
  approveLabel: 'Start work',
} as const

export const RUN_PROPOSAL_WITHDRAW = {
  kindLabel: 'Remove a staged change',
  effect: 'Takes the change off the run before it starts; the story keeps its edit.',
  approveLabel: 'Remove',
} as const

export const RUN_PROPOSAL_RERUN = {
  kindLabel: 'Re-run a step',
  effect: (step: string): string => `Stages a re-run of ${step} — nothing starts yet.`,
  approveLabel: 'Stage re-run',
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

/** An answer to a stop, when the host stated none of its words. */
export const RUN_PROPOSAL_PARK = {
  kindLabel: 'Answer the stop',
  effect: (choice: string): string =>
    `Answers where the run stopped with “${choice}”, as the pipeline would — it acts at once.`,
  approveLabel: 'Answer',
} as const

export const RUN_PROPOSAL_STOP = {
  kindLabel: 'Stop the run',
  effect: 'Ends this run and stops everything it launched. Nothing already landed is undone.',
  approveLabel: 'Stop the run',
  untitled: 'This run',
} as const

/** A decision at a gate, when the host stated none of its words. */
export const RUN_PROPOSAL_GATE = {
  kindLabel: 'Decide the gate',
  effect: (choice: string): string =>
    `Decides the gate the run waits at with “${choice}”, as the sign-off would — it acts at once.`,
  approveLabels: {
    approve: 'Approve',
    'request-changes': 'Send back',
    reject: 'Reject',
  } as Readonly<Record<string, string>>,
  approveLabel: 'Decide',
} as const

export const RUN_PROPOSAL_LAND = {
  kindLabel: 'Land the work again',
  effect: 'Tries again to bring the approved work in, as the card says it lands — it acts at once.',
  approveLabel: 'Land it',
} as const

export const RUN_PROPOSAL_RESOLVE_CONFLICT = {
  kindLabel: 'Resolve with an agent',
  effect:
    'A developer merges the base branch into the work and resolves the files; the checks run, then you confirm how it lands.',
  approveLabel: 'Send to an agent',
} as const

export const RUN_PROPOSAL_REVIVE = {
  kindLabel: 'Resume the run',
  effect:
    'Takes the stopped run back up where it was: the step it was on waits to be tried again, or the sign-off waits for a decision.',
  approveLabel: 'Resume',
} as const

export const RUN_PROPOSAL_SEND_BACK = {
  kindLabel: 'Send back for changes',
  effect:
    'Reopens the run: its request goes to a fix pass, then the work comes back to the same sign-off.',
  approveLabel: 'Send back',
} as const

export const RUN_PROPOSAL_DELETE = {
  kindLabel: 'Delete the run',
  effect:
    'Deletes the run and everything it produced — every step’s agent-run chat and its record. This cannot be undone.',
  approveLabel: 'Delete run',
} as const

/** An answer to a group run's park, when the host stated none of its words. */
export const RUN_PROPOSAL_GROUP_PARK = {
  kindLabel: 'Answer the group run',
  effect: (choice: string): string =>
    `Answers why the group run waits with “${choice}”, as its page would — it acts at once.`,
  approveLabel: 'Answer',
} as const

export const RUN_PROPOSAL_GROUP_STOP = {
  kindLabel: 'Stop the group run',
  effect: 'Stops the group run and every leg still working. Nothing already merged is undone.',
  approveLabel: 'Stop the group run',
} as const

export const RUN_PROPOSAL_GROUP_DELETE = {
  kindLabel: 'Delete the group run',
  effect:
    'Deletes the group run and everything its legs own — every leg’s runs, their chats and records. This cannot be undone.',
  approveLabel: 'Delete group run',
} as const

/** Marking a leg as landed outside its run, when the host stated none of its words. */
export const RUN_PROPOSAL_GROUP_LANDED = {
  kindLabel: 'Mark as landed',
  effect: (leg: string): string =>
    `Records ${leg}’s work as landed on its base branch outside its run — it counts as merged from then on.`,
  approveLabel: 'Mark as landed',
} as const

/** Resuming an ended group run, when the host stated none of its words. */
export const RUN_PROPOSAL_GROUP_RESUME = {
  kindLabel: 'Resume the group run',
  effect: 'Resumes the group run: the legs that waited on a now-merged one start on its agent.',
  approveLabel: 'Resume',
} as const

export const RUN_PROPOSAL_REMOVE_PROCESS = {
  kindLabel: 'Delete a process',
  effect:
    'Deletes this project’s own process definition; runs already going keep their plan. This cannot be undone.',
  approveLabel: 'Delete process',
} as const

/** How each way approved work lands reads on a card. */
export const RUN_PROPOSAL_LANDING_MODE_LABELS: Readonly<Record<string, string>> = {
  merge: 'Merge',
  squash: 'Merge as one commit',
  'pull-request': 'Pull request',
}

/** How work lands in a project with no git of its own. */
export const RUN_PROPOSAL_LANDING_SHADOW = 'Brought into the project folder'

/** The landing editor's labels. */
export const RUN_PROPOSAL_LANDING_LABELS = {
  mode: 'How it lands',
  identity: 'Commit as',
  message: 'Commit message',
  account: 'Open it as',
  prTitle: 'Title',
  prBody: 'Description',
} as const

/** How a start's card names what each waiting change does, by its kind. */
export const RUN_PROPOSAL_CHANGE_WORDS: Readonly<Record<string, string>> = {
  'feature-added': 'Add',
  'feature-changed': 'Rework',
  'step-rerun': 'Re-run',
}

/** The labels of a proposal's sections. */
export const RUN_PROPOSAL_LINE_LABELS = {
  description: 'Description',
  acceptance: 'Acceptance criteria',
  proofPlan: 'Proof plan',
  note: 'The request',
  proof: 'Proof required',
  proofPreset: 'Proof required (as the sign-off pre-sets it)',
  changes: 'Changes',
  model: 'Runs on',
  change: 'Change',
  parkMessage: 'Why it stopped',
  answer: 'Your answer',
  run: 'Run',
  landing: 'How it lands',
  lastError: 'Why it did not land',
  files: 'Files it resolves',
  branches: 'Git branches deleted too',
  leg: 'Leg',
  mode: 'Merged as',
  commit: 'Commit',
  foundBy: 'Found',
  starts: 'Starts',
  rebuilt: 'Built first',
  step: 'Stopped at',
} as const

/** The longest one-line summary a closed section shows. */
export const RUN_PROPOSAL_SUMMARY_MAX_CHARS = 96

/** The card's toggle and the wider view's control. */
export const RUN_PROPOSAL_EXPAND_LABEL = 'Show the details'
export const RUN_PROPOSAL_COLLAPSE_LABEL = 'Hide the details'
export const RUN_PROPOSAL_OPEN_FULL_LABEL = 'Read the whole proposal'

/** Setting a run's turn limit, when the host stated none of its words. */
export const RUN_PROPOSAL_TURN_LIMIT = {
  kindLabel: 'Turn limit',
  effect: 'Each step agent of the run takes this many turns from its next step on.',
  approveLabel: 'Set the turn limit',
} as const

/** Settling an ended run's features, when the host stated none of its words. */
export const RUN_PROPOSAL_CLOSURE = {
  kindLabel: 'Settle features',
  effect: 'Leaves each feature the run worked on as picked below.',
  approveLabel: 'Settle these features',
} as const
