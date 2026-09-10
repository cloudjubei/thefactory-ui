import type {
  CheckMethodFill,
  CheckMethodId,
  CheckMethodState,
  ReviewTabId,
  SignoffVerdictKey,
} from './checkMethodTypes'
import type { ReviewTone } from './runReviewTypes'

export const CHECK_METHOD_ORDER: readonly CheckMethodId[] = [
  'tests',
  'types',
  'lint',
  'format',
  'build',
  'device',
  'screens',
  'walkthrough',
  'report',
]

export const CHECK_METHOD_LABELS: Record<CheckMethodId, string> = {
  tests: 'Tests',
  types: 'Types',
  lint: 'Lint',
  format: 'Format',
  build: 'Build',
  device: 'Device',
  screens: 'Screens',
  walkthrough: 'Walkthrough',
  report: 'Report',
}

export const CHECK_METHOD_NOUNS: Record<CheckMethodId, string> = {
  tests: 'tests',
  types: 'the typecheck',
  lint: 'lint',
  format: 'formatting',
  build: 'the build',
  device: 'a run on a device',
  screens: 'before/after screens',
  walkthrough: 'a walkthrough recording',
  report: 'a written report',
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
  types: 'typecheck',
  lint: 'lint',
  format: 'formatting',
  build: 'build',
  device: 'device to run on',
  screens: 'before/after screens',
  walkthrough: 'walkthrough recording',
  report: 'written report',
}

/**
 * What to ask an agent to DO when the gap is filled by capturing, not by setting
 * something up. Reusing the setup verb asked it to "set up an emulator" while
 * the same confirm promised the run changes no code.
 */
export const CHECK_METHOD_CAPTURE_VERBS: Record<CheckMethodId, string> = {
  tests: 'run the tests',
  types: 'run the typecheck',
  lint: 'run lint',
  format: 'check formatting',
  build: 'build the app',
  device: 'drive the app on a device',
  screens: 'capture before/after screens',
  walkthrough: 'record a walkthrough',
  report: 'write up what changed',
}

export const CHECK_METHOD_SETUP_VERBS: Record<CheckMethodId, string> = {
  tests: 'add a test suite',
  types: 'wire up a typecheck',
  lint: 'add a lint config',
  format: 'add a formatter',
  build: 'make the app build',
  device: 'set up an emulator',
  screens: 'capture screens',
  walkthrough: 'record a walkthrough',
  report: 'write a report',
}

/**
 * A walkthrough is "configured and absent" exactly like an un-run lint, but only
 * an agent driving a device can produce one — offering it a run button would lie
 * about the price.
 */
export const CHECK_METHOD_FILL: Record<CheckMethodId, CheckMethodFill> = {
  tests: 'run',
  types: 'run',
  lint: 'run',
  format: 'run',
  build: 'run',
  device: 'agent',
  screens: 'agent',
  walkthrough: 'agent',
  report: 'agent',
}

/** Where a method's proof lives when it has some. */
export const CHECK_METHOD_TAB: Record<CheckMethodId, ReviewTabId> = {
  tests: 'tests',
  types: 'build',
  lint: 'build',
  format: 'build',
  build: 'build',
  device: 'screens',
  screens: 'screens',
  walkthrough: 'walkthrough',
  report: 'report',
}

/** The verification approach that produces each evidence method, when one does. */
export const CHECK_METHOD_APPROACH: Partial<Record<CheckMethodId, string>> = {
  tests: 'unit-tests',
  build: 'compile',
  screens: 'screenshot-diff',
  walkthrough: 'screen-recording',
  report: 'code-explanation',
}

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
 * Only these methods can demote the verdict when absent. A missing walkthrough
 * or report is worth asking for, but a run whose every configured check passed
 * is not "partly proven" for lack of a video.
 */
export const VERDICT_BEARING_METHODS: readonly CheckMethodId[] = [
  'tests',
  'types',
  'lint',
  'format',
  'build',
  'screens',
]

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
  'changes',
]

export const REVIEW_TAB_LABELS: Record<ReviewTabId, string> = {
  screens: 'Screens',
  walkthrough: 'Walkthrough',
  tests: 'Tests',
  build: 'Build',
  report: 'Report',
  changes: 'Changes',
}

/** Shown beside a disabled hand-off — both clients must give the same reason. */
export const AGENT_UNREACHABLE = 'This panel cannot reach the agent from here.'

/** What "Request changes" does, in one sentence, on every client. */
export const REQUEST_CHANGES_EXPLAINER =
  'Opens a reason box, then resumes this run with your note. The branch and its commits stay exactly as they are; nothing is merged and nothing is thrown away.'

/** What "Reject" does, in one sentence, on every client. */
export const REJECT_EXPLAINER =
  'Closes the run as rejected. The story goes back to where it was; the branch is kept so you can still look at it, but no further work happens on it.'

export const PROVEN_TITLE = 'Every configured check passed'
export const PROVEN_DETAIL = 'Built, checked, and captured. Nothing outstanding.'
export const NOT_RUN_TITLE = 'Nothing has been checked'

/** Verdict headline when the checks pass but the story itself is not finished. */
export const STORY_UNFINISHED_TITLE = 'Checks pass — but the story is not finished'
