import type { ReviewEvidenceVerdict } from '../api/generated'
import type {
  CheckMethodFill,
  CheckMethodId,
  CheckMethodState,
  ReviewTabId,
  SignoffVerdictKey,
} from './checkMethodTypes'
import type { ReviewTone } from './runReviewTypes'

/**
 * Every method the vocabulary knows, in display order.
 *
 * `device` is deliberately NOT here. It was a roll-up of "did the agent drive a
 * device", which produced a second chip opening the same Screens tab the
 * `screens` chip already opens — two doors into one room, and no reviewer could
 * say what the difference was meant to be. The id survives in the type because
 * stored evidence may still carry it; it is simply never a chip of its own.
 */
export const CHECK_METHOD_ORDER: readonly CheckMethodId[] = [
  'tests',
  'uitests',
  'types',
  'lint',
  'format',
  'build',
  'screens',
  'walkthrough',
  'report',
  'diff',
]

/**
 * Declared, but nothing in any repo can ever produce one.
 *
 * `walkthrough` LANDED with `mobileTestRecordScreen`. Its `drivenBy` used to
 * list four SCREENSHOT tools, so an agent briefed to record a video had only
 * stills to do it with.
 *
 * `diff` LANDED, and is now the code review: the `judge` step files its finding
 * as a `code-review` report, whose verdict is the chip's state; a run from
 * before that filed none is still satisfied by `CliRun.diffReview`. Note what
 * it is NOT — the run's verdict. `CliRunVerdict.decision` means approved /
 * changes-requested / rejected, a SIGN-OFF that is the user's to give, so the
 * review got a record of its own rather than an agent stamping a decision on
 * their behalf.
 *
 * These are not slow or unavailable, they are ABSENT, and the distinction is the
 * whole point: `unchecked` means "this run did not do it", which a reviewer can
 * act on, while an unimplemented method offers no action at any price. Shown
 * anyway, they read as a machine that tried and failed — a live sign-off
 * displayed `Diff · not computed` for a feature that does not exist.
 *
 * Worse, both were verdict-bearing. Neither can ever pass, so the headline could
 * NEVER reach "proven": the panel showed every chip green and "Partly proven"
 * above them, held down by two checks with no implementation behind them.
 *
 * Remove an entry here the moment its producer lands — that is the whole switch.
 */
export const UNIMPLEMENTED_CHECK_METHODS: readonly CheckMethodId[] = []

/** The methods that can actually be satisfied — the only ones a reviewer ever sees. */
export const IMPLEMENTED_CHECK_METHOD_ORDER: readonly CheckMethodId[] = CHECK_METHOD_ORDER.filter(
  (id) => !UNIMPLEMENTED_CHECK_METHODS.includes(id),
)

export const CHECK_METHOD_LABELS: Record<CheckMethodId, string> = {
  tests: 'Tests',
  uitests: 'UI tests',
  types: 'Types',
  lint: 'Lint',
  format: 'Format',
  build: 'Build',
  device: 'Device',
  screens: 'Screens',
  walkthrough: 'Walkthrough',
  report: 'Report',
  diff: 'Code review',
}

export const CHECK_METHOD_NOUNS: Record<CheckMethodId, string> = {
  tests: 'tests',
  uitests: 'the UI tests',
  types: 'the typecheck',
  lint: 'lint',
  format: 'formatting',
  build: 'the build',
  device: 'a run on a device',
  screens: 'before/after screens',
  walkthrough: 'a walkthrough recording',
  report: 'a written report',
  diff: 'a code review',
}

/**
 * The noun for "this project has no ___".
 *
 * Separate from {@link CHECK_METHOD_NOUNS} because those carry an article so
 * they read after a preposition ("nothing was captured for THE typecheck"), and
 * splicing them into this sentence produced "This project has no the typecheck."
 */
export const CHECK_METHOD_ABSENT_NOUNS: Record<CheckMethodId, string> = {
  tests: 'tests',
  uitests: 'UI tests',
  types: 'typecheck',
  lint: 'lint',
  format: 'formatting',
  build: 'build',
  device: 'device to run on',
  screens: 'before/after screens',
  walkthrough: 'walkthrough recording',
  report: 'written report',
  diff: 'code review',
}

/**
 * What to ask an agent to DO when the gap is filled by capturing, not by setting
 * something up. Reusing the setup verb asked it to "set up an emulator" while
 * the same confirm promised the run changes no code.
 */
export const CHECK_METHOD_CAPTURE_VERBS: Record<CheckMethodId, string> = {
  tests: 'run the tests',
  uitests: 'run the UI tests',
  types: 'run the typecheck',
  lint: 'run lint',
  format: 'check formatting',
  build: 'build the app',
  device: 'drive the app on a device',
  screens: 'capture before/after screens',
  walkthrough: 'record a walkthrough',
  report: 'write up what changed',
  diff: 'review the code',
}

export const CHECK_METHOD_SETUP_VERBS: Record<CheckMethodId, string> = {
  tests: 'add a test suite',
  uitests: 'add UI tests',
  types: 'wire up a typecheck',
  lint: 'add a lint config',
  format: 'add a formatter',
  build: 'make the app build',
  device: 'set up an emulator',
  screens: 'capture screens',
  walkthrough: 'record a walkthrough',
  report: 'write a report',
  diff: 'review the code',
}

/**
 * A walkthrough is "configured and absent" exactly like an un-run lint, but only
 * an agent driving a device can produce one — offering it a run button would lie
 * about the price.
 */
export const CHECK_METHOD_FILL: Record<CheckMethodId, CheckMethodFill> = {
  tests: 'run',
  // Live UI tests are authored/driven by the agent, not a bare configured command
  // the panel can fire — so the gap is filled by asking the agent, like a walkthrough.
  uitests: 'agent',
  types: 'run',
  lint: 'run',
  format: 'run',
  build: 'run',
  device: 'agent',
  screens: 'agent',
  walkthrough: 'agent',
  report: 'agent',
  diff: 'agent',
}

/** Where a method's proof lives when it has some. */
export const CHECK_METHOD_TAB: Record<CheckMethodId, ReviewTabId> = {
  tests: 'tests',
  // A live UI-test check runs as a command, so its output lands with the other
  // command checks in the Build tab — where the chip opens to show it.
  uitests: 'build',
  types: 'build',
  lint: 'build',
  format: 'build',
  build: 'build',
  device: 'walkthrough',
  screens: 'screens',
  walkthrough: 'walkthrough',
  report: 'report',
  diff: 'changes',
}

/** The verification approach that produces each evidence method, when one does. */
export const CHECK_METHOD_APPROACH: Partial<Record<CheckMethodId, string>> = {
  tests: 'unit-tests',
  build: 'compile',
  screens: 'screenshot-diff',
  walkthrough: 'screen-recording',
  report: 'code-explanation',
  diff: 'adversarial-review',
}

/** The sentence a chip's callout leads with, by state; an unconfigured one names its method instead. */
export const CHECK_STATE_SENTENCES: Record<Exclude<CheckMethodState, 'unconfigured'>, string> = {
  passed: 'Passed. The proof is filed on this run.',
  failed: 'Failed on this branch.',
  unchecked: 'Configured for this project, but never run on this branch.',
}

/** The callout's lead for a method whose every filing the backend cannot vouch for — it ran. */
export const CHECK_STATE_UNVOUCHED_SENTENCE =
  'Filed on this branch, but the backend can’t vouch for it now — it counts once it is captured again.'

export const CHECK_STATE_TONES: Record<CheckMethodState, ReviewTone> = {
  passed: 'positive',
  failed: 'danger',
  unchecked: 'absent',
  unconfigured: 'neutral',
}

export const CHECK_STATE_LABELS: Record<CheckMethodState, string> = {
  passed: 'passed',
  failed: 'failed',
  unchecked: 'not run',
  unconfigured: 'not set up',
}

/**
 * Methods a reviewer may legitimately show as evidence, but which do NOT
 * demote a run by their absence.
 *
 * `walkthrough` is the case: a recorder exists now, so the method is real and
 * passes when a video was filed — but most changes do not need one, and making
 * it verdict-bearing would mark every run without a video "partly proven". That
 * is the same unreachable headline the unimplemented gate existed to prevent,
 * arrived at from the other direction: implemented is not the same as required.
 */
// `uitests` joins `walkthrough`: real and valuable when present, but most changes
// do not warrant live UI tests, so their absence must not demote a run to "partly".
export const OPTIONAL_CHECK_METHODS: readonly CheckMethodId[] = ['walkthrough', 'uitests']

/**
 * Every IMPLEMENTED, REQUIRED method carries the verdict: any FAILURE makes the
 * run failed, any method that could have run and did not makes it partly
 * proven. `unconfigured` still never demotes — a project that has no linter is
 * not a worse-proven change.
 *
 * Closed over the implemented set, not the whole vocabulary. A method with no
 * producer cannot be satisfied at any price, so holding it against a run does
 * not describe the run, it describes the product — and it made "proven"
 * unreachable for everyone, forever.
 */
export const VERDICT_BEARING_METHODS: readonly CheckMethodId[] =
  IMPLEMENTED_CHECK_METHOD_ORDER.filter((id) => !OPTIONAL_CHECK_METHODS.includes(id))

/** Past this many absent chips, the row collapses them into one. */
export const COLLAPSE_ABSENT_PAST = 3

export const SIGNOFF_VERDICT_WORDS: Record<SignoffVerdictKey, string> = {
  proven: 'Proven',
  partly: 'Partly proven',
  failed: 'Failed',
  'not-run': 'Not verified',
}

export const SIGNOFF_VERDICT_TONES: Record<SignoffVerdictKey, ReviewTone> = {
  proven: 'positive',
  partly: 'absent',
  failed: 'danger',
  'not-run': 'absent',
}

export const REVIEW_TAB_ORDER: readonly ReviewTabId[] = [
  'screens',
  'walkthrough',
  'tests',
  'build',
  'report',
  'code-review',
  'changes',
]

export const REVIEW_TAB_LABELS: Record<ReviewTabId, string> = {
  screens: 'Screens',
  walkthrough: 'Walkthrough',
  tests: 'Tests',
  build: 'Build',
  report: 'Report',
  'code-review': 'Code review',
  changes: 'Changes',
}

/** Shown beside a disabled hand-off — both clients must give the same reason. */
export const AGENT_UNREACHABLE = 'This panel cannot reach the agent from here.'

/**
 * Every decide-bar explainer is three parts: a headline naming the act, the body,
 * and the reassurance of what it does NOT do — the last being the part that
 * answers the fear, so it is never folded into the body.
 */
export type DecisionExplainer = { headline: string; body: string; not: string }

export const REQUEST_CHANGES_EXPLAINER: DecisionExplainer = {
  headline: 'Sends it back with a note',
  body: 'Opens a reason box, then resumes this same run with your note. The branch and its commits stay exactly as they are.',
  not: 'Does not close the run.',
}

export const REJECT_EXPLAINER: DecisionExplainer = {
  headline: 'Closes the run as rejected',
  body: 'The story goes back to where it was and the run stops. The branch is kept so you can still look at it.',
  not: 'Deletes nothing.',
}

/** The accessible name of the split caret. */
export const MORE_APPROVE_OPTIONS_LABEL = 'More approve options'

/**
 * The line that opens the approve menu — it names which option the evidence
 * actually supports, so the ranking is explained rather than just applied.
 */
export const APPROVE_MENU_HEADS: Record<SignoffVerdictKey, string> = {
  proven: 'Everything checked out — merge is the safe option.',
  partly: 'Merge is available, but nothing proved the change itself.',
  failed: 'This run failed. Approving is possible, but read the report first.',
  'not-run': 'Nothing has been checked, so nothing supports a merge yet.',
}

export const PROVEN_TITLE = 'Every configured check passed'
export const PROVEN_DETAIL = 'Built, checked, and captured. Nothing outstanding.'
export const NOT_RUN_TITLE = 'Nothing has been checked'

/**
 * Verdict headline when nothing counts only because what was filed cannot be
 * vouched for — after a restart, every earlier filing. It ran; saying nothing
 * was checked would send the reader looking for a run that happened.
 */
export const NOTHING_VOUCHED_TITLE = 'Nothing filed can be vouched for now'

/** Verdict headline when the checks pass but the story itself is not finished. */
export const STORY_UNFINISHED_TITLE = 'Checks pass — but the story is not finished'

/**
 * What one filed item of an evidence method is called, for the line that says
 * how many of them the backend cannot vouch for.
 */
export const UNVOUCHED_EVIDENCE_NOUNS: Partial<Record<CheckMethodId, string>> = {
  screens: 'screenshot',
  walkthrough: 'recording',
  report: 'report',
  diff: 'code review',
}

/** Where a filed code review's finding is read — the chip opens it whatever it concluded. */
export const CODE_REVIEW_TAB: ReviewTabId = 'code-review'

/** The Code review chip's line when the review concluded without saying why. */
export const CODE_REVIEW_DETAIL: Record<ReviewEvidenceVerdict, string> = {
  approved: 'The code review approved the change',
  'changes-requested': 'The code review requested changes',
  rejected: 'The code review rejected the change',
}

/** The Code review chip's line over a review that concluded nothing. */
export const CODE_REVIEW_NO_VERDICT = 'The code review filed no verdict.'
