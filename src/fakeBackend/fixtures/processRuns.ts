import type { ProcessRun } from 'thefactory-tools/types'
import type { ProcessDefinition } from '../../headless/api/generated/types.gen'
import { UI_REQUEST } from './featureRequests'
import { FAKE_GROUP_ID, FAKE_PROJECT_ID } from './projects'
import { STORY } from './stories'

export const STORY_RUN = {
  id: 'run-story',
  projectId: 'p1',
  title: 'Let unit tests watch their files',
  status: 'running',
  loopCounts: {},
  ledger: [
    { id: 'plan-1', stepId: 'plan', iteration: 1, status: 'done', outcome: 'passed', startedAt: 0 },
  ],
  startedAt: 0,
  updatedAt: 0,
  plan: {
    definitionId: 'story',
    definitionScope: 'global',
    definitionVersion: 1,
    name: 'Story',
    steps: [
      { id: 'plan', name: 'Plan', kind: 'agent', agentType: 'planner' },
      { id: 'features', name: 'Features', kind: 'agent', agentType: 'developer' },
      { id: 'checks', name: 'Checks', kind: 'check' },
      { id: 'code-review', name: 'Code review', kind: 'judge' },
      { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
    ],
    loops: [],
    frozenAt: 0,
  },
} satisfies ProcessRun

export const FEATURE_RUN = {
  id: 'run-feature',
  projectId: 'p1',
  parentRunId: 'run-story',
  parentStepId: 'features',
  title: 'Watch mode for the test runner',
  status: 'parked',
  park: { reason: 'step-failed', stepId: 'verify', message: 'Verify failed.', parkedAt: 0 },
  loopCounts: {},
  ledger: [
    {
      id: 'impl-1',
      stepId: 'implement',
      iteration: 1,
      status: 'done',
      outcome: 'passed',
      startedAt: 0,
    },
    {
      id: 'verify-1',
      stepId: 'verify',
      iteration: 1,
      status: 'done',
      outcome: 'failed',
      startedAt: 0,
    },
  ],
  startedAt: 0,
  updatedAt: 0,
  plan: {
    definitionId: 'feature',
    definitionScope: 'global',
    definitionVersion: 1,
    name: 'Feature',
    steps: [
      { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
      { id: 'verify', name: 'Verify', kind: 'agent', agentType: 'verifier' },
    ],
    loops: [],
    frozenAt: 0,
  },
} satisfies ProcessRun

/** A root run on another member of the group, finished or still going. */
const memberRun = (
  id: string,
  projectId: string,
  title: string,
  status: ProcessRun['status'],
  storyId: string,
): ProcessRun => ({ ...STORY_RUN, id, projectId, title, status, storyId })

/**
 * A review of one ticket whose change spans two repos: filed under the backend,
 * it also belongs to the UI project and to the group both are in.
 */
export const FAKE_REVIEW_RUN: ProcessRun = {
  ...STORY_RUN,
  id: 'run-review-ticket',
  projectId: 'thefactory-backend',
  groupId: FAKE_GROUP_ID,
  alsoProjectIds: ['thefactory-ui'],
  ticketReview: { groupId: FAKE_GROUP_ID, ticketKey: 'OVR-212', round: 1 },
  title: 'Review of OVR-212, round 1',
  ledger: [],
  plan: {
    ...STORY_RUN.plan,
    definitionId: 'colleague-review',
    name: 'Colleague review',
    steps: [
      { id: 'review', name: 'Review', kind: 'agent', agentType: 'reviewer' },
      { id: 'reply', name: 'Reply', kind: 'gate' },
    ],
  },
}

/** The same review stopped for the person. */
export const FAKE_REVIEW_RUN_STOPPED: ProcessRun = {
  ...FAKE_REVIEW_RUN,
  status: 'parked',
  park: { reason: 'step-failed', stepId: 'review', message: 'Review failed.', parkedAt: 0 },
}

export const FAKE_PROCESS_RUNS: ProcessRun[] = [
  { ...STORY_RUN, projectId: FAKE_PROJECT_ID, storyId: STORY.id },
  { ...FEATURE_RUN, projectId: FAKE_PROJECT_ID, storyId: STORY.id, featureId: 'f2' },
  memberRun(
    'run-ui-request',
    'thefactory-ui',
    UI_REQUEST.title,
    'running',
    UI_REQUEST.handling.storyId,
  ),
  {
    ...memberRun(
      'run-web-parked',
      'thefactory-overseer-web',
      'Sign-in redirect',
      'parked',
      's-web',
    ),
    park: { reason: 'step-failed', stepId: 'checks', message: 'Checks failed.', parkedAt: 0 },
  },
  {
    ...memberRun(
      'run-mobile-sign-off',
      'thefactory-overseer-mobile',
      'Android story',
      'parked',
      's-mobile',
    ),
    park: { reason: 'gate', stepId: 'sign-off', message: 'Sign off.', parkedAt: 0 },
  },
  memberRun(
    'run-mobile-unmerged',
    'thefactory-overseer-mobile',
    'Push navigation for runs',
    'succeeded',
    's-mobile',
  ),
  memberRun('run-web-abandoned', 'thefactory-overseer-web', 'Old sidebar', 'cancelled', 's-web'),
  FAKE_REVIEW_RUN,
]

/** How a run was left, as the list route works it out from the record. */
export const FAKE_RUN_ENDINGS: Readonly<Record<string, 'unmerged' | 'abandoned'>> = {
  'run-mobile-unmerged': 'unmerged',
  'run-web-abandoned': 'abandoned',
}

/**
 * The runs a list read asks for, as the route filters them. A run belongs to
 * its home project and to its further projects; `groupId` narrows to a group's
 * runs, and `orGroupId` adds them to what the project filters match.
 */
export function fakeProcessRunsMatching(
  query: URLSearchParams,
  runs: readonly ProcessRun[] = FAKE_PROCESS_RUNS,
): ProcessRun[] {
  const projectIds = [...query.getAll('projectIds'), ...query.getAll('projectId')]
  const groupId = query.get('groupId')
  const orGroupId = query.get('orGroupId')
  const storyId = query.get('storyId')
  const status = query.get('status')
  const ending = query.get('ending')
  const inProjects = (run: ProcessRun) =>
    projectIds.length === 0 ||
    projectIds.some((id) => run.projectId === id || (run.alsoProjectIds ?? []).includes(id))
  return runs.filter(
    (run) =>
      ((inProjects(run) && (!groupId || run.groupId === groupId)) ||
        (orGroupId !== null && run.groupId === orGroupId)) &&
      (!storyId || run.storyId === storyId) &&
      (!status || run.status === status) &&
      (!ending || FAKE_RUN_ENDINGS[run.id] === ending) &&
      (query.get('rootOnly') !== 'true' || !run.parentRunId),
  )
}

export const FAKE_PROCESSES: ProcessDefinition[] = [STORY_RUN, FEATURE_RUN].map(({ plan }) => ({
  id: plan.definitionId,
  name: plan.name,
  steps: plan.steps,
  loops: plan.loops,
  version: plan.definitionVersion,
  updatedAt: 0,
  scope: plan.definitionScope,
}))

/** How the fake project's story process has done over its ended runs. */
export const FAKE_PROCESS_RUN_STATISTICS = [
  {
    definitionId: 'story',
    definitionVersion: 1,
    runCount: 12,
    firstPassRate: 0.58,
    medianIterations: 2,
    medianCostUsd: 1.5,
    costSampleCount: 12,
  },
  {
    definitionId: 'story',
    definitionVersion: 0,
    runCount: 4,
    firstPassRate: 0.25,
    medianIterations: 3,
    costSampleCount: 0,
  },
]
