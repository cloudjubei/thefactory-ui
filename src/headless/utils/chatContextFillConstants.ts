/** A window filled this far is worth watching: where the host starts writing notes ahead of a cut. */
export const CHAT_CONTEXT_FILLING_FRACTION = 0.7

/** A window filled this far is about to be cut. */
export const CHAT_CONTEXT_NEARLY_FULL_FRACTION = 0.9

/** The context chip's and its details' words. */
export const CHAT_CONTEXT_FILL_COPY = {
  title: 'Context',
  unknownWindow: 'Context',
  windowGuessed: 'The size of this model’s window is an estimate.',
  windowUnknown: 'The size of this model’s window is not known.',
  chipLabel: (label: string) => `Context ${label} full. Show details`,
  full: (label: string) => `${label} full`,
} as const

/** Compact now's words. */
export const CHAT_COMPACT_COPY = {
  action: 'Compact now',
  running: 'Compacting…',
  stop: 'Stop',
  stopAsk: 'Stop compacting?',
  keep: 'Keep going',
  stopLabel: 'Stop compacting',
  hint: 'The next turn runs on the chat’s notes and its recent messages. Every message stays here.',
  compacted: 'Compacted.',
  compactedTo: (label: string) => `Compacted. Now ${label} full.`,
  nothingNeeded: 'Nothing to compact yet.',
  busy: 'The agent is working. Try again when it stops.',
  cancelled: 'Compact stopped.',
  failed: 'Could not compact this chat.',
} as const

/** The line drawn where a chat's compacted history ends. */
export const CHAT_CONTEXT_BOUNDARY_COPY = {
  label: 'Above this line is no longer sent to the model',
  detail:
    'Older messages stay here to read. The model works from the chat’s notes and the messages below this line.',
} as const
