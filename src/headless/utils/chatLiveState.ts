// Pure reducer for the per-chat live state map behind ChatsContext. No React.

/**
 * Merge a patch into one chat's live state, returning the SAME object when the
 * patch changes nothing.
 *
 * A streaming CLI turn broadcasts an event per transcript entry, and almost
 * every one of them carries the same `cliRunId` the state already holds. Without
 * this, each event minted a fresh state object (and a fresh Map), re-rendering
 * every consumer of the chats context — sidebar rows, badges, other open chats —
 * many times a second while the agent worked.
 */
export function mergeChatLiveState<T extends object>(current: T, patch: Partial<T>): T {
  for (const key of Object.keys(patch) as (keyof T)[]) {
    if (!Object.is(current[key], patch[key])) return { ...current, ...patch }
  }
  return current
}

/**
 * Apply a patch to the keyed live-state map, preserving the map's identity when
 * the entry it would write is byte-for-byte what is already there.
 */
export function applyChatLiveStatePatch<T extends object>(
  states: ReadonlyMap<string, T>,
  key: string,
  empty: T,
  patch: Partial<T>,
): ReadonlyMap<string, T> {
  const current = states.get(key)
  // A missing entry can never satisfy this: `next` is always a real object, so a
  // chat with no live state yet always gets one written.
  const next = mergeChatLiveState(current ?? empty, patch)
  if (next === current) return states
  const merged = new Map(states)
  merged.set(key, next)
  return merged
}
