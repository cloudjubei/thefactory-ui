/** What a run's "Base branch" section in "More about this run" says. */
export const PROCESS_BASE_MOVED_COPY = {
  meaning: (commits: number): string =>
    `The work branch does not have ${commits === 1 ? 'it' : 'them'} yet.`,
  broughtIn: (baseRef: string, times: number): string =>
    `Brought in ${baseRef}${times > 1 ? ` · ${times} times` : ''}`,
} as const
