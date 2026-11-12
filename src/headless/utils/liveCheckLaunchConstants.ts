import type { ProcessStepKind, ProofKind } from 'thefactory-tools/types'

import type { LiveCheckChoice, LiveCheckChoiceOption } from './liveCheckLaunchTypes'

/** The proof kind a live check rides on. */
export const LIVE_CHECK_PROOF_KIND: ProofKind = 'live-check'

/** The row's three choices, in the order the switch shows them. */
export const LIVE_CHECK_CHOICE_OPTIONS: readonly LiveCheckChoiceOption[] = [
  { value: 'off', label: 'Off' },
  { value: 'required', label: 'Required' },
  { value: 'ask-me', label: 'Ask me' },
]

/** What each choice does, in one short line. */
export const LIVE_CHECK_CHOICE_LINES: Record<LiveCheckChoice, string> = {
  off: 'No live check on a test account.',
  required: 'An agent signs in with a test account and checks the change.',
  'ask-me': 'A device is set up and signed in for you; you say if it looks right.',
}

/** The row's words. */
export const LIVE_CHECK_COPY = {
  title: 'Live check',
  beforeAndAfter: 'Before and after',
  beforeAndAfterOn: 'The base build first, then the change.',
  beforeAndAfterOff: 'Only the change is checked.',
  secretHint: 'The test logins are in a note any agent can read. Make it a secret.',
  openNote: 'Open the note',
  chip: (label: string) => `Live check: ${label}`,
} as const

/** The step a live check runs as on a feature's chain, by mode: its id and name. */
export const LIVE_CHECK_STEP_CHIPS = {
  required: { id: 'live-check', name: 'Live check' },
  'ask-me': { id: 'live-check-watch', name: 'Watch it live' },
} as const

/** The steps a live check is placed in front of on a chain: the first of these, else last. */
export const LIVE_CHECK_PLACED_BEFORE: readonly ProcessStepKind[] = ['report', 'gate', 'cleanup']
