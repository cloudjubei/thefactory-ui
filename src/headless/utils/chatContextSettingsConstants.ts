/** The history share's slider, in percent of the model's window. */
export const CHAT_HISTORY_SHARE_MIN = 5
export const CHAT_HISTORY_SHARE_MAX = 100
export const CHAT_HISTORY_SHARE_STEP = 5

/** The notes turns' slider. 0 turns it off. */
export const CHAT_NOTES_TURNS_MIN = 0
export const CHAT_NOTES_TURNS_MAX = 20

/** The advanced section's words. */
export const CHAT_CONTEXT_SETTINGS_COPY = {
  section: 'Advanced',
  historyShare: 'History share of the window',
  historyShareHint:
    'How much of the model’s window past messages may fill when a chat picks up again.',
  notesTurns: 'Turns before notes are old',
  notesTurnsHint:
    'After this many turns with no notes update, a chat that has to start over is summarized from its messages. 0 turns this off.',
  off: 'Off',
} as const
