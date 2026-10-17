import type { ReactNode } from 'react'
import type {
  ProcessProofChangeOffer,
  ProcessProposal,
  ProcessRun,
  ProofKindUnavailable,
} from 'thefactory-tools/types'
import { launchProofPlanRows, proofPlanMarkRows, requestProofChoices } from 'thefactory-ui/headless'
// Not on the package's public surface: the pipeline draws its stop and its composers itself. The
// showcase reaches into the source for them, as the playground renders the library from source.
import LaunchFeatureList from '../../src/web/compound/chat/LaunchFeatureList'
import { RequestProofSwitches } from '../../src/web/compound/process/ParkNoteComposer'
import { ParkBlock } from '../../src/web/compound/process/ProcessPipeline'
import ProofChangeComposer from '../../src/web/compound/process/ProofChangeComposer'
import ProofPlanMarks from '../../src/web/compound/process/ProofPlanMarks'
import type { Scene } from '../showcase/types'

const noop = () => {}
const resolved = async () => {}

const NO_SCREENS: ProofKindUnavailable[] = [
  {
    kind: 'ui-before-after',
    reason:
      'The project declares the viewer app but has no way to serve it: it has no viewer/index.html at ba8846bbedd2.',
  },
]

const FIXER_BLOCKED = {
  kind: 'blocker' as const,
  agent: 'fixer',
  title: 'The fixer is blocked',
  detail:
    'The remaining send-back requires before/after product screenshots, but this backend-only package has no affected runnable screen.',
}

/** The story fix of run 47f485cf: its verify could not capture screens, and the fixer it sent the work back to is blocked. */
const BLOCKED_FIX: ProcessRun = {
  id: '477a44ba',
  projectId: 'thefactory-tools',
  storyId: '77268f48',
  parentRunId: '47f485cf',
  parentStepId: 'fix',
  title: 'Fix',
  status: 'parked',
  loopCounts: { fix: 1 },
  startedAt: 0,
  updatedAt: 0,
  input: { changeRequest: { from: 'code-review', proofKinds: ['ui-before-after'] } },
  proofUnavailable: NO_SCREENS,
  plan: {
    definitionId: 'fix-default',
    definitionScope: 'global',
    definitionVersion: 1,
    name: 'Fix',
    frozenAt: 0,
    loops: [{ id: 'fix', from: 'verify', to: 'implement', when: ['failed'], maxIterations: 3 }],
    steps: [
      { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'fixer' },
      { id: 'checks', name: 'Checks', kind: 'check' },
      { id: 'code-review', name: 'Code review', kind: 'judge' },
      { id: 'verify', name: 'Verify', kind: 'agent', agentType: 'verifier' },
      { id: 'report', name: 'Report', kind: 'report' },
    ],
  },
  ledger: [
    {
      id: 'i1',
      stepId: 'implement',
      iteration: 1,
      status: 'done',
      outcome: 'passed',
      startedAt: 0,
    },
    { id: 'c1', stepId: 'checks', iteration: 1, status: 'done', outcome: 'passed', startedAt: 0 },
    {
      id: 'r1',
      stepId: 'code-review',
      iteration: 1,
      status: 'done',
      outcome: 'passed',
      startedAt: 0,
      review: { verdict: 'approved', reason: 'All three corrections are implemented.' },
    },
    {
      id: 'v1',
      stepId: 'verify',
      iteration: 1,
      status: 'done',
      outcome: 'failed',
      startedAt: 0,
      proof: {
        pairs: [],
        newScreenIds: [],
        recordingIds: [],
        outcome: 'failed',
        reason: 'Could not produce the requested before/after screenshots.',
        judged: false,
      },
    },
    {
      id: 'i2',
      stepId: 'implement',
      iteration: 2,
      status: 'done',
      outcome: 'waiting',
      startedAt: 0,
      ask: FIXER_BLOCKED,
    },
  ],
  park: {
    reason: 'step-waiting',
    stepId: 'implement',
    ask: FIXER_BLOCKED,
    message: 'Waiting on you: The fixer is blocked',
    parkedAt: 0,
  },
}

const FIX_OFFER: ProcessProofChangeOffer = {
  stepId: 'verify',
  current: ['ui-before-after'],
  standings: [
    {
      kind: 'ui-before-after',
      status: 'unmet',
      detail: 'Could not produce the requested before/after screenshots.',
    },
  ],
  unavailable: NO_SCREENS,
}

const FEATURE_OFFER: ProcessProofChangeOffer = {
  featureId: 'aa3e3acb',
  stepId: 'implement',
  current: ['checks', 'code-review', 'ui-before-after'],
  standings: [
    { kind: 'checks', status: 'pending', detail: 'The checks step has not run yet.' },
    { kind: 'code-review', status: 'pending', detail: 'The code review has not run yet.' },
    { kind: 'ui-before-after', status: 'unchecked', detail: 'No screen shows a library.' },
  ],
  unavailable: NO_SCREENS,
}

/** Run 47f485cf’s Fix as it stands today: the host reads screens as producible, and the fixer is still blocked on them. */
const BLOCKED_FIX_PRODUCIBLE: ProcessRun = { ...BLOCKED_FIX, proofUnavailable: [] }

const FIX_OFFER_PRODUCIBLE: ProcessProofChangeOffer = { ...FIX_OFFER, unavailable: [] }

/** The same Fix once its verify read the change: screens only the code review’s words asked for, of a change that shows nothing. */
const FIX_SCREENS_NOT_NEEDED: ProcessRun = {
  ...BLOCKED_FIX,
  status: 'succeeded',
  proofUnavailable: [],
  park: undefined,
  ledger: [
    ...BLOCKED_FIX.ledger.slice(0, 3),
    {
      id: 'v1',
      stepId: 'verify',
      iteration: 1,
      status: 'done',
      outcome: 'passed',
      startedAt: 0,
      proof: {
        pairs: [],
        newScreenIds: [],
        recordingIds: [],
        outcome: 'passed',
        judged: true,
        plan: {
          kinds: [
            {
              kind: 'ui-before-after',
              status: 'met',
              detail: 'Not needed — the change shows nothing on screen.',
            },
          ],
          screensNotNeeded: true,
        },
      },
    },
  ],
}

const LAUNCH: Pick<ProcessProposal, 'proofPlans'> = {
  proofPlans: [
    {
      featureId: 'f1',
      title: 'Reasoning effort per model',
      plan: { kinds: ['unit-tests', 'checks', 'code-review'] },
      source: 'feature',
      unavailable: NO_SCREENS,
      dropped: NO_SCREENS,
    },
  ],
}

const frame = (node: ReactNode) => <div className="max-w-[640px] p-4">{node}</div>

export const PROOF_CHANGE_SCENES: Scene[] = [
  {
    id: 'proof-change-stop',
    title: 'Change what proves it',
    component: 'ParkBlock (ProcessPipeline) · ProofChangeComposer',
    group: 'Process',
    description:
      'Offered at any stop where proof the work needs is unmet or unjudged — a feature run’s or a story fix’s, a failed step or an agent that reported it is blocked — whether or not the run can produce it: the person decides. Proof the run can’t produce is greyed with why; only a feature’s run can save the change onto the feature.',
    states: [
      {
        id: 'fix-blocked-on-screens',
        title: 'Story fix: the fixer is blocked on screens',
        description:
          'Run 47f485cf: a backend-only package was asked for screenshots. The blocker offers “Change what proves it”, and Verify is judged again.',
        render: () =>
          frame(
            <ParkBlock
              run={BLOCKED_FIX}
              managerLine={undefined}
              onChoose={noop}
              onChangeProof={noop}
              onAnswerRequest={noop}
              onDelegate={resolved}
              onDrill={noop}
            />,
          ),
      },
      {
        id: 'fix-blocked-producible',
        title: 'Story fix: offered though screens can be produced',
        description:
          'The host reads screens as producible, yet the fixer is blocked on them. The stop still offers “Change what proves it”.',
        render: () =>
          frame(
            <ParkBlock
              run={BLOCKED_FIX_PRODUCIBLE}
              managerLine={undefined}
              onChoose={noop}
              onChangeProof={noop}
              onAnswerRequest={noop}
              onDelegate={resolved}
              onDrill={noop}
            />,
          ),
      },
      {
        id: 'fix-change-producible',
        title: 'Story fix: changing it, nothing greyed',
        description: 'Every kind can be produced here, so every kind can be picked.',
        render: () =>
          frame(<ProofChangeComposer offer={FIX_OFFER_PRODUCIBLE} onSend={noop} onCancel={noop} />),
      },
      {
        id: 'fix-change-open',
        title: 'Story fix: changing it',
        description:
          'Screens are unmet and can’t be produced here — the project declares an app it has no way to serve; checks and code review can be picked instead. No “Save to the feature” — a fix works no single feature.',
        render: () =>
          frame(<ProofChangeComposer offer={FIX_OFFER} onSend={noop} onCancel={noop} />),
      },
      {
        id: 'feature-change-open',
        title: 'Feature run: changing it',
        description: 'A feature’s run can also save the change onto the feature.',
        render: () =>
          frame(<ProofChangeComposer offer={FEATURE_OFFER} onSend={noop} onCancel={noop} />),
      },
    ],
  },
  {
    id: 'proof-screens-not-needed',
    title: 'Screens not needed',
    component: 'ProofPlanMarks',
    group: 'Process',
    description:
      'Screens asked for only in words — a code review’s findings, a note — are met as not needed when none of the change’s files change what users see. Screens a person picked stay.',
    states: [
      {
        id: 'fix-shows-nothing',
        title: 'Story fix: the change shows nothing on screen',
        description: 'Run 47f485cf’s Fix: backend files only, so its verify needs no screens.',
        render: () =>
          frame(<ProofPlanMarks rows={proofPlanMarkRows(FIX_SCREENS_NOT_NEEDED) ?? []} />),
      },
    ],
  },
  {
    id: 'request-changes-proof',
    title: 'Request changes: the proof the fix must show',
    component: 'RequestProofSwitches (ParkNoteComposer)',
    group: 'Process',
    description:
      'Proof the run can’t produce here is held off with why — never chosen only to fail later.',
    states: [
      {
        id: 'all-producible',
        title: 'Every kind can be produced',
        render: () =>
          frame(
            <RequestProofSwitches
              choices={requestProofChoices()}
              picked={['unit-tests']}
              onToggle={noop}
            />,
          ),
      },
      {
        id: 'screens-unavailable',
        title: 'Screens can’t be produced here',
        render: () =>
          frame(
            <RequestProofSwitches
              choices={requestProofChoices(NO_SCREENS)}
              picked={['unit-tests']}
              onToggle={noop}
            />,
          ),
      },
    ],
  },
  {
    id: 'launch-proof-dropped',
    title: 'Launch: proof the run can’t produce',
    component: 'LaunchFeatureList',
    group: 'Process',
    description:
      'A feature’s own plan asked for screens this project can’t produce: they are dropped and said so, and can’t be picked again.',
    states: [
      {
        id: 'screens-dropped',
        title: 'Screens dropped from the feature’s plan',
        render: () => {
          const proof = launchProofPlanRows(LAUNCH, {})[0]!
          return frame(
            <LaunchFeatureList
              rows={[
                {
                  featureId: 'f1',
                  title: 'Reasoning effort per model',
                  chain: [],
                  proof,
                  proofLabels: ['Unit tests', 'Checks', 'Code review'],
                },
              ]}
              tail={[]}
              save={false}
              onToggleKind={noop}
              onNotesChange={noop}
              onSaveChange={noop}
            />,
          )
        },
      },
    ],
  },
]
