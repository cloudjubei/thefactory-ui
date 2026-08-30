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
export const QUESTION_CARD_SUBTITLE = 'The run is paused until you answer.'

export const QUESTION_ANSWER_PLACEHOLDER = 'Type your answer…'

export const QUESTION_SUBMIT_LABEL = 'Send answer'

export const QUESTION_DECLINE_LABEL = 'Let the agent decide'
