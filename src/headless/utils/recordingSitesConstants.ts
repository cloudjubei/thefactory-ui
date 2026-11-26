import type { RecordingSiteRowState } from './recordingSitesTypes'
import type { ProcessStatusTone } from './processView'

/** WS topic announcing that the person's sign-in to a recording site changed: its window opened or closed, or they signed in. */
export const RECORDING_SITES_EVENT = 'recordingSites:changed'

export const RECORDING_SITE_STATE_VIEW: Record<
  RecordingSiteRowState,
  { label: string; tone: ProcessStatusTone }
> = {
  'signed-in': { label: 'Signed in', tone: 'done' },
  'signed-out': { label: 'Signed out', tone: 'on_hold' },
  unknown: { label: 'Not checked', tone: 'empty' },
  'signing-in': { label: 'Signing in…', tone: 'working' },
}

export const RECORDING_SITES_TEXT = {
  heading: 'Recordings',
  intro:
    'Reviews watch a colleague’s recording through your own sign-in. Sign in once; it is yours, not the group’s.',
  signIn: (name: string) => `Sign in to ${name}`,
  signInAgain: 'Sign in again',
  windowOpen: 'A browser window is open on the machine running the backend. Sign in there.',
  checked: (ago: string) => `Checked ${ago}`,
  loading: 'Reading your sign-ins…',
  none: 'No recording sites yet.',
  readFailed: 'Could not read your sign-ins.',
  signInFailed: 'The sign-in window did not open.',
} as const
