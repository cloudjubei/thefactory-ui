import { useState, type ReactNode } from 'react'
import type {
  ProcessProofChangeOffer,
  ProcessProposal,
  ProcessRun,
  ProofKindUnavailable,
} from 'thefactory-tools/types'
import {
  launchProofPlanRows,
  proofPlanMarkRows,
  requestProofChoices,
  type ProofChangeKeptLook,
} from 'thefactory-ui/headless'
import { SegmentedControl, ToneBadge } from 'thefactory-ui/web'
// Not on the package's public surface: the pipeline draws its stop and its composers itself. The
// showcase reaches into the source for them, as the playground renders the library from source.
import LaunchFeatureList from '../../src/web/compound/chat/LaunchFeatureList'
import { RequestProofSwitches } from '../../src/web/compound/process/ParkNoteComposer'
import { ParkBlock } from '../../src/web/compound/process/ProcessPipeline'
import ProofChangeComposer from '../../src/web/compound/process/ProofChangeComposer'
import ProofPlanMarks from '../../src/web/compound/process/ProofPlanMarks'
import type { Scene } from '../showcase/types'
import {
  KEPT_LOOKS,
  VISIBLE_CHANGE_OFFER,
  VISIBLE_VIDEO_CHANGE_OFFER,
  VISIBLE_VIDEO_STAYS_OFFER,
} from './proofChangeFixtures'

const noop = () => {}
const resolved = async () => {}
const handedOn = async () => true

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

/** A launch on an app with no fake data: the setup feature added first, then the person's own. */
const LAUNCH_WITH_SETUP: Pick<ProcessProposal, 'proofPlans'> = {
  proofPlans: [
    {
      featureId: 'fake-data-setup',
      title: 'Fake data for the app',
      plan: { kinds: ['checks', 'code-review', 'ui-before-after'] },
      source: 'feature',
      added:
        'Added first: the app has no fake data yet, and the screens of the work after it are proved on the fake data this builds.',
    },
    {
      featureId: 'f1',
      title: 'Event list shows the venue',
      plan: { kinds: ['checks', 'code-review', 'ui-before-after'] },
      source: 'suggested',
    },
  ],
}

const frame = (node: ReactNode) => <div className="max-w-[640px] p-4">{node}</div>

/** The three looks for screens that stay, switched on the board on the real editor. */
function KeptAlternatives() {
  const [look, setLook] = useState<ProofChangeKeptLook>('reason')
  const shown = KEPT_LOOKS.find((l) => l.id === look) ?? KEPT_LOOKS[0]!
  return (
    <div className="flex w-full max-w-[640px] flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          ariaLabel="Screens that stay"
          value={look}
          onChange={(value) => setLook(value as ProofChangeKeptLook)}
          options={KEPT_LOOKS.map(({ id, label }) => ({ value: id, label }))}
        />
        {look === 'reason' ? <ToneBadge tone="done">The pick</ToneBadge> : null}
      </div>
      <p className="m-0 text-[13px] text-(--text-secondary)">{shown.note}</p>
      <ProofChangeComposer
        key={look}
        offer={VISIBLE_CHANGE_OFFER}
        onSend={noop}
        onCancel={noop}
        keptLook={look}
      />
    </div>
  )
}

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
              onDelegate={handedOn}
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
              onDelegate={handedOn}
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
    id: 'proof-change-keeps-screens',
    title: 'Screens stay on a visible change',
    component: 'ProofChangeComposer',
    group: 'Process',
    description:
      'When the change shows on screen, one kind that shows it — before/after screens or a before/after video — always stays in what proves it. Proven by one, the editor starts with it on and holds it there with why, instead of letting it be switched off and then showing the refusal. Proven by both, either can be switched off while the other stays: each says so, and the last one on is held with why. Held, with why is the pick; Left out and Stays chip are on the board.',
    states: [
      {
        id: 'alternatives',
        title: 'Alternatives',
        description: 'Held, with why · Left out · Stays chip, switched here on the real editor.',
        render: () => <KeptAlternatives />,
      },
      {
        id: 'one-of-two',
        title: 'Screens and video: one can go',
        description:
          'Run 59d1109e: proven by screens and a video, neither judged. Both start on and either can be switched off; the one left on is then held with why, and the other can be switched back on.',
        render: () =>
          frame(
            <ProofChangeComposer
              offer={VISIBLE_VIDEO_CHANGE_OFFER}
              onSend={noop}
              onCancel={noop}
              keptLook="reason"
            />,
          ),
      },
      {
        id: 'video-stays',
        title: 'Screens off, video held',
        description:
          'The video is counted and only the screens are short: the editor starts with the screens off and holds the video on with why. Switching the screens back on frees both.',
        render: () =>
          frame(
            <ProofChangeComposer
              offer={VISIBLE_VIDEO_STAYS_OFFER}
              onSend={noop}
              onCancel={noop}
              keptLook="reason"
            />,
          ),
      },
      ...KEPT_LOOKS.map(({ id, label, note }) => ({
        id,
        title: id === 'reason' ? `${label} (the pick)` : label,
        description: note,
        render: () =>
          frame(
            <ProofChangeComposer
              offer={VISIBLE_CHANGE_OFFER}
              onSend={noop}
              onCancel={noop}
              keptLook={id}
            />,
          ),
      })),
    ],
    controls: [
      {
        id: 'look',
        label: 'Screens that stay',
        kind: 'choice',
        options: KEPT_LOOKS.map(({ id, label }) => ({ id, label })),
        default: 'reason',
      },
    ],
    presets: KEPT_LOOKS.map(({ id, label }) => ({ id, name: label, values: { look: id } })),
    play: (values) =>
      frame(
        <ProofChangeComposer
          key={values.look}
          offer={VISIBLE_CHANGE_OFFER}
          onSend={noop}
          onCancel={noop}
          keptLook={(values.look ?? 'reason') as ProofChangeKeptLook}
        />,
      ),
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
  {
    id: 'launch-fake-data-setup',
    title: 'Launch: fake data added first',
    component: 'LaunchFeatureList',
    group: 'Process',
    description:
      'Work proved on an app’s real screens, on a project with no fake data: the launch adds “Fake data for the app” to the story and works it first, marked Added with why — never picked or left out, and with no story bullet, as the story does not hold it yet.',
    states: [
      {
        id: 'setup-added',
        title: 'Added above the features to pick',
        render: () => {
          const [setup, own] = launchProofPlanRows(LAUNCH_WITH_SETUP, {})
          return frame(
            <LaunchFeatureList
              rows={[
                {
                  featureId: setup!.featureId,
                  title: setup!.title,
                  chain: [],
                  proof: setup!,
                  proofLabels: ['Checks', 'Code review', 'Before/after screens'],
                },
                {
                  featureId: own!.featureId,
                  title: own!.title,
                  chain: [],
                  proof: own!,
                  proofLabels: ['Checks', 'Code review', 'Before/after screens'],
                },
              ]}
              tail={[]}
              save={false}
              onToggleKind={noop}
              onNotesChange={noop}
              onSaveChange={noop}
              pick={{
                rows: [
                  { featureId: 'f1', title: 'Event list shows the venue', picked: true },
                  { featureId: 'f2', title: 'Badge on the ticket', picked: false },
                ],
                onToggle: noop,
              }}
            />,
          )
        },
      },
    ],
  },
]
