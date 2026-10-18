import type { ParkNoteCopy } from './processParkNoteTypes'

export const PROCESS_CIRCLING_LABEL = 'Going in circles'

export const PROCESS_CIRCLING_HINT =
  'More turns alone will not help. Say what must be different, or switch the model, then try again.'

export const PROCESS_CIRCLING_HINT_AFTER_MANAGER =
  'The manager’s retry went round again too. Change what it was given before trying again.'

/** The note a retry of an attempt that went in circles must carry. */
export const PROCESS_CIRCLING_NOTE_COPY: ParkNoteCopy = {
  prompt: 'What must be different this time? Required — the same brief goes round the same way.',
  submitLabel: 'Try again with this',
}

/** What the run's card in a chat says while it waits on an attempt that went in circles. */
export const PROCESS_CIRCLING_CARD_LINE = 'Going in circles — answer it in the run'
