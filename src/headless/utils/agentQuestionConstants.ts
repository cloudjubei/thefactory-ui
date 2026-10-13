/** Broker action `kind` raised by the agent-side `askUser` tool. */
export const QUESTION_ACTION_KIND = 'question'

/**
 * Broker action `kind` a process step's agent raises with `reportBlocked`. It
 * is answered like a question — with words, or "resolved" — so it takes the
 * question card.
 */
export const BLOCKER_ACTION_KIND = 'blocker'

/** Stand-in prompt when the payload carries no readable question text. */
export const QUESTION_FALLBACK_PROMPT = 'The agent asked a question, but sent no question text.'

/** Answer handed back when the user declines to answer. */
export const QUESTION_DECLINED_ANSWER =
  'The user declined to answer. Proceed using your best judgement.'

/** Card heading — the same wording on every client. */
export const QUESTION_CARD_TITLE = 'Waiting on your answer'

/** The pill on the option the agent would pick itself. */
export const QUESTION_AGENTS_PICK = 'Agent’s pick'

/** What an option row says it does on a click. */
export const QUESTION_OPTION_SEND = 'Send'

/** Opens the box for an answer in the person's own words. */
export const QUESTION_SOMETHING_ELSE = 'Something else…'

export const QUESTION_ANSWER_PLACEHOLDER = 'Type your answer — @ to point at a file'

export const QUESTION_SUBMIT_LABEL = 'Send answer'

export const QUESTION_DECLINE_LABEL = 'Let the agent decide'

/** Sets the question aside without answering it; it stays waiting. */
export const QUESTION_PARK_LABEL = 'Not now — keep it waiting'

/** The slim row a question set aside folds to. */
export const QUESTION_STILL_WAITING = 'Still waiting:'

/** Brings a question set aside back to answer it. */
export const QUESTION_REOPEN_LABEL = 'Answer'

/** Shows the rest of a long background. */
export const QUESTION_MORE = 'More'

/** The pager over several open asks. */
export const QUESTION_PAGER = (shown: number, total: number): string =>
  `${shown} of ${total} waiting on you`

/** What an answered question's bubble says under it. */
export const QUESTION_ANSWERED_BY = {
  answered: 'You answered',
  'agent-decides': 'You let the agent decide',
} as const

/** The answer line of a question handed back to the agent. */
export const QUESTION_AGENT_DECIDES_ANSWER = 'Your call — decide as you think best.'

/** The picker's primary button, by what it picks. */
export const QUESTION_PICKER_VERB = {
  branch: 'Use this branch',
  file: 'Use this file',
  story: 'Use this story',
  feature: 'Use this feature',
  project: 'Use this project',
  chat: 'Use this chat',
  process: 'Use this process',
} as const

/** The picker's filter placeholder, by what it lists. */
export const QUESTION_PICKER_FILTER = {
  branch: (n: number) => `Filter ${n} ${n === 1 ? 'branch' : 'branches'}`,
  file: (n: number) => `Filter ${n} ${n === 1 ? 'file' : 'files'}`,
  story: (n: number) => `Filter ${n} ${n === 1 ? 'story' : 'stories'}`,
  feature: (n: number) => `Filter ${n} ${n === 1 ? 'feature' : 'features'}`,
  project: (n: number) => `Filter ${n} ${n === 1 ? 'project' : 'projects'}`,
  chat: (n: number) => `Filter ${n} ${n === 1 ? 'chat' : 'chats'}`,
  process: (n: number) => `Filter ${n} ${n === 1 ? 'process' : 'processes'}`,
} as const

/** The picker when nothing of its kind is at hand, or nothing matches the filter. */
export const QUESTION_PICKER_EMPTY = 'Nothing here matches.'

/** The picker while the host is still reading its items. */
export const QUESTION_PICKER_LOADING = 'Loading…'

/** The most rows a picker lists at once — the filter reaches the rest. */
export const QUESTION_PICKER_LIMIT = 50

/** A branch row's second line. */
export const QUESTION_BRANCH_DETAIL = {
  current: 'The checked-out branch',
  default: 'The default branch',
  remoteOnly: 'Only on the remote',
} as const
