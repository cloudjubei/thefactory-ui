import type { ChatDraft } from './chatDraftTypes'

/** Storage key prefix; the chat's context key follows it. */
export const CHAT_DRAFT_STORAGE_PREFIX = 'thefactory.chatDraft.'

/** Typing is written to storage at most this often. */
export const CHAT_DRAFT_WRITE_DEBOUNCE_MS = 300

/** A draft untouched for longer than this is dropped when it is next read. */
export const CHAT_DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export const EMPTY_CHAT_DRAFT: ChatDraft = Object.freeze({
  text: '',
  attachments: [],
  pending: [],
  paused: false,
}) as ChatDraft

/** Between two queued messages when they go out as one. */
export const PENDING_MESSAGE_SEPARATOR = '\n\n'

export const PENDING_SEND_NOW_HINT = {
  'queued-behind-turn': 'Send now — the agent takes it as soon as its current turn ends',
  'interrupts-turn': 'Send now — stops the agent’s current turn and sends this instead',
} as const

export const PENDING_STACK_TEXT = {
  waiting: 'Sends as one message when the agent finishes',
  paused: 'Paused — sends when you say',
  idle: 'Not sent yet',
  sendNow: 'Send now',
  send: 'Send',
  sendIdleHint: 'Send the pending messages now, as one message',
  edit: 'Edit — move back into the message box',
  remove: 'Remove',
  attachmentsOnly: 'Attachments only',
  queueButton: 'Add to pending — sent when the agent finishes',
} as const
