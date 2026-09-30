import type { ProcessResumeChoice } from 'thefactory-tools/types'

import {
  PARK_NOTE_CHOICES,
  PARK_NOTE_COPY,
  PARK_NOTE_COUNTER_FROM,
  PARK_NOTE_MAX_LENGTH,
} from './processParkNoteConstants'
import type { ParkNoteCopy } from './processParkNoteTypes'

/** Whether choosing this at a park opens a note composer rather than acting at once. */
export function choiceTakesNote(choice: ProcessResumeChoice): boolean {
  return PARK_NOTE_CHOICES.has(choice)
}

export function parkNoteCopy(sendsBack: boolean): ParkNoteCopy {
  return sendsBack ? PARK_NOTE_COPY.sendsBack : PARK_NOTE_COPY.endsRun
}

/** `1850 / 2000` once a draft nears the limit; nothing before then. */
export function parkNoteCounter(draft: string): string | undefined {
  if (draft.length < PARK_NOTE_COUNTER_FROM) return undefined
  return `${draft.length} / ${PARK_NOTE_MAX_LENGTH}`
}

/** The note a draft sends: trimmed, within the limit, and none at all when blank. */
export function parkNoteToSend(draft: string): string | undefined {
  const note = draft.trim().slice(0, PARK_NOTE_MAX_LENGTH)
  return note === '' ? undefined : note
}
