import type { ProcessParkAction, ProcessWaitingKind } from 'thefactory-tools/types'

import type { ParkNoteCopy, RequestProofChoice } from './processParkNoteTypes'

/** The longest note the backend's resume accepts. */
export const PARK_NOTE_MAX_LENGTH = 2000

/** The length from which the composer shows how much of the limit is used. */
export const PARK_NOTE_COUNTER_FROM = 1800

/** The park choices that ask for a note before they are sent. */
export const PARK_NOTE_CHOICES: ReadonlySet<ProcessParkAction> = new Set([
  'request-changes',
  'more-info',
  'send-to-developer',
  'accept-dropped-change',
])

/** The park choices whose note is the whole answer, so they cannot be sent empty. */
export const PARK_NOTE_REQUIRED_CHOICES: ReadonlySet<ProcessParkAction> = new Set([
  'more-info',
  'accept-dropped-change',
])

/** The composer's words at a gate: a request for changes always sends the work back to be fixed. */
export const PARK_NOTE_COPY: ParkNoteCopy = {
  prompt:
    'What should change? Optional — the code review’s findings are sent to the fix either way, and the work comes back here.',
  submitLabel: 'Send back to be fixed',
}

/** The composer's words when a feature's checks send its work back to the developer. */
export const SEND_TO_DEVELOPER_NOTE_COPY: ParkNoteCopy = {
  prompt: 'What should the developer do? Optional — the checks’ findings go with it.',
  submitLabel: 'Send back',
}

/** The composer's words when a person accepts that an earlier merge dropped a change on purpose. */
export const ACCEPT_DROPPED_NOTE_COPY: ParkNoteCopy = {
  prompt: 'Why was dropping it right?',
  submitLabel: 'Accept',
}

export const PARK_NOTE_CANCEL = 'Cancel'

/** What a request for changes can require of its fix, in the order the composer offers it. */
export const REQUEST_PROOF_CHOICES: readonly RequestProofChoice[] = [
  { kind: 'ui-before-after', label: 'Require on-screen proof (before/after screens)' },
  { kind: 'unit-tests', label: 'Require tests that cover the change' },
  { kind: 'live-backend', label: 'Require a check against the live backend' },
]

/** The heading over the proof a request for changes requires. */
export const REQUEST_PROOF_HEADING = 'The fix must show'

/** The composer's words when a waiting agent is answered or told more, by what it asked. */
export const WAITING_NOTE_COPY: Record<ProcessWaitingKind, ParkNoteCopy> = {
  question: { prompt: 'Your answer', submitLabel: 'Send answer' },
  permission: { prompt: 'What should the agent know?', submitLabel: 'Send and continue' },
  blocker: { prompt: 'What should the agent know?', submitLabel: 'Send and continue' },
}
