import type { ProcessLedgerEntry, ProcessRun, ProcessSpendStop } from 'thefactory-tools/types'

import { FAKE_PROJECT_ID } from './projects'

/** The run a spend-limit stop is shown on. */
export const FAKE_SPEND_LIMIT_RUN_ID = 'run-spend-limit'

/** Which limit the step reached: its own, or the run's whole budget. */
export type FakeSpendLimitState = 'step' | 'run'

const PARKED_AT = Date.parse('2026-11-12T09:40:00Z')

const STOPS: Record<FakeSpendLimitState, ProcessSpendStop> = {
  step: { cap: 'step', capUsd: 2, attemptUsd: 2.31 },
  run: { cap: 'run', capUsd: 10, attemptUsd: 3.4, runUsd: 10.12 },
}

const BUDGETS: Record<FakeSpendLimitState, ProcessRun['budget']> = {
  step: { stepSpendUsdCap: 2 },
  run: { spendUsdCap: 10, stepSpendUsdCap: 5 },
}

const SUMMARIES: Record<FakeSpendLimitState, string> = {
  step: 'Its agent reached the $2.00 spend limit for one step before it finished: this attempt spent $2.31.',
  run: 'Its agent reached the run’s $10.00 spend limit before it finished: the run has spent $10.12, $3.40 of it on this attempt.',
}

const PARK_MESSAGES: Record<FakeSpendLimitState, string> = {
  step: 'Final review reached the $2.00 spend limit for one step before it finished — it spent $2.31.',
  run: 'Final review reached the run’s $10.00 spend limit before it finished — the run has spent $10.12.',
}

const done = (over: Partial<ProcessLedgerEntry>): ProcessLedgerEntry => ({
  id: 'e',
  stepId: 'implement',
  iteration: 1,
  status: 'done',
  outcome: 'passed',
  startedAt: PARKED_AT - 3_600_000,
  endedAt: PARKED_AT - 1_800_000,
  model: { runner: 'cli', cli: 'claude-code' },
  ...over,
})

/**
 * A story's run stopped on its final review, which reached a spend limit
 * part-way through: the step's own (`step`) or the run's whole budget (`run`).
 */
export function fakeSpendLimitRun(state: FakeSpendLimitState): ProcessRun {
  const stop = STOPS[state]
  const budget = BUDGETS[state]
  return {
    id: FAKE_SPEND_LIMIT_RUN_ID,
    projectId: FAKE_PROJECT_ID,
    storyId: 's7',
    title: 'Compass: web user sign-off',
    input: { runner: 'cli', cliTool: 'claude-code' },
    status: 'parked',
    loopCounts: {},
    startedAt: PARKED_AT - 7_200_000,
    updatedAt: PARKED_AT,
    turnLimit: { limitTurns: true, maxTurns: 50 },
    ...(budget ? { budget } : {}),
    spentUsd: state === 'run' ? 6.72 : 4.1,
    plan: {
      definitionId: 'story-default',
      definitionScope: 'global',
      definitionVersion: 4,
      name: 'Story',
      frozenAt: 0,
      steps: [
        { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
        { id: 'final-review', name: 'Final review', kind: 'judge', agentType: 'code-reviewer' },
        { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
      ],
      loops: [],
    },
    ledger: [
      done({
        id: 'impl-1',
        ...(budget?.stepSpendUsdCap ? { stepSpendUsdCap: budget.stepSpendUsdCap } : {}),
      }),
      done({
        id: 'review-1',
        stepId: 'final-review',
        outcome: 'failed',
        endedAt: PARKED_AT,
        agentStop: 'spend-limit',
        spendStop: stop,
        summary: SUMMARIES[state],
        turnLimit: { limitTurns: true, maxTurns: 50 },
        ...(budget?.stepSpendUsdCap ? { stepSpendUsdCap: budget.stepSpendUsdCap } : {}),
        runRef: { runId: 'cli-review-1', agentRunId: 'agent-review-1', runner: 'cli' },
        cost: { costUsd: stop.attemptUsd },
      }),
    ],
    park: {
      reason: 'spend-limit',
      stepId: 'final-review',
      message: PARK_MESSAGES[state],
      parkedAt: PARKED_AT,
    },
  }
}
