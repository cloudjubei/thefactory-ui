/** Shape version stamped on every dump, bumped when the document changes. */
export const CHAT_DEBUG_DUMP_VERSION = 1

/** Characters kept from any single text or serialized value before it is cut. */
export const CHAT_DEBUG_TEXT_PREFIX_CHARS = 1000

/** Characters of projected stored-message JSON the document may carry. */
export const CHAT_DEBUG_MESSAGES_BUDGET_CHARS = 60_000

/** Characters of verbatim transcript-entry JSON the document may carry across every run. */
export const CHAT_DEBUG_RAW_TRANSCRIPT_BUDGET_CHARS = 250_000

/** Characters of normalized-step + derived-message JSON the document may carry across every run. */
export const CHAT_DEBUG_INTERPRETED_BUDGET_CHARS = 150_000

/** Stand-in for a transcript payload that cannot be serialized (a cycle, a BigInt). */
export const CHAT_DEBUG_UNSERIALIZABLE_PAYLOAD = '[unserializable payload]'

/** The Debug view's words for a chat's context upkeep. */
export const CHAT_DEBUG_CONTEXT_COPY = {
  turns: (n: number) => `${n} ${n === 1 ? 'turn' : 'turns'} since last notes update`,
  checkpoints: (n: number) => `${n} ${n === 1 ? 'checkpoint' : 'checkpoints'}`,
  last: (reason: string, how: string) => `last: ${reason}, ${how}`,
  running: 'running',
} as const
