/**
 * `localStorage`-backed adapter around the headless `ChatsSeenMap`. Same
 * read-state map every per-device app needs (web + desktop renderer) —
 * mobile has its own MMKV-backed peer that mirrors this surface.
 *
 * Two-layer surface:
 *  - `readChatsSeen()` / `writeChatsSeen()` are imperative APIs that hit
 *    `localStorage` directly. Tests, scripts, and one-off callers use them.
 *  - `useChatsSeen()` is the React hook layer backed by
 *    `useSyncExternalStore` + an in-memory snapshot. Integrates with React's
 *    scheduler — same-tab writes notify subscribers via `queueMicrotask`
 *    (storage events don't fire in the originating document); cross-tab
 *    writes hydrate via the `storage` event.
 *
 * Pure helpers (`isChatUnread`, `markSeen`) live in
 * `thefactory-ui/headless` — this file is the browser binding only.
 */

import { useSyncExternalStore } from 'react'
import type { ChatsSeenMap } from '../../../headless/utils/chatRowStatus'

export type { ChatsSeenMap }

const STORAGE_KEY = 'thefactory.chatsSeen'
const EVT_KEY = 'thefactory.chatsSeen:changed'

export const CHATS_SEEN_EVENT = EVT_KEY

export function readChatsSeen(): ChatsSeenMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as ChatsSeenMap
  } catch {
    return {}
  }
}

export function writeChatsSeen(next: ChatsSeenMap): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* localStorage unavailable or quota exceeded */
  }
  snapshot = next
  queueMicrotask(notify)
  try {
    window.dispatchEvent(new CustomEvent(EVT_KEY))
  } catch {
    /* unavailable */
  }
}

let snapshot: ChatsSeenMap = typeof window !== 'undefined' ? readChatsSeen() : {}
const listeners = new Set<() => void>()

function notify() {
  for (const l of listeners) l()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (ev) => {
    if (ev.key !== STORAGE_KEY) return
    snapshot = readChatsSeen()
    notify()
  })
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot(): ChatsSeenMap {
  return snapshot
}

/**
 * React hook returning the current `ChatsSeenMap`. Use instead of
 * `useState(readChatsSeen)` + a window-event listener — it integrates with
 * React's scheduler and avoids cross-component setState warnings.
 */
export function useChatsSeen(): ChatsSeenMap {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
