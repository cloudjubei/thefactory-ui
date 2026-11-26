import {
  FAKE_REVIEW_RUN,
  FAKE_REVIEW_RUN_STOPPED,
  fakeProcessRunsMatching,
} from '../../src/fakeBackend/fixtures/processRuns'
import { FAKE_GROUP_STATUS } from '../../src/fakeBackend/fixtures/projectsGroups'
import type { FixtureRoutes } from './onFixtures'

/** How the review that spans two repos stands: at work, or stopped for the person. */
export type SharedRunStanding = 'running' | 'stopped'

export const SHARED_RUN_STANDINGS: readonly SharedRunStanding[] = ['running', 'stopped']

/** The project whose runs list shows the review filed under another project. */
export const SHARED_RUN_LISTED_PROJECT_ID = 'thefactory-ui'

const REVIEW = { running: FAKE_REVIEW_RUN, stopped: FAKE_REVIEW_RUN_STOPPED }

const STATUS_PATH = '/api/v1/projects-groups/{id}/status'

const belongs = (projectId: string): boolean =>
  FAKE_REVIEW_RUN.projectId === projectId ||
  (FAKE_REVIEW_RUN.alsoProjectIds ?? []).includes(projectId)

/**
 * An otherwise quiet group whose only run is the review, counted on each of
 * the two projects it belongs to and listed once for the group.
 */
export const sharedRunGroupRoutes = (standing: SharedRunStanding): FixtureRoutes => ({
  [STATUS_PATH]: () => ({
    ...FAKE_GROUP_STATUS,
    members: FAKE_GROUP_STATUS.members.map((member) => ({
      ...member,
      runs: {
        running: standing === 'running' && belongs(member.projectId) ? [FAKE_REVIEW_RUN.id] : [],
        parked: standing === 'stopped' && belongs(member.projectId) ? [FAKE_REVIEW_RUN.id] : [],
      },
      groupRuns: [],
      failingChecks: [],
      openRequests: [],
    })),
  }),
  '/api/v1/process-runs': (_, query) => fakeProcessRunsMatching(query, [REVIEW[standing]]),
})
