/** Broker action `kind` raised by the agent-side `askUser` tool. */
export const QUESTION_ACTION_KIND = 'question'

/** Stand-in prompt when the payload carries no readable question text. */
export const QUESTION_FALLBACK_PROMPT = 'The agent asked a question, but sent no question text.'

/** Answer handed back when the user declines to answer. */
export const QUESTION_DECLINED_ANSWER =
  'The user declined to answer. Proceed using your best judgement.'

/** Card heading — the same wording on every client. */
export const QUESTION_CARD_TITLE = 'The agent has a question'

/** Card sub-heading, explaining that the run is parked until an answer lands. */
export const QUESTION_CARD_SUBTITLE =
  'It is waiting on this — answer whenever you like, or cancel to carry on typing.'

export const QUESTION_ANSWER_PLACEHOLDER = 'Type your answer…'

export const QUESTION_SUBMIT_LABEL = 'Send answer'

export const QUESTION_DECLINE_LABEL = 'Let the agent decide'

/**
 * Withdraw the question. NOT the same as declining: declining is an answer the
 * agent carries on from, this takes the question off the table and hands the
 * composer back.
 */
export const QUESTION_CANCEL_LABEL = 'Cancel question'

/**
 * Why the composer is gone. The question owns it, so the user's options are
 * exactly two: answer it, or cancel it and type anything again.
 */
export const QUESTION_BLOCKS_COMPOSER_HINT =
  'Cancel the question to go back to typing your own message.'
