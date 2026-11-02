/** What a "Needs you" item's chip and its preview card say. */
export const NEEDS_YOU_REFERENCE_COPY = {
  caption: 'Needs you item',
  open: 'Open',
  settled: 'Settled',
  run: 'Run',
  outcome: 'Outcome',
  openOnRun: 'Open on the run',
  gone: 'This item is no longer on the run’s report',
  labelMaxChars: 60,
} as const

/** The run page's query parameter a "Needs you" item link opens it with: `?needsYou=<itemId>`. */
export const NEEDS_YOU_LINK_PARAM = 'needsYou'
