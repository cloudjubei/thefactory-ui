import type { ReviewTone } from './runReviewTypes'

/**
 * The fixed vocabulary of ways a change can be checked. A reviewer learns these
 * nine once and then reads any run at a glance — so the set is closed here, not
 * grown per project.
 */
export type CheckMethodId =
  | 'tests'
  | 'types'
  | 'lint'
  | 'format'
  | 'build'
  | 'device'
  | 'screens'
  | 'walkthrough'
  | 'report'

/**
 * Four states. Two of them are ABSENCE and must never read as a verdict:
 *  - `unchecked`    — the check exists (or the evidence is capturable) but nothing
 *                     ran on this branch.
 *  - `unconfigured` — the project has no such check, and no such evidence source.
 */
export type CheckMethodState = 'passed' | 'failed' | 'unchecked' | 'unconfigured'

/**
 * How a method's gap gets FILLED — the thing that decides which control is
 * offered. `run` executes a configured command with no agent; `agent` needs one
 * (to write code, add config, or drive a device).
 */
export type CheckMethodFill = 'run' | 'agent'

export type ReviewTabId = 'screens' | 'walkthrough' | 'tests' | 'build' | 'report' | 'changes'

export type CheckMethodAction =
  | { kind: 'open-proof'; tab: ReviewTabId }
  | { kind: 'run' }
  | { kind: 'request'; purpose: 'fix' | 'setup' | 'capture'; approachId: string | undefined }

/** One chip in the "what was checked" row, fully derived. */
export type CheckMethodRow = {
  id: CheckMethodId
  label: string
  /** The thing itself, for sentences: 'lint', 'a walkthrough recording'. */
  noun: string
  /** What asking the agent to set it up means: 'add a lint config'. */
  setupVerb: string
  state: CheckMethodState
  tone: ReviewTone
  /** One line: the check's own summary, or why it is absent. */
  detail: string
  durationLabel: string | undefined
  /** Raw output when a check carried some — console text, failing test names. */
  output: string | undefined
  fill: CheckMethodFill
  action: CheckMethodAction
  /** Ids of the verification checks that rolled up into this row. */
  checkIds: string[]
}

export type ReviewTab = {
  id: ReviewTabId
  label: string
  /** Shown as a count pill; `undefined` when the tab has nothing to count. */
  count: number | undefined
}

export type SignoffVerdictKey = 'proven' | 'partly' | 'failed' | 'not-run'

/** The run's headline: one status word, the sentence beside it, and how to draw the dot. */
export type SignoffVerdict = {
  key: SignoffVerdictKey
  tone: ReviewTone
  word: string
  /** Hollow when nobody has decided anything yet; filled when there is a verdict. */
  hollow: boolean
  title: string
  detail: string
}

/** Inputs the sign-off verdict is derived from. */
export type SignoffVerdictInput = {
  rows: readonly CheckMethodRow[]
  /** True when a verification record exists at all. */
  verified: boolean
  /**
   * Why the STORY is not finished, when it is not — e.g. "5 of 5 features are
   * unfinished". Checks passing says the code is sound; it does not say the work
   * is done, and a verdict reading "Nothing outstanding" above a list of
   * unfinished features contradicts itself.
   */
  storyIncomplete?: string
}

export type ReviewTabsInput = {
  screens: number
  walkthroughs: number
  reports: number
  testChecks: number
  buildChecks: number
  /** `undefined` while the diff is unknown; 0 is a real answer. */
  changedFiles: number | undefined
}
