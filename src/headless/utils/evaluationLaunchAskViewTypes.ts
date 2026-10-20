/** One resolved launch setting: what it is, its value, and where the value came from. */
export type EvaluationLaunchSettingRow = {
  /** The launch parameter it shows (`model` for the model). */
  key: string
  label: string
  value: string
  /** The names behind a count, e.g. the focused capabilities behind "9 capabilities". */
  detail?: string
  /** Where the value came from, in short words; absent when the host did not say. */
  source?: string
}

/** One capability the launch would measure, with how much work it holds. */
export type EvaluationLaunchCapabilityRow = {
  capability: string
  label: string
  scenarios: number
  agentRuns: number
  /** Its scenarios and agent runs, in one line. */
  work: string
}

/** A build named on the card: the one that would run the sweep, a build linked into it, or the commit measured. */
export type EvaluationLaunchBuildLine = {
  name: string
  /** Its branch and short commit, as far as they are known. */
  at: string
  /** It has changes that are not committed. */
  dirty: boolean
}

/** What a launch would do, read from the host's dry run before it asked. */
export type EvaluationLaunchPreviewView = {
  /** What it does to the ledger, in one line. */
  ledger: string
  /** It resets or replaces a ledger. */
  rewritesLedger: boolean
  /** The ledger already holds runs from other builds: the warning to show prominently. */
  mixedBuilds?: { title: string; detail: string }
  /** Total scenarios and agent runs, in one line. */
  totals: string
  /** The stage is already covered: the launch runs nothing. */
  covered?: string
  capabilities: EvaluationLaunchCapabilityRow[]
  /** Targets not on this machine, and what that drops. */
  unavailable?: string
  /** Focus names the battery does not define. */
  unknownFocus?: string
  /** What the build lines are: the build that would run, or the commit measured. */
  buildHeading?: string
  builds: EvaluationLaunchBuildLine[]
  /** Why the preview is only partly read. */
  error?: string
}

/** The body of the card for an evaluation launch: every resolved setting, the model, the match, and the preview. */
export type EvaluationLaunchAskBodyView = {
  settings: EvaluationLaunchSettingRow[]
  /** The model the evaluation runs on, by its label. */
  model?: string
  /** The earlier evaluation this launch takes its settings from. */
  matchActivityId?: string
  preview?: EvaluationLaunchPreviewView
  /** Shown in place of a preview when the host could not read one. */
  previewUnavailable?: string
}
