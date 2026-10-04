import type { ChatContext } from '../api/generated'
import { SINGLE_CHAT_UPDATE_ACTIONS } from './chatUpdatesConstants'

/**
 * The one chat a `chats:updated` event changed, when refetching that chat is
 * enough — or `undefined` when the whole list must be read again (a chat left
 * it, or the event does not say which chat).
 */
export function chatUpdateTarget(data: unknown): ChatContext | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const { action, context } = data as { action?: unknown; context?: unknown }
  if (typeof action !== 'string' || !SINGLE_CHAT_UPDATE_ACTIONS.has(action)) return undefined
  return typeof context === 'object' && context !== null ? (context as ChatContext) : undefined
}

/** The list with `chat` in place of the one with the same context, or added. */
export function withChat<T>(chats: readonly T[], chat: T, keyOf: (c: T) => string): T[] {
  const key = keyOf(chat)
  const i = chats.findIndex((c) => keyOf(c) === key)
  if (i < 0) return [...chats, chat]
  const next = [...chats]
  next[i] = chat
  return next
}

/**
 * A full list read merged over the current one. The read is a snapshot from
 * when it began: a chat refetched on its own since then (`fresher`) is newer
 * than the snapshot's copy, and is kept — or added, if the snapshot predates it.
 */
export function withFullRefresh<T>(
  current: readonly T[],
  fetched: readonly T[],
  fresher: ReadonlySet<string>,
  keyOf: (c: T) => string,
): T[] {
  if (fresher.size === 0) return [...fetched]
  const kept = new Map<string, T>()
  for (const c of current) if (fresher.has(keyOf(c))) kept.set(keyOf(c), c)
  const next = fetched.map((c) => kept.get(keyOf(c)) ?? c)
  const present = new Set(fetched.map(keyOf))
  for (const [k, c] of kept) if (!present.has(k)) next.push(c)
  return next
}
