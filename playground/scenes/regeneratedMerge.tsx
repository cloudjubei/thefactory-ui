import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import type { ProcessLedgerEntry, ProcessRun, ProcessStepState } from 'thefactory-tools/types'
import { ApiProvider, AuthProvider } from 'thefactory-ui/headless'
// Not on the package's public surface: the run page draws its merge result and sign-off record
// itself. The showcase reaches into the source for them.
import IntegrationResult from '../../src/web/compound/process/IntegrationResult'
import SignoffRecord from '../../src/web/compound/process/pipeline/SignoffRecord'
import type { Scene } from '../showcase/types'

const noop = () => {}
const notRetried = async () => false

const MERGE_SHA = '8e1f5eb7bc950dc1c66e3437450697f7360e0753'

const SIGN_OFF: ProcessLedgerEntry = {
  id: 'sign-off-1',
  stepId: 'sign-off',
  iteration: 1,
  status: 'done',
  outcome: 'passed',
  startedAt: 0,
  override: { choice: 'approve', at: 1_760_000_000_000, integration: 'merge', decidedBy: 'person' },
}

/** Run 6c6248e5's story, approved once: its merge re-conflicted only on the generated tool schemas. */
const RUN: ProcessRun = {
  id: '6c6248e5-1f0e-4d6a-9d5b-6a1e2f3c4b5a',
  projectId: 'thefactory-tools',
  title: 'Restore safe cross-project read-only inspection for process agents',
  status: 'succeeded',
  loopCounts: {},
  startedAt: 0,
  updatedAt: 0,
  ledger: [SIGN_OFF],
  plan: {
    definitionId: 'story-default',
    definitionScope: 'global',
    definitionVersion: 1,
    name: 'Story',
    steps: [{ id: 'sign-off', name: 'Sign-off', kind: 'gate' }],
    loops: [],
    frozenAt: 0,
  },
  workBranch: {
    name: 'factory/restore-safe-cross-project-read-only-6c6248e5',
    baseRef: 'dev',
    baseSha: 'ca735e88004dc486ff6828f865ab7f5958af7a82',
  },
  integration: {
    mode: 'merge',
    status: 'integrated',
    sha: MERGE_SHA,
    regenerated: ['src/tools/generated/ToolSchemas.ts'],
    checks: {
      status: 'passed',
      summary: 'Build ✓ · Type check ✓',
      sha: MERGE_SHA,
      checks: [],
    },
    at: 1_760_000_100_000,
  },
}

const SIGN_OFF_STATE = {
  step: RUN.plan.steps[0],
  status: 'done',
  outcome: 'passed',
  attempts: 1,
  latest: SIGN_OFF,
  entries: [SIGN_OFF],
  current: false,
  requeued: false,
} as unknown as ProcessStepState

const NO_TOKEN = { read: () => null, write: () => {} }

/** Signed out with no backend: the merge result reads nothing, so it draws what the run holds. */
function frame(children: ReactNode): ReactNode {
  return (
    <AuthProvider storage={NO_TOKEN}>
      <ApiProvider apiBaseUrl={null} wsBaseUrl={null} client="web">
        <MemoryRouter>
          <div className="w-[560px] bg-(--surface-base) py-3">{children}</div>
        </MemoryRouter>
      </ApiProvider>
    </AuthProvider>
  )
}

export const REGENERATED_MERGE_SCENES: Scene[] = [
  {
    id: 'regenerated-merge',
    title: 'Merged after regenerating',
    component: 'IntegrationResult, SignoffRecord',
    group: 'Process',
    description:
      'An approved story whose merge re-conflicted only on generated files: they were rebuilt from the merged code, its build and type check passed, and it merged with no second “Confirm the merge”. The run and its sign-off record say which files and where the checks passed.',
    states: [
      {
        id: 'merge-result',
        title: 'On the run',
        description:
          'The merge result names the regenerated file and the commit the checks passed at.',
        render: () =>
          frame(<IntegrationResult run={RUN} onRetry={notRetried} onResolve={notRetried} />),
      },
      {
        id: 'signoff-record',
        title: 'In the sign-off record',
        description: 'The approval the work came in by carries the same line.',
        render: () => frame(<SignoffRecord run={RUN} state={SIGN_OFF_STATE} onOpen={noop} />),
      },
    ],
  },
]
