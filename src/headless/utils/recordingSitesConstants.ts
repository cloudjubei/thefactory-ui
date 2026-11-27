import type { RecordingSiteRowState } from './recordingSitesTypes'
import type { ProcessStatusTone } from './processView'

/** WS topic announcing that the person's sign-in to a recording site changed: a sign-in of it opened or ended, or they signed in. */
export const RECORDING_SITES_EVENT = 'recordingSites:changed'

/** What a recording site's sign-in session is, among the sign-in sessions. */
export const RECORDING_SIGN_IN_KIND = 'recording-site'

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
  showSignIn: 'Show sign-in',
  signInOpen: 'The sign-in is open. It closes by itself once you’re signed in.',
  checked: (ago: string) => `Checked ${ago}`,
  loading: 'Reading your sign-ins…',
  none: 'No recording sites yet.',
  readFailed: 'Could not read your sign-ins.',
  signInFailed: 'The sign-in did not open.',
} as const
