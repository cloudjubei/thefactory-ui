import type { ProcessResumeChoice } from 'thefactory-tools/types'

import type { ParkNoteCopy } from './processParkNoteTypes'

/** The longest note the backend's resume accepts. */
export const PARK_NOTE_MAX_LENGTH = 2000

/** The length from which the composer shows how much of the limit is used. */
export const PARK_NOTE_COUNTER_FROM = 1800

/** The park choices that ask for a note before they are sent. */
export const PARK_NOTE_CHOICES: ReadonlySet<ProcessResumeChoice> = new Set(['request-changes'])

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
