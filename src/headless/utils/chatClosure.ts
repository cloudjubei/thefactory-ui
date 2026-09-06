import type { Chat } from '../api/generated'

/** How a chat's lifecycle should read on screen. */
export type ChatClosure = {
  /** History is closed and kept: nothing in it may be removed. */
  locked: boolean
  /** The chat has reached a terminal state or been archived. */
  closed: boolean
  /** One line for the header — absent while the chat is ordinary and open. */
  label?: string
  /** Longer explanation, shown beside the label. */
  detail?: string
}

/**
 * Whether a chat is closed, and what to say about it.
 *
 * Archiving is the deliberate "consolidate and close it down" act, so it locks.
 * A terminal `state` is reported but does NOT lock: a run that ended in error is
 * finished, not sacred, and its turn should still be removable so the user can
 * retry. `'cancelled'` reads the same way.
 */
export function chatClosure(
  chat: Pick<Chat, 'state' | 'archivedAt'> | null | undefined,
): ChatClosure {
  if (!chat) return { locked: false, closed: false }
  if (chat.archivedAt) {
    return {
      locked: true,
      closed: true,
      label: 'Closed',
      detail: 'This chat was consolidated and closed. Its history is kept as the record.',
    }
  }
  if (chat.state === 'completed') {
    return {
      locked: false,
      closed: true,
      label: 'Completed',
      detail: 'The work in this chat finished.',
    }
  }
  if (chat.state === 'cancelled') {
    return { locked: false, closed: true, label: 'Cancelled', detail: 'This chat was stopped.' }
  }
  if (chat.state === 'error') {
    return {
      locked: false,
      closed: true,
      label: 'Errored',
      detail: 'The last run in this chat failed.',
    }
  }
  return { locked: false, closed: false }
}
