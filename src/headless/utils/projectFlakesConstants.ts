/** The heading over a project's known flaky tests. */
export const PROJECT_FLAKES_HEADING = 'Flaky tests'

/** What a project with no known flaky test shows. */
export const PROJECT_FLAKES_NONE = 'None so far.'

/** How many runs a flaky test was seen in. */
export const projectFlakeSeen = (runs: number): string =>
  `Seen in ${runs} run${runs === 1 ? '' : 's'}`

/** The fix filed for a flaky test, by its title. */
export const projectFlakeFixFiled = (title: string): string => `Fix filed: ${title}`

/** The chip on a check that had tests fail in the full run and pass alone. */
export const checkFlakyChipLabel = (count: number): string => `${count} flaky`

/** What the chip says on hover: the tests, by name. */
export const checkFlakyChipDetail = (names: readonly string[]): string =>
  `Failed in the full run, passed alone: ${names.join(', ')}`
