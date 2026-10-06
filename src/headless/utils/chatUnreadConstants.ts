/** How long a chat holds its open position while its replies load, unless the user scrolls first. */
export const CHAT_OPEN_SETTLE_MAX_MS = 15_000
/** Share of the viewport left above the first unread reply, so the last read one shows too. */
export const CHAT_OPEN_ANCHOR_HEADROOM = 0.3
/** Read messages kept above the first unread one when the window widens to reach it. */
export const CHAT_OPEN_ANCHOR_CONTEXT_MESSAGES = 5

/** What a chat row's "!" badge says: every message is read, and the agent is waiting on the user. */
export const CHAT_AWAITING_ANSWER_LABEL = 'Waiting for your answer'
