import type { ProcessRunStatus } from 'thefactory-tools/types'

/** The account each CLI signs in to, as a person calls it. */
export const SIGN_IN_NAMES: Readonly<Record<string, string>> = {
  'claude-code': 'Claude',
  codex: 'Codex',
  'cursor-agent': 'Cursor',
}

/** A run whose agents still work, or will once the person answers. */
export const SIGN_IN_LIVE_RUN_STATUSES: ReadonlySet<ProcessRunStatus> = new Set([
  'pending',
  'running',
  'parked',
])

export const SIGN_IN_EXPIRED_SUFFIX = 'sign-in expired'

export const SIGN_INS_EXPIRED_SUFFIX = 'sign-ins expired'

/** The form a sign-in card is. */
export const SIGN_IN_CARD_PROVIDER = 'cli-login'
