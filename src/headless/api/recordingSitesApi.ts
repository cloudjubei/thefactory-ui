import type { RecordingSiteState } from 'thefactory-tools/types'
import {
  listRecordingSites as listSites,
  startRecordingSiteSignIn as startSignIn,
} from './generated'

/** The sites recordings are fetched from, each with the person's own sign-in as last seen. */
export async function listRecordingSites(): Promise<RecordingSiteState[]> {
  const { data } = await listSites({ throwOnError: true })
  return data.sites
}

/**
 * Open a site's sign-in window on the backend's machine; answers the site as
 * it now stands. Asking again while the window is open opens no second one.
 */
export async function startRecordingSiteSignIn(siteId: string): Promise<RecordingSiteState> {
  const { data } = await startSignIn({ path: { siteId }, throwOnError: true })
  return data
}
