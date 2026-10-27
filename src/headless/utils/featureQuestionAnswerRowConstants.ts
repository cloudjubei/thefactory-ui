/** What an approved answer to a feature's question did, in one line on its tool row. */
export const FEATURE_QUESTION_ANSWER_ROW_COPY = {
  saved: 'Answer saved',
  carriedOn: 'The work carried on',
  stillOpen: (n: number) =>
    n === 1 ? 'The work waits on 1 more question' : `The work waits on ${n} more questions`,
  notCarriedOn: (why: string) => `The work did not carry on: ${why}`,
} as const
