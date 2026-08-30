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
