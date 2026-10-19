import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import type {
  ProcessCircling,
  ProcessLedgerEntry,
  ProcessManagerBriefCard,
  ProcessManagerEscalation,
  ProcessManagerEscalationCard,
  ProcessRun,
} from 'thefactory-tools/types'
import { processRunParkChoices } from 'thefactory-tools/utils'
import { processCirclingView, type ProcessCirclingView } from 'thefactory-ui/headless'
// Not on the package's public surface: the pipeline draws its stop and its rows itself. The
// showcase reaches into the source for them, as the playground renders the library from source.
import {
  ManagerBriefCardView,
  ManagerEscalationCardView,
} from '../../src/web/compound/chat/ManagerCards'
import { CirclingChip } from '../../src/web/compound/process/CirclingNotice'
import { ParkBlock } from '../../src/web/compound/process/ProcessPipeline'
import type { Scene } from '../showcase/types'

const noop = () => {}
const resolved = async () => {}
const PARKED_AT = Date.parse('2026-10-18T09:40:00Z')
const LIMIT_50 = { limitTurns: true, maxTurns: 50 }
const LIMIT_100 = { limitTurns: true, maxTurns: 100 }

const FIRST: ProcessCircling = {
  summary: 'Going in circles: ran out of turns (50 of 50); changed nothing.',
  signals: ['no-change'],
  ranOut: true,
  turnsUsed: 50,
  maxTurns: 50,
  changed: false,
  repeatedActions: [{ action: 'runProjectCheck {"kind":"test"}', count: 6 }],
  streak: 1,
  tip: '9c3453f',
  at: PARKED_AT,
}

const AGAIN: ProcessCircling = {
  summary:
    'Going in circles: ran out of turns (100 of 100) 2 times in a row, even with more turns; changed nothing.',
  signals: ['no-change', 'again'],
  ranOut: true,
  turnsUsed: 100,
  maxTurns: 100,
  changed: false,
  flipFlopFiles: ['src/workflow/ProcessDriver.ts'],
  sameFailures: ['build: src/workflow/ProcessDriver.ts(212,7): error TS2322'],
  streak: 2,
  afterRaise: true,
  afterRetry: true,
  tip: '9c3453f',
  at: PARKED_AT,
}

const NEAR: ProcessCircling = {
  summary:
    'Going in circles: used 47 of 50 turns without finishing; made the same call 5× (readStepTranscript {"stepId":"checks"}).',
  signals: ['repeated'],
  ranOut: false,
  turnsUsed: 47,
  maxTurns: 50,
  repeatedActions: [{ action: 'readStepTranscript {"stepId":"checks"}', count: 5 }],
  streak: 1,
  at: PARKED_AT,
}

const attempt = (over: Partial<ProcessLedgerEntry>): ProcessLedgerEntry => ({
  id: 'impl-1',
  stepId: 'implement',
  iteration: 1,
  status: 'done',
  outcome: 'failed',
  startedAt: 0,
  agentStop: 'turn-limit',
  turnLimit: LIMIT_50,
  model: { runner: 'api' },
  runRef: { runId: 'run-a1', agentRunId: 'agent-a1', runner: 'api' },
  ...over,
})

/** A feature's run stopped on its developer, with the attempts given. */
function featureRun(
  ledger: ProcessLedgerEntry[],
  park: NonNullable<ProcessRun['park']>,
  over: Partial<ProcessRun> = {},
): ProcessRun {
  return {
    id: 'run-feature',
    projectId: 'thefactory-tools',
    storyId: 'story-1',
    featureId: 'feature-1',
    title: 'Reasoning effort per model',
    input: { runner: 'api' },
    status: 'parked',
    loopCounts: {},
    startedAt: 0,
    updatedAt: 0,
    workBranchTip: '9c3453f',
    plan: {
      definitionId: 'feature-default',
      definitionScope: 'global',
      definitionVersion: 3,
      name: 'Feature',
      frozenAt: 0,
      steps: [
        { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
        { id: 'checks', name: 'Checks', kind: 'check' },
        { id: 'verify', name: 'Verify', kind: 'agent', agentType: 'verifier' },
      ],
      loops: [{ id: 'fix', from: 'checks', to: 'implement', when: ['failed'], maxIterations: 3 }],
    },
    ledger,
    park,
    ...over,
  }
}

const parkOn = (
  message: string,
  circling?: ProcessCircling,
  reason: NonNullable<ProcessRun['park']>['reason'] = 'turn-limit',
  stepId = 'implement',
): NonNullable<ProcessRun['park']> => ({
  reason,
  stepId,
  message,
  parkedAt: PARKED_AT,
  ...(circling ? { circling } : {}),
})

const PLAIN = featureRun(
  [attempt({ summary: 'Its agent ran out of turns (50) before it finished.' })],
  parkOn('Implement ran out of turns (50) before it finished.'),
)

/** Handed on by the manager: what it found and the next step it recommends to the person. */
const HANDED_ON: ProcessManagerEscalation = {
  runId: 'run-feature',
  parkedAt: PARKED_AT,
  at: PARKED_AT,
  signature: 's',
  why: 'circling',
  what: AGAIN.summary,
  found:
    'Every attempt reruns the same failing test and writes ProcessDriver.ts back. The test needs a fixture the brief never names — it is not in the checkout.',
  tried: [],
  recommendation:
    'Add a note pointing it at the fixture under test/data, then try again — more turns alone went round the same way.',
  recommendedChoice: 'retry',
}

const MANAGER_OFF_RUN = featureRun(
  [attempt({ summary: FIRST.summary, circling: FIRST })],
  parkOn('Implement is going in circles: ran out of turns (50 of 50); changed nothing.', FIRST),
  { input: { runner: 'api', manager: { enabled: false } } },
)

const AGAIN_RUN = featureRun(
  [
    attempt({ override: { choice: 'retry', at: 1, turnLimit: LIMIT_100, decidedBy: 'person' } }),
    attempt({
      id: 'impl-2',
      iteration: 2,
      turnLimit: LIMIT_100,
      summary: AGAIN.summary,
      circling: AGAIN,
    }),
  ],
  parkOn(
    'Implement is going in circles: ran out of turns (100 of 100) 2 times in a row, even with more turns; changed nothing.',
    AGAIN,
  ),
  { turnLimit: LIMIT_100 },
)

const RECOMMENDED_RUN: ProcessRun = { ...AGAIN_RUN, manager: { escalation: HANDED_ON } }

const NEAR_RUN = featureRun(
  [
    attempt({ outcome: 'passed', agentStop: undefined, summary: 'Implemented.' }),
    {
      id: 'checks-1',
      stepId: 'checks',
      iteration: 1,
      status: 'done',
      outcome: 'passed',
      startedAt: 1,
    },
    attempt({
      id: 'verify-1',
      stepId: 'verify',
      agentStop: undefined,
      summary: `${NEAR.summary} The verifier could not reach the app.`,
      circling: NEAR,
    }),
  ],
  parkOn(
    'Verify is going in circles: used 47 of 50 turns without finishing; made the same call 5× (readStepTranscript {"stepId":"checks"}).',
    NEAR,
    'step-failed',
    'verify',
  ),
)

/** The story's run, its feature step waiting on the nested run that went in circles. */
const MIRROR_RUN: ProcessRun = {
  ...featureRun(
    [
      {
        id: 'feature-step',
        stepId: 'features:feature-1',
        iteration: 1,
        status: 'running',
        startedAt: 0,
        childRunId: 'run-feature',
      },
    ],
    {
      reason: 'turn-limit',
      stepId: 'features:feature-1',
      message: 'Waiting on Reasoning effort per model.',
      parkedAt: PARKED_AT,
      childRunId: 'run-feature',
      circling: AGAIN,
    },
  ),
  id: 'run-story',
  featureId: undefined,
  title: 'Reasoning effort: per-model levels, quick switch and defaults',
  plan: {
    definitionId: 'story-default',
    definitionScope: 'global',
    definitionVersion: 4,
    name: 'Story',
    frozenAt: 0,
    steps: [
      {
        id: 'features:feature-1',
        name: 'Reasoning effort per model',
        kind: 'process',
        processId: 'feature-default',
      },
      { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
    ],
    loops: [],
  },
}

const BRIEF: ProcessManagerBriefCard = {
  kind: 'brief',
  mode: 'diagnose',
  runId: 'run-feature',
  parkedAt: PARKED_AT,
  stepName: 'Implement',
  reason: 'turn-limit',
  message:
    'Implement is going in circles: ran out of turns (100 of 100) 2 times in a row, even with more turns; changed nothing.',
  circling: AGAIN,
  failed: ['stop: turn-limit'],
  answers: processRunParkChoices(AGAIN_RUN).map((c) => ({
    choice: c.choice,
    label: c.label,
    detail: c.detail,
  })),
  tried: [],
  triesUsed: 0,
  triesMax: 8,
}

const ESCALATION: ProcessManagerEscalationCard = { kind: 'escalation', escalation: HANDED_ON }

const frame = (node: ReactNode) => (
  <MemoryRouter>
    <div className="max-w-[720px] p-4">{node}</div>
  </MemoryRouter>
)

const park = (run: ProcessRun) =>
  frame(
    <ParkBlock
      run={run}
      managerLine={undefined}
      onChoose={noop}
      onChangeProof={noop}
      onAnswerRequest={noop}
      onDelegate={resolved}
      onDrill={noop}
    />,
  )

/** A step's row as the pipeline draws its name and flags — the chip is the pipeline's own. */
function Row({
  name,
  summary,
  view,
}: {
  name: string
  summary: string
  view?: ProcessCirclingView
}) {
  return (
    <div className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-center gap-3 border-b border-(--border-subtle) px-4 py-2.5">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-[13.5px] font-semibold text-(--text-primary)">{name}</span>
        {view ? <CirclingChip view={view} /> : null}
      </span>
      <span className="min-w-0 truncate text-[12.5px] text-(--text-secondary)">{summary}</span>
    </div>
  )
}

export const CIRCLING_SCENES: Scene[] = [
  {
    id: 'going-in-circles',
    title: 'A step going in circles',
    component: 'ParkBlock (ProcessPipeline) · CirclingNotice · CirclingChip · ManagerCards',
    group: 'Process',
    description:
      'An agent step that ran out of turns, or nearly, and made no progress is flagged as going in circles. The flag blocks nothing: the stop keeps its normal choices — the raise and its turn picker included — and shows the flag, its evidence and the manager’s recommendation right beside them. The manager only diagnoses such a stop and hands it to the person with its recommendation; with the manager off, the flag and evidence show alone.',
    states: [
      {
        id: 'plain-turn-limit',
        title: 'Out of turns, not flagged (base)',
        description:
          'A first run-out the host could not read as circling: the stop offers raising the limit, as before.',
        render: () => park(PLAIN),
      },
      {
        id: 'manager-recommends',
        title: 'Flagged, with the manager’s recommendation',
        description:
          'Retried with 100 turns, it ran out again, wrote the same file back and was sent back with the same failing check. The manager handed the stop on: “Going in circles — the manager recommends …” sits right above the same choices as the base — raise the limit with its picker, carry on or stop.',
        render: () => park(RECOMMENDED_RUN),
      },
      {
        id: 'manager-off',
        title: 'Flagged, with the manager off',
        description:
          'The developer used all 50 turns and left no commit. With the manager off there is no recommendation: the flag and its evidence show beside the normal choices.',
        render: () => park(MANAGER_OFF_RUN),
      },
      {
        id: 'near-limit-repeated',
        title: 'Nearly out of turns, the same call again and again',
        description:
          'The verifier used 47 of 50 turns and made the same call five times; the run stops on it instead of going round the loop, with its normal choices.',
        render: () => park(NEAR_RUN),
      },
      {
        id: 'nested-mirror',
        title: 'On the story, waiting on the feature',
        description:
          'The story’s run carries the feature’s flag on its step; the decision is in the nested run.',
        render: () => park(MIRROR_RUN),
      },
      {
        id: 'step-row-chip',
        title: 'The flag on the step’s row',
        description: 'The pipeline row of the step, and of a story’s step waiting on it.',
        render: () => {
          const view = processCirclingView(AGAIN)
          return frame(
            <div className="rounded-lg border border-(--border-subtle) bg-(--surface-raised)">
              <Row name="Implement" summary={AGAIN.summary} {...(view ? { view } : {})} />
              <Row name="Checks" summary="Build ✗ at 9c3453f" />
              <Row
                name="Reasoning effort per model"
                summary="Waiting on Reasoning effort per model."
                {...(view ? { view } : {})}
              />
            </div>,
          )
        },
      },
      {
        id: 'manager-brief',
        title: 'The manager’s brief leads with it',
        description:
          'The brief card in the run’s chat, open: a diagnosis, the flag and its evidence above what stopped. The manager recommends; it never answers the stop itself.',
        render: () => frame(<ManagerBriefCardView card={BRIEF} defaultOpen links={{}} />),
      },
      {
        id: 'escalated',
        title: 'Handed to you: “Going in circles”',
        description:
          'The manager’s hand-off card in the run’s chat, read live from the run: what it found and the next step it recommends.',
        render: () => frame(<ManagerEscalationCardView card={ESCALATION} links={{}} />),
      },
    ],
  },
]
