/** Where a "Test connection" against a backend URL stands. */
export type BackendTestState =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'ok'; version: string; uptime: number }
  | { kind: 'error'; message: string }

/** The line under a finished test. */
export type BackendTestLine = { tone: 'ok' | 'error'; text: string }
