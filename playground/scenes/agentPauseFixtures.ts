import type { ProcessRun } from 'thefactory-tools/types'
import type { ProcessAgentPause, ProcessRunWithPause } from 'thefactory-ui/headless'
import { FAKE_PROJECT_ID } from '../../src/fakeBackend/fixtures/projects'
import type { FixtureRoutes } from './onFixtures'

export const PAUSED_RUN_ID = 'run-hot-seat'

/** When the agent picked up again by itself — the run's last change, 14:09 local. */
export const PAUSE_BACK_AT = new Date(2026, 10, 20, 14, 9).getTime()

/** The states a paused step is shown in. */
export type AgentPauseCase =
  | 'can-resume'
  | 'cannot-resume'
  | 'resuming'
  | 'cleared'
  | 'stop-confirm'

const STEPS = [
  { id: 'plan', name: 'Plan', kind: 'agent', agentType: 'planner' },
  { id: 'write-tests', name: 'Write tests', kind: 'agent', agentType: 'tester' },
  { id: 'build', name: 'Build', kind: 'agent', agentType: 'developer' },
  { id: 'check-build', name: 'Check build', kind: 'agent', agentType: 'verifier' },
  { id: 'code-review', name: 'Code review', kind: 'agent', agentType: 'reviewer' },
  { id: 'walkthrough', name: 'Walkthrough', kind: 'agent', agentType: 'verifier' },
  { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
]

const SPENT: Record<string, { workMs: number; costUsd: number }> = {
  plan: { workMs: 130_000, costUsd: 0.12 },
  'write-tests': { workMs: 400_000, costUsd: 0.48 },
  build: { workMs: 725_000, costUsd: 0.84 },
}

/** Where a step's time went: all of it working, nothing waited. */
const stepTime = (workMs: number) => ({
  thinkingMs: workMs * 0.6,
  toolMs: workMs * 0.4,
  systemMs: 0,
  otherMs: 0,
  runningMs: workMs,
  waitingMs: 0,
  tools: [],
})

const ASLEEP: ProcessAgentPause = {
  stepId: 'build',
  entryId: 'build-1',
  runner: 'cli',
  cause: 'asleep',
  reason: 'The computer went to sleep during Build.',
  since: 1,
  canResume: true,
  actions: ['resume', 'retry', 'stop'],
}

const LOST: ProcessAgentPause = {
  ...ASLEEP,
  cause: 'host-lost',
  reason: 'The agent stopped answering during Build.',
  canResume: false,
  actions: ['retry', 'stop'],
}

/** A story run building hot-seat play: two steps done, Build's agent paused or back at work. */
export function pausedRun(
  pause: ProcessAgentPause | undefined,
  buildLine?: string,
): ProcessRunWithPause {
  const totals = Object.values(SPENT)
  return {
    id: PAUSED_RUN_ID,
    projectId: FAKE_PROJECT_ID,
    title: 'Hot-seat play',
    status: 'running',
    loopCounts: {},
    startedAt: 0,
    updatedAt: pause ? 0 : PAUSE_BACK_AT,
    cursor: { stepId: 'build' },
    totals: {
      workMs: totals.reduce((sum, one) => sum + one.workMs, 0),
      time: stepTime(totals.reduce((sum, one) => sum + one.workMs, 0)),
      at: 0,
      ticking: false,
      billedUsd: totals.reduce((sum, one) => sum + one.costUsd, 0),
      costUsd: totals.reduce((sum, one) => sum + one.costUsd, 0),
      steps: Object.fromEntries(
        Object.entries(SPENT).map(([id, one]) => [
          id,
          { ...one, billedUsd: one.costUsd, time: stepTime(one.workMs) },
        ]),
      ),
    },
    ledger: [
      {
        id: 'plan-1',
        stepId: 'plan',
        iteration: 1,
        startedAt: 1,
        endedAt: 2,
        status: 'done',
        outcome: 'passed',
        summary: '3 features, 7 checks',
      },
      {
        id: 'write-tests-1',
        stepId: 'write-tests',
        iteration: 1,
        startedAt: 2,
        endedAt: 3,
        status: 'done',
        outcome: 'passed',
        summary: '14 tests, failing as expected',
      },
      {
        id: 'build-1',
        stepId: 'build',
        iteration: 1,
        startedAt: 3,
        status: 'running',
        ...(buildLine ? { summary: buildLine } : {}),
      },
    ],
    plan: {
      definitionId: 'story-run',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'Story run',
      steps: STEPS,
      loops: [],
      frozenAt: 0,
    },
    ...(pause ? { agentPause: pause } : {}),
  } as unknown as ProcessRun & { agentPause?: ProcessAgentPause }
}

/** The run each state opens on: paused while the person decides, paused before it clears. */
export function pauseCaseRun(which: AgentPauseCase): ProcessRunWithPause {
  return pausedRun(which === 'cannot-resume' ? LOST : ASLEEP)
}

/** The run once the agent is back, as the server pushes it. */
export const BACK_RUN = pausedRun(undefined, 'Writing the result screen’s points')

/** The reads the run's page makes, and its pause actions — left unanswered, so the action stays on its way. */
export const AGENT_PAUSE_ROUTES: FixtureRoutes = {
  '/api/v1/process-runs/{runId}': () => pauseCaseRun('can-resume'),
  '/api/v1/process-runs/{runId}/evidence': () => ({ groups: [] }),
  '/api/v1/process-runs/{runId}/ticket-post': () => ({ tickets: [] }),
  '/api/v1/process-runs/{runId}/diagnostics': () => ({}),
  '/api/v1/process-runs/{runId}/cleanup': () => ({ items: [], off: false }),
  'POST /api/v1/process-runs/{runId}/agent-pause/resume': () => new Promise(() => {}),
  'POST /api/v1/process-runs/{runId}/agent-pause/retry': () => new Promise(() => {}),
  'POST /api/v1/process-runs/{runId}/agent-pause/stop': () => new Promise(() => {}),
}

/** The routes for one state: its run, read as the page opens. */
export function agentPauseRoutes(which: AgentPauseCase): FixtureRoutes {
  return { ...AGENT_PAUSE_ROUTES, '/api/v1/process-runs/{runId}': () => pauseCaseRun(which) }
}
