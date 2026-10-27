import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import type { ProcessLedgerEntry, ProcessRun } from 'thefactory-tools/types'
import type { ProcessAlreadyMergedAction } from 'thefactory-ui/headless'
// Not on the package's public surface: the pipeline draws its stop itself. The showcase reaches
// into the source for it, as the playground renders the library from source.
import CloseUnmergedConfirm from '../../src/web/compound/process/CloseUnmergedConfirm'
import { ParkBlock } from '../../src/web/compound/process/ProcessPipeline'
import type { Scene } from '../showcase/types'

const noop = () => {}
const resolved = async () => {}

const TIP = 'eed65867fafd5db86d293c9d41496af1f75de980'

const CONFLICT = {
  baseRef: 'dev',
  baseSha: '395109fb832a929a2f5236d279477c6f93c59f01',
  commits: 16,
  paths: [
    'src/cliAgentRunner/cliAgentRunnerConstants.ts',
    'src/cliAgentRunner/cliAgentRunnerHelpers.ts',
    'src/completion/providers/completionProviderHelpers.ts',
    'src/tools/generated/ToolSchemas.ts',
  ],
  workSha: TIP,
}

const STALL_MESSAGE =
  'The fixer changed nothing and the same checks still fail at eed6586: Unit tests: src/cliAgentRunner/cliAgentRunnerHelpers.test.ts › mergeCliRunOntoBranch — stacked on a work branch > commits only the run’s own change on the tip (and 23 more).'

/** A fixer attempt after the checks failed; every one but the last was tried again. */
const fixer = (iteration: number, retried: boolean): ProcessLedgerEntry => ({
  id: `fix-${iteration}`,
  stepId: 'resolve-conflict~2',
  iteration,
  status: 'done',
  outcome: 'failed',
  startedAt: iteration,
  runRef: { runId: `cli-${iteration}`, agentRunId: `agent-${iteration}`, runner: 'cli' },
  ...(iteration === 2 ? { viaLoopId: 'conflict-fix~2' } : {}),
  ...(retried ? { override: { choice: 'retry', at: iteration, decidedBy: 'person' } } : {}),
})

/** Run ed34ace8: approved, its merge conflicted twice, its fixer retried on the same failure. */
function stuckRun(over: Partial<ProcessRun> = {}): ProcessRun {
  return {
    id: 'ed34ace8-4e0e-482d-93c5-e340fcfeefbd',
    projectId: 'thefactory-tools',
    storyId: '9aec9d1c-9bcf-4678-b7f1-160cde330836',
    title: 'Provenance-aware LLM usage accounting with daily summaries',
    input: { runner: 'cli' },
    status: 'parked',
    loopCounts: { 'conflict-fix~2': 1 },
    startedAt: 0,
    updatedAt: 0,
    workBranch: {
      name: 'factory/provenance-aware-llm-usage-accounting-with-daily-ed34ace8',
      baseRef: 'dev',
      baseSha: '0d74fe6550dcb9b75a67fd588bde0912def03596',
    },
    workBranchTip: TIP,
    plan: {
      definitionId: 'story-default',
      definitionScope: 'global',
      definitionVersion: 4,
      name: 'Story',
      frozenAt: 0,
      steps: [
        { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
        { id: 'resolve-conflict~2', name: 'Resolve conflict', kind: 'agent', agentType: 'fixer' },
        { id: 'conflict-checks~2', name: 'Checks', kind: 'check' },
        { id: 'confirm-landing~2', name: 'Confirm the merge', kind: 'gate' },
      ],
      loops: [
        {
          id: 'conflict-fix~2',
          from: 'conflict-checks~2',
          to: 'resolve-conflict~2',
          when: ['failed'],
          maxIterations: 3,
        },
      ],
    },
    ledger: [
      {
        id: 'sign-off-1',
        stepId: 'sign-off',
        iteration: 1,
        status: 'done',
        outcome: 'passed',
        startedAt: 0,
        override: { choice: 'approve', at: 0 },
      },
      {
        id: 'checks-1',
        stepId: 'conflict-checks~2',
        iteration: 1,
        status: 'done',
        outcome: 'failed',
        startedAt: 1,
        checkedSha: TIP,
      },
      fixer(2, true),
      fixer(3, true),
      fixer(4, false),
    ],
    park: {
      reason: 'step-failed',
      stepId: 'resolve-conflict~2',
      message: STALL_MESSAGE,
      parkedAt: 5,
    },
    ...over,
  }
}

const CONFLICTED = stuckRun({
  park: {
    reason: 'step-failed',
    stepId: 'resolve-conflict~2',
    message:
      'Bringing in dev (16 new commits) conflicts in src/cliAgentRunner/cliAgentRunnerConstants.ts, src/cliAgentRunner/cliAgentRunnerHelpers.ts, src/completion/providers/completionProviderHelpers.ts, src/tools/generated/ToolSchemas.ts — nothing was changed.',
    parkedAt: 5,
    baseConflict: CONFLICT,
  },
})

const MOVED = stuckRun({ workBranchTip: 'f3c1a9d0e4b2c7a85d6e1f09b3a4c2d1e0f9a8b7' })

const ALREADY_MERGED: ProcessAlreadyMergedAction = {
  offer: {
    text: 'Nothing to merge — this work was already on dev (since 7d41c2e “Provenance-aware LLM usage accounting”).',
    sha: '7d41c2e0a1b2c3d4e5f60718293a4b5c6d7e8f90',
    features: [],
    label: 'Finish as already merged',
    detail:
      'Nothing is merged: its features are marked done, the work branch factory/provenance-aware-llm-usage-accounting-with-daily-ed34ace8 is removed and the run moves to History.',
  },
  busy: false,
  error: null,
  onSettle: noop,
}

const frame = (node: ReactNode) => (
  <MemoryRouter>
    <div className="max-w-[720px] p-4">{node}</div>
  </MemoryRouter>
)

const park = (run: ProcessRun, alreadyMerged?: ProcessAlreadyMergedAction) =>
  frame(
    <ParkBlock
      run={run}
      managerLine={undefined}
      {...(alreadyMerged ? { alreadyMerged } : {})}
      onChoose={noop}
      onChangeProof={noop}
      onAnswerRequest={noop}
      onDelegate={resolved}
      onDrill={noop}
    />,
  )

export const PARK_CLOSING_SCENES: Scene[] = [
  {
    id: 'park-closing',
    title: 'Ways out of a stuck stop',
    component: 'ParkBlock (ProcessPipeline) · CloseUnmergedConfirm',
    group: 'Process',
    description:
      'A stop the checks keep sending back on unchanged code, or that bringing the base in conflicted on (run ed34ace8): the conflict goes to an agent, the checks can run again as they are, a run whose base already holds its work can be finished as merged, and any story run can be closed without merging — its branch kept, its features as they are.',
    states: [
      {
        id: 'conflict-behind-checks',
        title: 'A conflict at the fixer behind the checks',
        description:
          'Bringing dev in conflicted at the fixer the checks sent the work to. “Have an agent resolve it” leads: the fixer gets the conflict, not the old checks failure.',
        render: () => park(CONFLICTED),
      },
      {
        id: 'checks-again-leads',
        title: 'The fixer was retried on the same failure',
        description:
          'Two tries changed nothing on eed6586. “Run the checks again” leads; “Try again” says why it won’t help. Accepting would run the same checks, so it is left out.',
        render: () => park(stuckRun()),
      },
      {
        id: 'accept-runs-checks',
        title: 'The branch moved since the checks failed',
        description:
          '“Try again” runs the checks first, and accepting says the checks run next. No “Run the checks again” — the code is no longer what they failed on.',
        render: () => park(MOVED),
      },
      {
        id: 'already-merged-at-stop',
        title: 'Its base already holds the work',
        description:
          'Offered at any stop of a story’s run once git reads the work branch as already on its base — not only after approval. (The features it makes done are listed above the detail, as after approval; this sample has none, since the showcase draws no story.)',
        render: () => park(stuckRun(), ALREADY_MERGED),
      },
      {
        id: 'close-confirm',
        title: 'Close without merging — confirm',
        description:
          'Closing ends the run and keeps its branch; its features keep their statuses. Asked first, and the run can be resumed.',
        overlay: true,
        render: () => <CloseUnmergedConfirm onConfirm={noop} onCancel={noop} />,
      },
    ],
  },
]
