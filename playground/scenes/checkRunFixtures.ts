import type {
  CliRun,
  GitDiffSummary,
  RunVerification,
  VerificationCheckResult,
} from '../../src/headless/api/generated'
import { FAKE_CLI_RUN } from '../../src/fakeBackend/fixtures/cliRuns'
import type { FixtureRoutes, SceneStep } from './onFixtures'

/** How far the sign-off's Checks tab has got with running one block again. */
export type CheckRunCase = 'idle' | 'running' | 'merged'

export const CHECK_RUN_CASES: readonly { id: CheckRunCase; label: string; note: string }[] = [
  {
    id: 'idle',
    label: 'Run on every block',
    note: 'Each test layer carries its own Run beside its time: Unit tests failed, Integration tests passed.',
  },
  {
    id: 'running',
    label: 'One block running',
    note: 'Run on Unit tests was pressed: that block spins, the other waits, and the panel says “Running Unit tests”.',
  },
  {
    id: 'merged',
    label: 'Re-run merged',
    note: 'The re-run passed: Unit tests now reads passed with its new time, Integration tests keeps its earlier result, and the headline turns to “Tests passed”.',
  },
]

const AT = Date.UTC(2026, 10, 22, 11, 0)
const BRANCH = 'agent/8a41c2e07d1f'
const BASE_SHA = '3f9c2a1b'
const HEAD_SHA = '7d1e0b44'
const CHANGED = 'src/completion/streamToolCall.ts'

const UNIT_FAILED: VerificationCheckResult = {
  id: 'unit',
  label: 'Unit tests',
  kind: 'tests',
  category: 'test',
  tier: 'unit',
  status: 'failed',
  durationMs: 41_200,
  command: 'npx vitest run src/completion',
  summary: '1 failed, 87 passed',
  testCount: { total: 88, passed: 87, failed: 1, skipped: 0 },
}

const UNIT_PASSED: VerificationCheckResult = {
  ...UNIT_FAILED,
  status: 'passed',
  durationMs: 38_600,
  summary: '88 passed',
  testCount: { total: 88, passed: 88, failed: 0, skipped: 0 },
}

const INTEGRATION: VerificationCheckResult = {
  id: 'integration',
  label: 'Integration tests',
  kind: 'tests',
  category: 'test',
  tier: 'integration',
  status: 'passed',
  durationMs: 72_900,
  command: 'npx vitest run --project integration',
  summary: '24 passed',
  testCount: { total: 24, passed: 24, failed: 0, skipped: 0 },
}

const FIRST_PASS: RunVerification = {
  status: 'failed',
  startedAt: AT - 120_000,
  finishedAt: AT - 5_000,
  checks: [UNIT_FAILED, INTEGRATION],
}

/** What the verify route answers for `checkIds: ['unit']`: the re-run merged into the pass at the same head. */
const MERGED_PASS: RunVerification = {
  ...FIRST_PASS,
  status: 'passed',
  finishedAt: AT + 40_000,
  checks: [UNIT_PASSED, INTEGRATION],
}

const { subscription: _subscription, ...BASE } = FAKE_CLI_RUN

/** A landed run on review: one changed file, its two test layers verified. */
export const CHECK_RUN_RUN: CliRun = {
  ...BASE,
  id: 'cli-run-check-run',
  prompt: 'Close the tool call when the stream ends early.',
  artifacts: [
    {
      id: 'cli-run-check-run-changes',
      kind: 'files-emitted',
      at: AT - 130_000,
      payload: {
        files: [
          { path: CHANGED, status: 'modified', contentAfter: 'export const closeOnEnd = true\n' },
        ],
      },
    },
  ],
  review: { branch: BRANCH, baseSha: BASE_SHA, headSha: HEAD_SHA },
  verification: FIRST_PASS,
}

const DIFF: GitDiffSummary = {
  baseRef: BASE_SHA,
  headRef: HEAD_SHA,
  insertions: 1,
  deletions: 1,
  files: [
    {
      path: CHANGED,
      status: 'M',
      additions: 1,
      deletions: 1,
      patch: `diff --git a/${CHANGED} b/${CHANGED}\n--- a/${CHANGED}\n+++ b/${CHANGED}\n@@ -1 +1 @@\n-export const closeOnEnd = false\n+export const closeOnEnd = true\n`,
    },
  ],
}

const VERIFY = 'POST /api/v1/cli-runs/{runId}/verify'

/**
 * The run, its diff and the verify route as each case answers it. While one
 * block is running the route never answers, so the panel holds that state.
 */
export function checkRunRoutes(which: CheckRunCase): FixtureRoutes {
  return {
    '/api/v1/cli-runs/{runId}': () => CHECK_RUN_RUN,
    'POST /api/v1/projects/{projectId}/git/diff-summary': () => DIFF,
    '/api/v1/projects/{projectId}/review-evidence': () => [],
    [VERIFY]:
      which === 'running'
        ? () => new Promise<never>(() => {})
        : (_params, _query, body) =>
            (body as { checkIds?: string[] } | undefined)?.checkIds ? MERGED_PASS : FIRST_PASS,
  }
}

/** What the person does for each case: press Run on the Unit tests block, or nothing. */
export function checkRunSteps(which: CheckRunCase): readonly SceneStep[] {
  return which === 'idle' ? [] : [{ press: 'Run Unit tests' }]
}

export function checkRunCase(id: string | null | undefined): CheckRunCase {
  return CHECK_RUN_CASES.find((c) => c.id === id)?.id ?? 'idle'
}
