import { UI_SERVE_BUILD_TIMEOUT_MS } from 'thefactory-tools/constants'

/** One minute, in milliseconds. The field is edited in minutes and stored in milliseconds. */
export const SERVE_BUILD_LIMIT_MINUTE_MS = 60_000

/**
 * How long a serve may spend building when the project sets no limit.
 * The same bound as thefactory-tools `UI_SERVE_BUILD_TIMEOUT_MS`.
 */
export const SERVE_BUILD_LIMIT_DEFAULT_MS = UI_SERVE_BUILD_TIMEOUT_MS

export const SERVE_BUILD_LIMIT_COPY = {
  title: 'Serve',
  lead: 'How long a build of this project may run when it is served. A large app can have more time here without changing the limit for every project.',
  label: 'Build limit',
  unit: 'minutes',
  hint: (minutes: string) => `Blank uses ${minutes} minutes, the limit every project starts with.`,
  invalid: 'Enter a number of minutes above 0.',
  saved: 'Saved',
  saveFailed: 'Could not save the build limit. Try again.',
} as const
