/** Words for the access trail on a run's report and on the run page. */
export const ACCESS_RECORD_COPY = {
  title: 'Access',
  summary: (count: number): string => `${count} record${count === 1 ? '' : 's'}`,
  /** Who the record stored, in the same words a decision uses. Anything else is shown as stored. */
  who: {
    person: 'You',
    manager: 'The manager',
    agent: 'An agent',
  },
} as const
