import type { CliCapabilityTone } from './cliCapabilityCardTypes'

/** What a probe row's status column says, by tone. */
export const CLI_CAPABILITY_STATUS_LABELS: Readonly<Record<CliCapabilityTone, string>> = {
  pass: 'PASS',
  fail: 'FAIL',
  none: 'N/A',
}

/** The mark before a failing probe's case, by its result. */
export const CLI_CAPABILITY_CASE_MARKS: Readonly<Record<'pass' | 'fail', string>> = {
  pass: '✓',
  fail: '✗',
}

/** The capability battery button's longer note. */
export const CLI_CAPABILITY_BATTERY_HINT =
  'Run the capability battery: structured output, grounding, off-topic refusal, canonicalization, latency and web search'
