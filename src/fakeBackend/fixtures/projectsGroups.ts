import type {
  GetProjectsGroupConstellationResponse,
  GetProjectsGroupStatusResponse,
} from '../../headless/api/generated/types.gen'
import { BACKEND_REQUEST, UI_REQUEST } from './featureRequests'
import { FAKE_GROUP_ID, MEMBERS } from './projects'
import { FAKE_AT } from './stamps'

type MemberStatus = GetProjectsGroupStatusResponse['members'][number]
type Dependency = GetProjectsGroupConstellationResponse['dependencies'][number]

const NONE = { pending: 0, in_progress: 0, reviewable: 0, done: 0, blocked: 0, deferred: 0 }

/** When the fixture's roll-up was read: the moment its "x minutes ago" counts from. */
export const FAKE_GROUP_STATUS_AT = '2026-10-25T12:00:00.000Z'

const GROUP_RUN = {
  id: 'group-run-oversight',
  title: 'Android story and its iOS follow-up',
  status: 'running',
  updatedAt: FAKE_AT,
} as const

const member = (projectId: string, over: Partial<MemberStatus> = {}): MemberStatus => ({
  projectId,
  runs: { running: [], parked: [] },
  groupRuns: [],
  storyProgress: { stories: NONE, features: NONE },
  failingChecks: [],
  git: { available: true, branch: 'main' },
  openRequests: [],
  ...over,
})

/** The group with a member in each state a home has to draw. */
export const FAKE_GROUP_STATUS: GetProjectsGroupStatusResponse = {
  groupId: FAKE_GROUP_ID,
  generatedAt: FAKE_GROUP_STATUS_AT,
  members: [
    member('thefactory-tools', {
      runs: { running: ['run-story'], parked: ['run-feature'] },
      groupRuns: [GROUP_RUN],
      storyProgress: {
        stories: { ...NONE, done: 1, in_progress: 1, pending: 1 },
        features: { ...NONE, done: 2, in_progress: 1, pending: 1 },
      },
      git: { available: true, branch: 'main', ahead: 2 },
      lastActivity: { at: '2026-10-25T11:56:00.000Z', kind: 'run', id: 'run-story' },
    }),
    member('thefactory-backend', {
      storyProgress: {
        stories: { ...NONE, done: 4, blocked: 1 },
        features: { ...NONE, done: 14, blocked: 3, deferred: 2 },
      },
      failingChecks: [
        {
          kind: 'lint',
          status: 'failed',
          summary: '3 lint errors in src/routes',
          ranAt: '2026-10-25T10:40:00.000Z',
        },
        {
          kind: 'test',
          status: 'error',
          summary: 'The suite did not finish.',
          ranAt: '2026-10-25T10:42:00.000Z',
        },
      ],
      git: { available: true, branch: 'main', ahead: 1, behind: 4 },
      openRequests: [
        {
          id: BACKEND_REQUEST.id,
          title: BACKEND_REQUEST.title,
          status: 'pending',
          updatedAt: BACKEND_REQUEST.updatedAt,
        },
      ],
      lastActivity: { at: '2026-10-25T10:42:00.000Z', kind: 'check', id: 'lint' },
    }),
    member('thefactory-ui', {
      runs: { running: ['run-ui-request'], parked: [] },
      groupRuns: [GROUP_RUN],
      storyProgress: {
        stories: { ...NONE, done: 9, in_progress: 2, pending: 4 },
        features: { ...NONE, done: 41, in_progress: 3, reviewable: 2, pending: 9 },
      },
      openRequests: [
        {
          id: UI_REQUEST.id,
          title: UI_REQUEST.title,
          status: 'in_progress',
          updatedAt: UI_REQUEST.updatedAt,
        },
      ],
      lastActivity: { at: '2026-10-25T11:58:00.000Z', kind: 'run', id: 'run-ui-request' },
    }),
    member('thefactory-overseer-web', {
      runs: { running: [], parked: ['run-web-parked'] },
      storyProgress: {
        stories: { ...NONE, done: 6 },
        features: { ...NONE, done: 22 },
      },
      lastActivity: { at: '2026-10-25T06:00:00.000Z', kind: 'story', id: 's-web' },
    }),
    member('overseer-local', {
      git: { available: false },
    }),
    member('thefactory-overseer-mobile', {
      runs: { running: [], parked: ['run-mobile-sign-off'] },
      storyProgress: {
        stories: { ...NONE, done: 3, pending: 2 },
        features: { ...NONE, done: 8, pending: 7 },
      },
      git: { available: true, branch: 'factory/push-nav', behind: 12 },
      lastActivity: { at: '2026-10-25T09:00:00.000Z', kind: 'activity', id: 'act-1' },
    }),
  ],
}

const SYSTEM_LEVEL = { level: 4, name: 'System', items: [] }

const edge = (
  sourceProjectId: string,
  targetProjectId: string,
  mechanism: string,
  importCount?: number,
): Dependency => ({
  sourceProjectId,
  targetProjectId,
  mechanism,
  ...(importCount !== undefined ? { importCount } : {}),
})

/** The group's dependency map: three layers, a dev-only edge, no checkout, no map yet. */
export const FAKE_GROUP_CONSTELLATION: GetProjectsGroupConstellationResponse = {
  groupId: FAKE_GROUP_ID,
  title: 'Overseer',
  projects: MEMBERS.map(({ id }) => ({
    projectId: id,
    projectRoot: id === 'overseer-local' ? '' : `/fake/projects/${id}`,
    systemLevel:
      id === 'overseer-local' || id === 'thefactory-overseer-mobile' ? null : SYSTEM_LEVEL,
  })),
  dependencies: [
    edge('thefactory-backend', 'thefactory-tools', 'file:'),
    edge('thefactory-ui', 'thefactory-tools', 'import', 412),
    edge('thefactory-ui', 'thefactory-backend', 'devDependency'),
    edge('thefactory-overseer-web', 'thefactory-ui', 'import', 96),
    edge('overseer-local', 'thefactory-ui', 'dependency'),
    edge('thefactory-overseer-mobile', 'thefactory-ui', 'file:'),
  ],
}
