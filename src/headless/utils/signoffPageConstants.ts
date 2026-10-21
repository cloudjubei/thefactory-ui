import type { CheckMethodId, ReviewTabId } from './checkMethodTypes'
import type { CodeReviewTone } from './signoffCodeReviewTypes'
import type { StoryStepTone } from './storySignoffTypes'

export const SIGNOFF_ATTENTION_ACCEPTED = (who: string): string =>
  `was accepted by ${who} without its Verify step passing.`
export const SIGNOFF_ATTENTION_DRY = 'was verified dry — not against the live backend.'
export const SIGNOFF_ATTENTION_ACTION = 'See what Verify said'

/** The method whose glyph a tab's own chip wears when no check row stands for it. */
export const SIGNOFF_TAB_METHOD: Record<ReviewTabId, CheckMethodId> = {
  screens: 'screens',
  walkthrough: 'walkthrough',
  tests: 'tests',
  build: 'build',
  report: 'report',
  'code-review': 'diff',
  changes: 'diff',
}

export const SIGNOFF_PROOF_MARK: Record<StoryStepTone, string> = {
  done: '✓',
  stuck: '✗',
  review: '○',
  neutral: '•',
}

export const SIGNOFF_PROOF_TONE: Record<StoryStepTone, CodeReviewTone> = {
  done: 'done',
  stuck: 'stuck',
  review: 'review',
  neutral: 'neutral',
}

export const SIGNOFF_SECTION_TITLES = {
  what: 'What this is',
  evidence: 'Evidence',
  criteria: 'Acceptance criteria',
  proof: 'Proof, per the plan',
  spec: 'Full spec',
} as const

export const SIGNOFF_DECISION_LABEL = 'Story sign-off'

/** The approval names what it approves — the only decisions that keep their words. */
export const SIGNOFF_APPROVE_LABEL = 'Approve story'
export const SIGNOFF_REJECT_CONFIRM =
  'Reject ends this run without signing off. Its work is not brought in.'
export const SIGNOFF_REJECT_CONFIRM_LABEL = 'Reject'
export const SIGNOFF_CANCEL_LABEL = 'Cancel'

/** The header's small Group chip and what its tooltip says. */
export const SIGNOFF_GROUP_CHIP_LABEL = 'Group'
export const SIGNOFF_GROUP_CHIP_TITLE =
  'Part of a group run — each project is signed off and merged on its own. Open the group run'

/** What the decision card says of the person's own request, met or not. */
export const SIGNOFF_REQUEST_MET = (request: string) => `Your request ${request} is met`
export const SIGNOFF_REQUEST_NOT_MET = (request: string, why: string) =>
  `Your request ${request} is not met: ${why}`
export const SIGNOFF_REQUEST_PAIRS = (n: number) => `${n} before/after pair${n === 1 ? '' : 's'}`
