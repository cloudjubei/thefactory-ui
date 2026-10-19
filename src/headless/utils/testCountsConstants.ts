/** What a test run that executed no test is said to have done — never shown as a pass. */
export const TEST_COUNT_NONE_RAN = '0 tests ran'

/** The head of a Tests pane, by how its run came out. */
export const TEST_TOTALS_TITLES = {
  failed: 'Test run completed with failures',
  unfinished: 'Test run didn’t finish',
  none: TEST_COUNT_NONE_RAN,
  passed: 'All configured layers passed',
} as const

const files = (n: number): string => `${n} ${n === 1 ? 'file' : 'files'}`

/** What became of the files that did not finish: all stopped at their limit, or some ended another way. */
const endedWords = (n: number, stopped: boolean): string =>
  stopped ? `${n === 1 ? 'was' : 'were'} stopped` : 'ended early'

/** The head of a Tests pane whose run left files unfinished: "Test run didn’t finish — one file was stopped". */
export const TEST_RUN_UNFINISHED_TITLE = (n: number, stopped: boolean): string =>
  `${TEST_TOTALS_TITLES.unfinished} — ${n === 1 ? 'one file' : `${n} files`} ${endedWords(n, stopped)}`

/** Its counts: "✓ 132 in 2 files · 1 file stopped". */
export const TEST_RUN_UNFINISHED_COUNTS = (
  n: number,
  stopped: boolean,
  finished: { files: number; passed: number } | undefined,
): string => {
  const ended = `${files(n)} ${stopped ? 'stopped' : 'ended early'}`
  return finished ? `✓ ${finished.passed} in ${files(finished.files)} · ${ended}` : ended
}
