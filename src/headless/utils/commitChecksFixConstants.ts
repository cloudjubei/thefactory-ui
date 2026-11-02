/** The title of the chat a "Fix with an agent" on stopped commit checks opens. */
export const COMMIT_CHECKS_FIX_TOPIC_TITLE = 'Fix commit checks'

/** What the agent is asked to do — the first lines of the brief it is sent. */
export const COMMIT_CHECKS_FIX_ASK = [
  'My commit was stopped by the project’s commit checks (its git pre-commit hook). Fix what they report in the staged files so the commit goes through, and run the same checks to confirm they pass.',
  'Change only what the checks need. Do not commit — your change comes back to me to apply, and I commit once it is in.',
]
