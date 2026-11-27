import type { RecordingSignInState, RecordingSiteState } from 'thefactory-tools/types'
import type { ProcessStatusTone } from './processView'

/** The person's recording sites as views draw them: the backend's word, the sign-ins on their way over it. */
export interface RecordingSitesSnapshot {
  /** `undefined` until the first read answers. */
  sites: readonly RecordingSiteState[] | undefined
  readError: string | undefined
  /** The sites whose sign-in the person asked for and the backend has not answered yet. */
  starting: readonly string[]
  /** Why a site's last sign-in did not start, by site id. */
  failed: Readonly<Record<string, string>>
}

/** How a site's row reads: its sign-in as last seen, or the sign-in going on now. */
export type RecordingSiteRowState = RecordingSignInState | 'signing-in'

/** One recording site as Settings shows it. */
export interface RecordingSiteRowView {
  id: string
  name: string
  state: RecordingSiteRowState
  stateLabel: string
  tone: ProcessStatusTone
  /** A sign-in of the site is open, or on its way. */
  signingIn: boolean
  /** The press is on its way to the backend: the button waits. */
  busy: boolean
  /** "Sign in to Loom", "Sign in again" once signed in, or "Show sign-in" while one is open. */
  action: string
  /** The action is the row's main one: the person is not signed in, or a sign-in is open. */
  primary: boolean
  /** When the sign-in was last seen on the site, in a line. */
  checked?: string
  /** What an open sign-in does next. */
  hint?: string
  /** Why the last sign-in did not start. */
  error?: string
}

/** The person's recording sites as Settings shows them. */
export interface RecordingSitesView {
  /** The first read is still out. */
  loading: boolean
  sites: RecordingSiteRowView[]
  readError?: string
}
