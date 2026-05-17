/**
 * Pure helpers for deriving "is chat thinking" state from a snapshot.
 *
 * Pair with `useDebouncedSetExit` in headless to flicker-proof the displayed
 * spinner state.
 */

export type ThinkingChatLike = { key: string; isThinking?: boolean }
export type ThinkingChatsByProjectId = Record<string, ReadonlyArray<ThinkingChatLike>>

/** Set of chat keys currently streaming a response. */
export function computeThinkingKeys(chatsByProjectId: ThinkingChatsByProjectId): Set<string> {
  const set = new Set<string>()
  for (const arr of Object.values(chatsByProjectId)) {
    for (const c of arr) if (c.isThinking) set.add(c.key)
  }
  return set
}

/** Map of `chatKey -> projectId` for downstream aggregation. */
export function computeChatKeyToProjectId(
  chatsByProjectId: ThinkingChatsByProjectId,
): Map<string, string> {
  const map = new Map<string, string>()
  for (const [pid, arr] of Object.entries(chatsByProjectId)) {
    for (const c of arr) map.set(c.key, pid)
  }
  return map
}

/** Count of thinking chats per project, given a (possibly debounced) key set. */
export function aggregateThinkingByProject(
  displayedThinkingKeys: ReadonlySet<string>,
  keyToProjectId: ReadonlyMap<string, string>,
): Map<string, number> {
  const out = new Map<string, number>()
  for (const k of displayedThinkingKeys) {
    const pid = keyToProjectId.get(k)
    if (!pid) continue
    out.set(pid, (out.get(pid) ?? 0) + 1)
  }
  return out
}
