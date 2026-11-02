/** The card button that opens the run's chat with the item quoted. */
export const NEEDS_YOU_DISCUSS_LABEL = 'Discuss'

/** The card's ✓: the item is fine as it is. */
export const NEEDS_YOU_FINE_LABEL = 'Fine as it is'

/** The words the backend records for an item marked fine as it is. */
export const NEEDS_YOU_FINE_SUMMARY = 'Fine as it is'

/** The outcome line of an item marked fine as it is. */
export const NEEDS_YOU_FINE_OUTCOME = 'Fine as it is — noted'

/** The button that hands every open item to the manager to weigh and propose a course for. */
export const NEEDS_YOU_TRIAGE_LABEL = 'Sort these out with the manager'

/** What that button sends to the run's chat, before the items themselves. */
export const NEEDS_YOU_TRIAGE_BRIEF = {
  lead: '**Sort out the open “Needs you” items with me.** For each one below, look into it — the code, the tests, the report and how this run went — say how serious it is, and recommend one course:',
  courses: [
    '- **Fix it in this run** — it has to be right before this work is merged: send it back with a request for changes that says exactly what to fix.',
    '- **Follow-up** — it matters, but not for this merge: file it as a feature on this story, or as a new story when it is separate work, in the project where it belongs as these projects are set up.',
    '- **Fine as it is** — say why, and settle it.',
  ],
  ask: 'Give me the plan first as a short list — each item by its reference, as below, how serious it is, what you recommend and why — then carry it out once I agree. Ask me only about what is genuinely my call.',
} as const

/** How long an item a link opened the run on stays lit. */
export const NEEDS_YOU_FOCUS_LIT_MS = 2400

/** The section's header once every item is settled. */
export const NEEDS_YOU_ALL_DECIDED = 'All decided'

/** The section's header when the report left nothing. */
export const NEEDS_YOU_NOTHING = 'Nothing'

/** How a quoted item opens the run chat's draft. */
export const NEEDS_YOU_QUOTE_HEADING = 'From “Needs you”'

/** Where an item's title ends, when it leads with one. */
export const NEEDS_YOU_TITLE_SEPARATORS: readonly string[] = [' — ', ': ', ' – ']

/** The longest leading phrase read as an item's title. */
export const NEEDS_YOU_TITLE_MAX_CHARS = 80

/** The chat button on every page of a run — its header, a nested run's, a step's. */
export const RUN_CHAT_OPEN_LABEL = 'Chat about this run'

/** The run chat's label beside its run: its slim header and the docked panel's name. */
export const RUN_CHAT_TITLE = 'Run chat'

/** Shown while the run's chat is being opened. */
export const RUN_CHAT_OPENING = 'Opening the run’s chat…'

/** The run chat's composer placeholder. */
export const RUN_CHAT_PLACEHOLDER = 'Ask about this run, or tell it what to change…'
