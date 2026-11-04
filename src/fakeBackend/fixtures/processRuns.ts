import type { ProcessDefinition, ProcessRun } from '../../headless/api/generated/types.gen'
import { FAKE_PROJECT_ID } from './projects'
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

export const FAKE_PROCESS_RUNS: ProcessRun[] = [
  { ...STORY_RUN, projectId: FAKE_PROJECT_ID, storyId: STORY.id },
  { ...FEATURE_RUN, projectId: FAKE_PROJECT_ID, storyId: STORY.id, featureId: 'f2' },
]

export const FAKE_PROCESSES: ProcessDefinition[] = [STORY_RUN, FEATURE_RUN].map(({ plan }) => ({
  id: plan.definitionId,
  name: plan.name,
  steps: plan.steps,
  loops: plan.loops,
  version: plan.definitionVersion,
  updatedAt: 0,
  scope: plan.definitionScope,
}))
