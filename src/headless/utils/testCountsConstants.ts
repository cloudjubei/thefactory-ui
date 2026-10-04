/** What a test run that executed no test is said to have done — never shown as a pass. */
export const TEST_COUNT_NONE_RAN = '0 tests ran'

/** The head of a Tests pane, by how its run came out. */
export const TEST_TOTALS_TITLES = {
  failed: 'Test run completed with failures',
  none: TEST_COUNT_NONE_RAN,
  passed: 'All configured layers passed',
} as const
