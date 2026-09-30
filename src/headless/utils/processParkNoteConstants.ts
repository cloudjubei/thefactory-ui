import type { ProcessParkAction, ProcessWaitingKind } from 'thefactory-tools/types'

import type { ParkNoteCopy } from './processParkNoteTypes'

/** The longest note the backend's resume accepts. */
export const PARK_NOTE_MAX_LENGTH = 2000

/** The length from which the composer shows how much of the limit is used. */
export const PARK_NOTE_COUNTER_FROM = 1800

/** The park choices that ask for a note before they are sent. */
export const PARK_NOTE_CHOICES: ReadonlySet<ProcessParkAction> = new Set([
  'request-changes',
  'more-info',
])

/** The park choices whose note is the whole answer, so they cannot be sent empty. */
export const PARK_NOTE_REQUIRED_CHOICES: ReadonlySet<ProcessParkAction> = new Set(['more-info'])

/** The composer's words: a gate that sends work back to be fixed, or one that only ends the run. */
export const PARK_NOTE_COPY: Record<'sendsBack' | 'endsRun', ParkNoteCopy> = {
  sendsBack: {
    prompt:
      'What should change? Optional — the code review’s findings are sent to the fix either way.',
    submitLabel: 'Send back to be fixed',
  },
  endsRun: {
    prompt: 'What needs to change?',
    submitLabel: 'Request changes',
  },
}

export const PARK_NOTE_CANCEL = 'Cancel'

/** The composer's words when a waiting agent is answered or told more, by what it asked. */
export const WAITING_NOTE_COPY: Record<ProcessWaitingKind, ParkNoteCopy> = {
  question: { prompt: 'Your answer', submitLabel: 'Send answer' },
  permission: { prompt: 'What should the agent know?', submitLabel: 'Send and continue' },
  blocker: { prompt: 'What should the agent know?', submitLabel: 'Send and continue' },
}
