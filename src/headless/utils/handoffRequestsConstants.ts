/** How every fix hand-off ends: never by skipping the check, and with the result filed. */
export const HANDOFF_FIX_TAIL =
  'do not remove or skip the check — then run it again on that branch and file the result as evidence on this run.'

/** Leads the end of a check's output, for a run that did not finish. */
export const HANDOFF_OUTPUT_TAIL_LEAD = 'Output (last lines):'

/** One test file that did not finish, in its own words: "a.test.ts was stopped after 30 s". */
export const HANDOFF_UNFINISHED_FILE = (path: string, reason: string): string =>
  /^stopped\b/.test(reason) ? `${path} was ${reason}` : `${path} ${reason}`

/** How the other files went: " (the other 2 files passed 132 tests)". */
export const HANDOFF_UNFINISHED_OTHERS = (files: number, passed: number): string =>
  ` (the other ${files === 1 ? 'file' : `${files} files`} passed ${passed} ${passed === 1 ? 'test' : 'tests'})`

/** Leads the last lines a file printed: its own when it is the only one, else named. */
export const HANDOFF_UNFINISHED_LAST_OUTPUT = (path: string | undefined): string =>
  path ? `Last output of ${path}:` : 'Its last output:'

/** What the agent is asked to find, before the fix tail. */
export const HANDOFF_UNFINISHED_FIND = (one: boolean, stopped: boolean): string =>
  stopped
    ? `Find why ${one ? 'it stops' : 'they stop'} —`
    : `Find why ${one ? 'it doesn’t finish' : 'they don’t finish'} —`
