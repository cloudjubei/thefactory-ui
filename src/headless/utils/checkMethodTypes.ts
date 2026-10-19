import type { VerificationUnfinishedTestFile } from '../api/generated'
import type { HandoffPurpose } from './handoffRequests'
import type { ReviewTone } from './runReviewTypes'

/**
 * The fixed vocabulary of ways a change can be checked. A reviewer learns these
 * ten once and then reads any run at a glance — so the set is closed here, not
 * grown per project.
 */
export type CheckMethodId =
  | 'tests'
  /** Live/e2e UI tests (Playwright, Cypress) — proof the running app behaves, not just that units pass. */
  | 'uitests'
  | 'types'
  | 'lint'
  | 'format'
  | 'build'
  | 'device'
  | 'screens'
  | 'walkthrough'
  | 'report'
  /** Did the code review pass the change — or, before code reviews, was the diff read? */
  | 'diff'

/**
 * Six states. Two of them are ABSENCE and must never read as a verdict:
 *  - `unchecked`    — the check exists (or the evidence is capturable) but nothing
 *                     ran on this branch.
 *  - `unconfigured` — the project has no such check, and no such evidence source.
 *
 * `flagged` is a method whose only failing results are ADVISORY (`optional`) —
 * lint, format: reported, but it never fails a verdict or a status.
 *
 * `unfinished` is a method whose blocking checks did not finish — a test file
 * stopped at its time limit, a harness that crashed — and none failed outright:
 * it did not pass, but nothing it ran failed either.
 */
export type CheckMethodState =
  | 'passed'
  | 'failed'
  | 'unfinished'
  | 'flagged'
  | 'unchecked'
  | 'unconfigured'

/** The test files a method's check could not finish, and how the others went. */
export type CheckUnfinishedTests = {
  /** The check's own name: "Unit tests". */
  checkLabel: string
  files: VerificationUnfinishedTestFile[]
  /** The files that did finish: how many, and the tests that passed in them. Absent when none did. */
  finished?: { files: number; passed: number }
}

/**
 * How a method's gap gets FILLED — the thing that decides which control is
 * offered. `run` executes a configured command with no agent; `agent` needs one
 * (to write code, add config, or drive a device).
 */
export type CheckMethodFill = 'run' | 'agent'

export type ReviewTabId =
  | 'screens'
  | 'walkthrough'
  | 'tests'
  | 'build'
  | 'report'
  | 'code-review'
  | 'changes'

export type CheckMethodAction =
  | { kind: 'open-proof'; tab: ReviewTabId }
  | { kind: 'run' }
  | { kind: 'request'; purpose: 'fix' | 'setup' | 'capture'; approachId: string | undefined }
  /**
   * The project has not allowed what would fill the gap — device automation —
   * so neither a run nor the agent can; only the user can, and `reason` says
   * where.
   */
  | { kind: 'allow'; reason: string }

/**
 * What the surface showing a check can do about it. A read-only record — the
 * story sign-off, a report-only panel — has none, so it passes none: nothing
 * there can run a check or spawn a verifier.
 */
export type CheckActionHost = {
  /** A message reaches the agent in this chat — what a fix or a set-up needs, and a capture does not. */
  canRequest: boolean
  onRun: (row: CheckMethodRow) => void
  onRequest: (row: CheckMethodRow, purpose: HandoffPurpose) => void
}

/**
 * The control a chip or check block shows for its action on a given host.
 * `unreachable` is a request that needs the chat this host cannot reach — shown,
 * disabled, with why; `none` is no control at all.
 */
export type CheckActionOffer =
  | { kind: 'open-proof'; tab: ReviewTabId }
  | { kind: 'run' }
  | { kind: 'request'; purpose: HandoffPurpose; unreachable: boolean }
  | { kind: 'none' }

/** What a chip's callout says: the sentence it leads with, and the detail beneath when it adds something. */
export type CheckCallout = {
  lead: string
  detail: string | undefined
}

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
  /** The test files it could not finish — set only on an `unfinished` row whose record named them. */
  unfinished?: CheckUnfinishedTests
  fill: CheckMethodFill
  action: CheckMethodAction
  /** Ids of the verification checks that rolled up into this row. */
  checkIds: string[]
  /**
   * The project's scan detected this check, but nothing ran it on this branch —
   * set only on an `unchecked` row, with the commands that would run it.
   */
  available?: { commands: string[] }
  /**
   * Nothing captured it because the project's page cannot be served — set only
   * on an `unconfigured` capture row; its `detail` says why.
   */
  unservable?: true
}

/** What a chip shows for its state: an available check that never ran reads apart from one nobody knows about. */
export type CheckChipFace = {
  /** The mark after the name; empty when the state is said in words instead. */
  mark: string
  /** The state as an accessible name reads it: "passed", "available". */
  stateLabel: string
  /** The state in words after the name — "didn’t finish" — for a state a mark would misread. */
  words?: string
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
  /** Every screen filed — gates whether the Screens tab exists at all. */
  screens: number
  /**
   * When a verify gate judged the screens: how many its proof rests on — the
   * number the badge shows. Kept apart from {@link screens} so a tab whose
   * captures all failed to count still opens, and what did not count stays
   * one click away, while the badge never counts it as proof.
   */
  screensProof?: number
  walkthroughs: number
  reports: number
  /** How many TESTS ran (not how many test layers) — the number the badge shows. */
  testCount: number
  /**
   * How many TEST checks ran — gates whether the Tests tab exists at all. Kept
   * apart from {@link testCount} because a suite can run and report zero tests,
   * which is still "tests ran" and must still open a tab.
   */
  testChecks: number
  /** How many BUILD-family checks (types/lint/format/build) ran — gates the Build tab. */
  buildChecks: number
  /** `undefined` while the diff is unknown; 0 is a real answer. */
  changedFiles: number | undefined
  /** How many code reviews are shown — gates the Code review tab. */
  codeReviews?: number
  /** The tab that leads the rest when it is there — the story's final report. */
  lead?: ReviewTabId
}
