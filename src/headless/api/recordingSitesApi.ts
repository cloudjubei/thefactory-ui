import type { RecordingSiteState, SignInSessionState } from 'thefactory-tools/types'
import {
  listRecordingSites as listSites,
  startRecordingSiteSignIn as startSignIn,
} from './generated'

/** The sites recordings are fetched from, each with the person's own sign-in as last seen. */
export async function listRecordingSites(): Promise<RecordingSiteState[]> {
  const { data } = await listSites({ throwOnError: true })
  return data.sites
}

/** A site's sign-in begun, or already going: the site as it now stands, and the session the app shows. */
export interface RecordingSiteSignIn {
  site: RecordingSiteState
  session: SignInSessionState
}

/**
 * Open a site's sign-in as a session the app shows; answers the site as it
 * now stands and that session. Asking again while it is open opens no second
 * one and answers the open session.
 */
export async function startRecordingSiteSignIn(siteId: string): Promise<RecordingSiteSignIn> {
  const { data } = await startSignIn({ path: { siteId }, throwOnError: true })
  return data
}
