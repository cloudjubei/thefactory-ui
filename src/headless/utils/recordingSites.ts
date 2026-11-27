import type { RecordingSignInState, RecordingSiteState } from 'thefactory-tools/types'
import { RECORDING_SITE_STATE_VIEW, RECORDING_SITES_TEXT } from './recordingSitesConstants'
import type {
  RecordingSiteRowState,
  RecordingSiteRowView,
  RecordingSitesSnapshot,
  RecordingSitesView,
} from './recordingSitesTypes'
import { timeAgo } from './time'

const SIGN_IN_STATES: readonly RecordingSignInState[] = ['signed-in', 'signed-out', 'unknown']

/**
 * The sites as views draw them: one whose sign-in the person asked for reads
 * as signing in before the backend answers. The same list while nothing is on
 * its way. Pure.
 */
export function recordingSitesShown(
  sites: readonly RecordingSiteState[] | undefined,
  starting: readonly string[],
): readonly RecordingSiteState[] | undefined {
  if (!sites || !sites.some((site) => starting.includes(site.id) && !site.signingIn)) return sites
  return sites.map((site) =>
    starting.includes(site.id) && !site.signingIn ? { ...site, signingIn: true } : site,
  )
}

/** The sites with one as the backend now tells it: in place of the one held, or added. Pure. */
export function recordingSitesWith(
  sites: readonly RecordingSiteState[] | undefined,
  changed: RecordingSiteState,
): RecordingSiteState[] {
  const held = sites ?? []
  return held.some((site) => site.id === changed.id)
    ? held.map((site) => (site.id === changed.id ? changed : site))
    : [...held, changed]
}

/**
 * Whether a press on a site's sign-in is sent: the site is listed, and no
 * press on it is still on its way. A site whose sign-in is open is asked
 * again: the backend opens nothing more and answers the open one, to show.
 * Pure.
 */
export function recordingSignInAskable(
  sites: readonly RecordingSiteState[] | undefined,
  starting: readonly string[],
  siteId: string,
): boolean {
  return !!sites?.some((site) => site.id === siteId) && !starting.includes(siteId)
}

/** The site a `recordingSites:changed` event tells, or `undefined` when it tells none. Pure. */
export function recordingSiteChangeOf(data: unknown): RecordingSiteState | undefined {
  const site = (data as { site?: unknown } | null | undefined)?.site
  if (!site || typeof site !== 'object') return undefined
  const { id, name, state, signingIn, checkedAt } = site as Record<string, unknown>
  if (typeof id !== 'string' || id === '' || typeof name !== 'string') return undefined
  if (!SIGN_IN_STATES.some((known) => known === state) || typeof signingIn !== 'boolean') {
    return undefined
  }
  return {
    id,
    name,
    state: state as RecordingSignInState,
    signingIn,
    ...(typeof checkedAt === 'string' ? { checkedAt } : {}),
  }
}

function siteRow(
  site: RecordingSiteState,
  open: boolean,
  busy: boolean,
  error: string | undefined,
  now: number,
): RecordingSiteRowView {
  const state: RecordingSiteRowState = site.signingIn ? 'signing-in' : site.state
  const shown = RECORDING_SITE_STATE_VIEW[state]
  const checkedAt = site.checkedAt ? Date.parse(site.checkedAt) : NaN
  const signedIn = site.state === 'signed-in'
  return {
    id: site.id,
    name: site.name,
    state,
    stateLabel: shown.label,
    tone: shown.tone,
    signingIn: site.signingIn,
    busy,
    action: open
      ? RECORDING_SITES_TEXT.showSignIn
      : signedIn
        ? RECORDING_SITES_TEXT.signInAgain
        : RECORDING_SITES_TEXT.signIn(site.name),
    primary: open || !signedIn,
    ...(!site.signingIn && !Number.isNaN(checkedAt)
      ? { checked: RECORDING_SITES_TEXT.checked(timeAgo(now, checkedAt)) }
      : {}),
    ...(open ? { hint: RECORDING_SITES_TEXT.signInOpen } : {}),
    ...(error ? { error } : {}),
  }
}

/** The person's recording sites as Settings shows them. Pure. */
export function recordingSitesView(
  snapshot: RecordingSitesSnapshot,
  now: number,
): RecordingSitesView {
  const shown = recordingSitesShown(snapshot.sites, snapshot.starting)
  return {
    loading: shown === undefined && !snapshot.readError,
    sites: (shown ?? []).map((site) =>
      siteRow(
        site,
        !!snapshot.sites?.some((held) => held.id === site.id && held.signingIn),
        snapshot.starting.includes(site.id),
        snapshot.failed[site.id],
        now,
      ),
    ),
    ...(snapshot.readError ? { readError: snapshot.readError } : {}),
  }
}
