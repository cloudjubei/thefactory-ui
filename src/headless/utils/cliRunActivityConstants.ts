/** Shown under "Preparing <agent>…" — the container/CLI cold start is paid on turn 1. */
export const CLI_BOOT_SUBLABEL = 'The first message is slowest while the sandbox starts up.'

/** Shown under a blocked-on-approval line, so the pause reads as deliberate. */
export const CLI_BLOCKED_SUBLABEL = 'The agent is paused until you decide.'

/** Shown under a blocked-on-question line. */
export const CLI_QUESTION_SUBLABEL = 'The agent is waiting for your answer.'

/**
 * Live transcript appends are buffered and committed on this cadence. A verbose
 * turn emits entries far faster than a human can read; one state update per
 * entry re-derives the whole message list each time.
 */
export const CLI_TRANSCRIPT_FLUSH_MS = 120

/** Cadence of the since-last-action readout while a run is active. */
export const CLI_ELAPSED_TICK_MS = 1000

/**
 * How many runs' streamed transcripts stay in memory for remount recovery.
 * A chat shows one live run at a time; the headroom covers switching between a
 * few chats without losing any of their in-flight views.
 */
export const CLI_TRANSCRIPT_CACHE_MAX_RUNS = 8
