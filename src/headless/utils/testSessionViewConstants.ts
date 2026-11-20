/** The websocket event a change to a test session goes out on. */
export const TEST_SESSION_EVENT = 'process:test-session-update'

/** The most log lines the block shows: the latest. */
export const TEST_SESSION_SHOWN_LINES = 12

/** The words of the "Test with me" block. */
export const TEST_SESSION_COPY = {
  title: 'Test with me',
  idle: 'Run the app from this work while you test',
  starting: 'Starting…',
  running: 'Running',
  stopping: 'Stopping…',
  stopped: 'Stopped',
  failed: 'Could not start',
  start: 'Test with me',
  startAgain: 'Start again',
  stop: 'Stop',
  open: 'Open app',
  data: (environment: string) => `Data: ${environment}`,
  noData: 'Data: not set',
  linesTitle: 'Log',
  linesEmpty: 'Nothing to report yet.',
  proofTitle: 'Proof',
  proofEmpty: 'No proof yet.',
  errors: 'Errors',
  warnings: 'Warnings',
  feature: 'This change',
  record: 'Record',
  event: 'Event',
  noEnvironment: 'no environment',
  helperGathering: 'Helper gathering proof',
  helperStopped: 'Helper stopped',
  helperNotStarted: 'Helper did not start',
  openChat: 'Open chat',
  chipNote: 'The helper runs on this.',
  startFailed: 'Could not start the test.',
  stopFailed: 'Could not stop the test.',
} as const

/** What a person confirms before a session is stopped. */
export const TEST_SESSION_STOP_CONFIRM_COPY = {
  title: 'Stop testing?',
  body: 'The app served for this test goes down. The log and proof stay.',
  confirm: 'Stop',
  cancel: 'Keep running',
} as const

/** How each kind of log line is named. */
export const TEST_SESSION_LINE_LABELS = {
  error: 'Error',
  warning: 'Warning',
  feature: 'Change',
} as const
