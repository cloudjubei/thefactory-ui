/** The statistics' words. */
export const PROCESS_STATISTICS_COPY = {
  heading: 'How it has done',
  version: (version: number) => `v${version}`,
  runs: (count: number) => `${count} ${count === 1 ? 'run' : 'runs'}`,
  firstPass: (percent: number) => `${percent}% first pass`,
  iterations: (median: number) => `${median} ${median === 1 ? 'attempt' : 'attempts'}`,
  cost: (usd: string) => `$${usd} a run`,
} as const
