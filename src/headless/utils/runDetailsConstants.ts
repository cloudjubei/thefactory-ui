/** The run page's "More about this run": what is kept folded below the decision and the report. */
export const RUN_DETAILS_COPY = {
  title: 'More about this run',
  preReadMeta: 'Before sign-off',
  baseBranch: 'Base branch',
  workAdded: 'Work added to this run',
  additions: (count: number): string => `${count} addition${count === 1 ? '' : 's'}`,
  debug: 'Debug · flight recorder',
  events: (count: number, trimmed: boolean): string =>
    `${count} event${count === 1 ? '' : 's'}${trimmed ? ' · older trimmed' : ''}`,
} as const
