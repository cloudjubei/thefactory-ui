import type { RecordingSiteState } from 'thefactory-tools/types'
import type { RecordingSitesSnapshot } from 'thefactory-ui/headless'

/** The moment the fixed states are drawn at, so "Checked 3 minutes ago" never moves. */
export const RECORDINGS_NOW = Date.parse('2026-11-26T12:00:00.000Z')

const LOOM: RecordingSiteState = { id: 'loom', name: 'Loom', state: 'unknown', signingIn: false }

const CHECKED = '2026-11-26T11:57:00.000Z'

export function recordingSites(
  loom: Partial<RecordingSiteState> = {},
  patch: Partial<RecordingSitesSnapshot> = {},
): RecordingSitesSnapshot {
  return {
    sites: [{ ...LOOM, ...loom }],
    readError: undefined,
    starting: [],
    failed: {},
    ...patch,
  }
}

/** Every state of the Recordings block, by the id its scene state and its mobile view share. */
export const RECORDING_SITES_STATES: Record<string, RecordingSitesSnapshot> = {
  'not-checked': recordingSites(),
  'signed-out': recordingSites({ state: 'signed-out', checkedAt: CHECKED }),
  starting: recordingSites({}, { starting: ['loom'] }),
  'signing-in': recordingSites({ signingIn: true }),
  'signed-in': recordingSites({ state: 'signed-in', checkedAt: CHECKED }),
  'signing-in-again': recordingSites({ state: 'signed-in', checkedAt: CHECKED, signingIn: true }),
  'sign-in-failed': recordingSites(
    {},
    {
      failed: {
        loom: 'The sign-in could not be opened: no browser is installed where the backend runs.',
      },
    },
  ),
  'timed-out': recordingSites(
    { state: 'signed-out', checkedAt: CHECKED },
    {
      failed: {
        loom: 'The sign-in was open too long and closed. Start it again when you’re ready.',
      },
    },
  ),
  loading: recordingSites({}, { sites: undefined }),
  'read-failed': recordingSites(
    {},
    {
      sites: undefined,
      readError: 'The backend is temporarily unavailable. Try again in a moment.',
    },
  ),
}
