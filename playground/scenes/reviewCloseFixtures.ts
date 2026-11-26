import type { ColleagueReview, ProcessRun } from 'thefactory-tools/types'
import { closeReview } from 'thefactory-tools/utils'

import { reviewCloseView } from '../../src/headless/utils/colleagueReviewClose'
import type {
  ReviewCloseContext,
  ReviewCloseView,
} from '../../src/headless/utils/colleagueReviewCloseTypes'
import { REVIEW_TICKET, ROUND_TWO } from './colleagueReviewFixtures'
import { OVERVIEW_FULL } from './groupTicketTabsFixtures'
import { MERGE_BASE_STOP_RUN_ID, RUN_MERGE_STOPPED_ON_BASE } from './mergeBaseStopFixtures'
import type { FixtureRoutes } from './onFixtures'
import { REVIEW_RUN_WAITING } from './reviewRunRoundsFixtures'
import { pageWithRun, RUN_AT_PUSH } from './ticketRunFixtures'

/** The moment every closing in these scenes is read at. */
export const CLOSE_NOW = Date.parse('2026-11-26T11:00:00.000Z')

const CLOSED_AT = '2026-11-26T09:00:00.000Z'

function closed(closing: Parameters<typeof closeReview>[1], at = CLOSED_AT): ColleagueReview {
  const update = closeReview(ROUND_TWO, closing, at)
  if (!update.ok) throw new Error(update.errors.join('\n'))
  return update.review
}

/** The review the person closed as resolved, with their note. */
export const REVIEW_RESOLVED = closed({
  by: 'person',
  via: 'web',
  note: 'Saif merges it himself.',
})

/** The review the host settled once its pull requests were merged on GitHub. */
export const REVIEW_SELF_SETTLED = closed({ by: 'host', reason: 'Merged on GitHub by saif.' })

/** The review a moment after the press, before the backend answered. */
export const REVIEW_CLOSING = closed({ by: 'person', via: 'web' }, '2026-11-26T11:00:00.000Z')

/** What the confirm is asked about: a review with a run open and an update waiting. */
export const CLOSE_CONTEXT: ReviewCloseContext = {
  ticketKey: REVIEW_TICKET,
  runOpen: true,
  offersWaiting: true,
}

const viewOf = (
  review: ColleagueReview | null,
  over: { closing?: 'resolved' | 'remove'; error?: string } = {},
): ReviewCloseView =>
  reviewCloseView({ review, closing: over.closing, error: over.error }, CLOSE_NOW)

/** Every state the action shows, by scene state id. */
export const CLOSE_VIEWS: Record<string, ReviewCloseView> = {
  idle: viewOf(ROUND_TWO),
  closing: viewOf(REVIEW_CLOSING, { closing: 'resolved' }),
  resolved: viewOf(REVIEW_RESOLVED),
  'self-settled': viewOf(REVIEW_SELF_SETTLED),
  removed: viewOf(null, { closing: 'remove' }),
  failed: viewOf(ROUND_TWO, { error: 'The review was not closed.' }),
}

const { park: _park, cursor: _cursor, ...ENDED } = REVIEW_RUN_WAITING

/** The review run the person closed as resolved while it waited for the developer. */
export const RUN_RESOLVED: ProcessRun = {
  ...ENDED,
  status: 'cancelled',
  endedAt: CLOSE_NOW,
  closedAs: {
    kind: 'resolved',
    summary: 'Handled outside Overseer.',
    note: 'Saif merges it himself.',
    at: CLOSE_NOW,
    decidedBy: 'person',
    decidedVia: 'web',
  },
}

/** The review run that settled itself once its pull requests were merged on GitHub. */
export const RUN_SELF_SETTLED: ProcessRun = {
  ...ENDED,
  status: 'cancelled',
  endedAt: CLOSE_NOW,
  closedAs: { kind: 'resolved', summary: 'Merged on GitHub by saif.', at: CLOSE_NOW },
}

/** The run of a review that was removed. */
export const RUN_REMOVED: ProcessRun = {
  ...ENDED,
  status: 'cancelled',
  endedAt: CLOSE_NOW,
  closedAs: {
    kind: 'not-needed',
    summary: 'The review was removed.',
    at: CLOSE_NOW,
    decidedBy: 'person',
    decidedVia: 'web',
  },
}

/** A run stopped at a failed step, then closed as resolved: it had failed, so it offers no Resume. */
export const RUN_RESOLVED_AFTER_FAILED: ProcessRun = {
  ...RUN_RESOLVED,
  closedAs: {
    ...RUN_RESOLVED.closedAs!,
    endedAs: { status: 'failed', error: 'Abandoned at Bring the base in.' },
  },
}

const { park: _pushPark, cursor: _pushCursor, ...PUSH_RUN_ENDED } = RUN_AT_PUSH

const OVERVIEW_RESOLVED = {
  ...OVERVIEW_FULL,
  review: {
    ...OVERVIEW_FULL.review!,
    runs: OVERVIEW_FULL.review!.runs.map((run) =>
      run.status === 'parked'
        ? { ...run, status: 'cancelled' as const, closedAs: 'resolved' as const }
        : run,
    ),
  },
}

/** OSC-409's page once its review was closed as resolved: no run works it, and its run reads Resolved. */
export const PAGE_RESOLVED = pageWithRun(OVERVIEW_RESOLVED, [
  {
    ...PUSH_RUN_ENDED,
    status: 'cancelled',
    endedAt: CLOSE_NOW,
    closedAs: RUN_RESOLVED.closedAs!,
  },
])

/** The run whose page the close sits on: a review run stopped where its merge could not go on. */
export const CLOSE_RUN_ID = MERGE_BASE_STOP_RUN_ID

/** What that page reads: the stopped run, and the review it reviews, still open. */
export const CLOSE_RUN_ROUTES: FixtureRoutes = {
  '/api/v1/process-runs/{runId}': () => RUN_MERGE_STOPPED_ON_BASE,
  '/api/v1/groups/{groupId}/tickets/{ticketKey}/review': () => ROUND_TWO,
}
