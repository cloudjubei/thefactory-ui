/** The only shape the delete range needs: what kind of message each row is. */
export type DeletableMessage = { role: string }

/**
 * The FIRST index the delete control would remove, or `undefined` when it would
 * remove nothing. Everything from there to the end goes.
 *
 * PAIRED with `deleteLastMessage` in thefactory-tools (`src/chats/ChatsTools.ts`),
 * which always trims a SUFFIX: a trailing run of `tool` messages goes together
 * with the `assistant` message that produced them, because half a tool round-trip
 * is not a state the model can be resumed from. Anything else removes one message.
 * The two must agree — change one and change the other, or the panel will
 * highlight rows that survive (or miss rows that do not).
 *
 * Note what is NOT in the range: the user's own message. Deleting a turn takes
 * the agent's reply away and leaves the request that prompted it.
 */
export function lastMessageDeleteFromIndex(
  messages: readonly DeletableMessage[],
): number | undefined {
  if (messages.length === 0) return undefined

  const last = messages[messages.length - 1]
  if (last?.role !== 'tool') return messages.length - 1

  let i = messages.length - 1
  while (i >= 0 && messages[i]?.role === 'tool') i--
  const toolTailCount = messages.length - 1 - i
  const trimCount = i >= 0 && messages[i]?.role === 'assistant' ? toolTailCount + 1 : toolTailCount
  return Math.max(0, messages.length - trimCount)
}

/**
 * Whether the row at `index` is inside what the delete control would remove.
 * `previewing` is the hover/focus state, so one call answers "should this row
 * light up right now".
 */
export function isInDeleteRange(
  index: number,
  fromIndex: number | undefined,
  previewing: boolean,
): boolean {
  if (!previewing || fromIndex === undefined) return false
  return index >= fromIndex
}
