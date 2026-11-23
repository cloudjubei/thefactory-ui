/** The `code` a send answers with when the backend refuses one of its marks. */
export const VIDEO_MARK_REFUSED_CODE = 'VIDEO_MARK_REFUSED'

/** Marks are kept to a tenth of a second: a player's time is finer than a person can point. */
export const VIDEO_MARK_STEPS_PER_SEC = 10

export const VIDEO_MARK_TEXT = {
  flag: (name: string) => `Mark a moment in ${name}`,
  title: (time: string) => `Mark ${time}`,
  whereNow: 'where it is now',
  noteLabel: 'Note for the agent (optional)',
  cancel: 'Cancel',
  add: 'Add to message',
  save: 'Save note',
  noNote: 'No note',
  noteFor: (time: string) => `Note for the mark at ${time}`,
  remove: (time: string) => `Remove the mark at ${time}`,
  play: (name: string, time: string) => `Play ${name} from ${time}`,
} as const
