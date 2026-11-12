/** What a spend raise's field is called, by the limit it raises. */
export const PROCESS_RETRY_SPEND_LABEL = {
  step: 'Spend for this attempt',
  run: 'Run spend limit',
} as const

/** What a spend raise's field says under it: what was spent of the limit reached. */
export const PROCESS_RETRY_SPEND_HINT = {
  step: (spent: string, cap: string) =>
    `It spent ${spent} of its ${cap} limit. Later steps keep the run’s limit.`,
  run: (spent: string, cap: string) => `The run has spent ${spent} of its ${cap} limit.`,
} as const

/** Why an amount cannot be the raise: it is not above what was spent. */
export const PROCESS_RETRY_SPEND_TOO_LOW = (spent: string): string =>
  `Enter an amount above ${spent}.`
