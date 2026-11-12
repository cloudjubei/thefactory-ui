import { useEffect, useState, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import type {
  ProcessLedgerEntry,
  ProcessPark,
  ProcessProofPair,
  ProcessProposal,
  ProcessRun,
} from 'thefactory-tools/types'
import { processRunParkChoices } from 'thefactory-tools/utils'
import {
  ApiProvider,
  AppSettingsProvider,
  AuthProvider,
  FilesProvider,
  LAUNCH_CAPS_COPY,
  ProjectsProvider,
  launchCapFields,
  launchCapsMetadata,
  launchCapsSummary,
  launchWorstCaseLine,
  storyLaunchGrant,
  useProjects,
  verifyProofView,
  type EvidenceTile,
  type LaunchCapsTyped,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
import {
  AgentQuestionCard,
  LaunchCapsFields,
  ProcessesView,
  ProjectDefaultCapsField,
} from 'thefactory-ui/web'
import ApprovalPanel from '../../src/web/compound/chat/ApprovalPanel'
import { ParkBlock } from '../../src/web/compound/process/ProcessPipeline'
import ProofScreens from '../../src/web/compound/process/ProofScreens'
import { FAKE_PROJECT_ID } from '../../src/fakeBackend/fixtures/projects'
import { FAKE_PROCESS_RUN_STATISTICS } from '../../src/fakeBackend/fixtures/processRuns'
import type { PendingQuestionGrant } from '../../src/headless/utils/chatTypes'
import type { Scene } from '../showcase/types'
import { OnFixtures, type FixtureRoutes } from './onFixtures'

const noop = () => {}
const resolved = async () => {}

const nodeOf = (id: string, title: string, attempts: number): ProcessProposal['steps'][number] => ({
  id: `features:${id}`,
  name: title,
  kind: 'process',
  agent: false,
  subject: { kind: 'feature', id, title },
  maxIterations: attempts,
  children: [
    { id: 'implement', name: 'Implement', kind: 'agent', agent: true, agentRole: 'developer' },
    { id: 'capture', name: 'Capture', kind: 'capture', agent: false },
    { id: 'verify', name: 'Verify', kind: 'agent', agent: true, agentRole: 'verifier' },
  ],
})

const proposalOf = (body: unknown, over: Partial<ProcessProposal> = {}): ProcessProposal => {
  const attempts = (body as { maxIterations?: number } | undefined)?.maxIterations ?? 2
  return {
    processId: 'story',
    name: 'Story: feature by feature',
    steps: [
      nodeOf('f2', 'Reply in thread', attempts),
      nodeOf('f3', 'Read receipts', attempts),
      { id: 'sign-off', name: 'Sign-off', kind: 'gate', agent: false },
    ],
    captureTarget: 'android',
    defaultCaps: { spendUsdCap: 10, wallClockMs: 7_200_000, maxIterations: 2 },
    ...over,
  }
}

const sentDecisions: unknown[] = []

const routesOf = (over: Partial<ProcessProposal> = {}): FixtureRoutes => ({
  'POST /api/v1/processes/preview': (_, __, body) => proposalOf(body, over),
  '/api/v1/process-runs/statistics': () => FAKE_PROCESS_RUN_STATISTICS,
  '/api/v1/projects/{projectId}/notes': () => [],
  '/api/v1/projects/{projectId}/stories/order': () => ['s7'],
})

/** Puts the fake project in view, so the stories its launch reads load. */
function InProject({ children }: { children: ReactNode }) {
  const { setActiveProjectId } = useProjects()
  useEffect(() => setActiveProjectId(FAKE_PROJECT_ID), [setActiveProjectId])
  return children
}

/** The real launch card on fixture answers: the preview read, the statistics read. */
function LaunchCard({ routes = routesOf() }: { routes?: FixtureRoutes }) {
  return (
    <OnFixtures routes={routes}>
      <FilesProvider>
        <MemoryRouter>
          <InProject>
            <div className="w-full max-w-[640px]">
              <ApprovalPanel
                grant={storyLaunchGrant({
                  storyId: 's7',
                  chatRunner: 'api',
                  onLaunch: async (metadata) => {
                    sentDecisions.push(metadata)
                    ;(window as unknown as { sentDecisions: unknown[] }).sentDecisions =
                      sentDecisions
                  },
                  onCancel: noop,
                })}
                projectId={FAKE_PROJECT_ID}
                onDecideLater={noop}
              />
            </div>
          </InProject>
        </MemoryRouter>
      </FilesProvider>
    </OnFixtures>
  )
}

function Fields({ typed, note, open }: { typed?: LaunchCapsTyped; note?: string; open?: boolean }) {
  const [now, setNow] = useState<LaunchCapsTyped>(typed ?? {})
  const fields = launchCapFields({
    defaults: { spendUsdCap: 10, wallClockMs: 7_200_000, maxIterations: 2 },
    typed: now,
  })
  const caps = launchCapsMetadata(fields)
  const worstCase = launchWorstCaseLine({
    attempts: caps.maxIterations,
    count: 4,
    of: 'feature',
  })
  return (
    <div
      ref={(el) => {
        if (open && el?.querySelector('[aria-expanded="false"]')) {
          el.querySelector<HTMLButtonElement>('[aria-expanded="false"]')?.click()
        }
      }}
      className="w-full max-w-[520px] rounded-md border border-(--border-subtle) bg-(--surface-raised) p-3"
    >
      <LaunchCapsFields
        fields={fields}
        summary={launchCapsSummary(caps)}
        {...(worstCase ? { worstCase } : {})}
        {...(note ? { note } : {})}
        onChange={(key, text) => setNow({ ...now, [key]: text })}
      />
    </div>
  )
}

const MEMORY: SyncKVStorage = { get: () => null, set: noop }
const NO_TOKEN = { read: () => null, write: noop }

function ProjectDefaults({
  caps = { spendUsdCap: 10, maxIterations: 2 },
}: {
  caps?: Record<string, number>
}) {
  const [metadata, setMetadata] = useState<Record<string, unknown>>({
    icon: 'folder',
    processDefaultCaps: caps,
  })
  return (
    <div className="flex w-full max-w-[640px] flex-col gap-3">
      <ProjectDefaultCapsField metadata={metadata} onChange={setMetadata} />
      <code className="text-[11px] text-(--text-muted)">
        {JSON.stringify(metadata.processDefaultCaps ?? null)}
      </code>
    </div>
  )
}

function Library() {
  return (
    <OnFixtures routes={{ '/api/v1/process-runs/statistics': () => FAKE_PROCESS_RUN_STATISTICS }}>
      <MemoryRouter>
        <div className="h-[560px] w-full">
          <InProject>
            <ProcessesView selectedProcessId="story" />
          </InProject>
        </div>
      </MemoryRouter>
    </OnFixtures>
  )
}

const QUESTIONS_SPENT: ProcessPark = {
  reason: 'questions-spent',
  stepId: 'implement',
  parkedAt: 0,
  message: 'The question limit is reached. Allow another question to continue.',
  actions: [],
} as unknown as ProcessPark

const attempt: ProcessLedgerEntry = {
  id: 'impl-1',
  stepId: 'implement',
  iteration: 1,
  status: 'done',
  outcome: 'failed',
  startedAt: 0,
  model: { runner: 'api' },
  runRef: { runId: 'run-a1', agentRunId: 'agent-a1', runner: 'api' },
} as unknown as ProcessLedgerEntry

const SPENT_RUN = {
  id: 'run-feature',
  projectId: FAKE_PROJECT_ID,
  storyId: 's7',
  title: 'Reply in thread',
  input: { runner: 'api' },
  status: 'parked',
  loopCounts: {},
  startedAt: 0,
  updatedAt: 0,
  plan: {
    definitionId: 'feature-default',
    definitionScope: 'global',
    definitionVersion: 3,
    name: 'Feature',
    frozenAt: 0,
    steps: [{ id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' }],
    edges: [],
  },
  ledger: [attempt],
  park: QUESTIONS_SPENT,
} as unknown as ProcessRun

function Spent() {
  return (
    <MemoryRouter>
      <div className="w-full max-w-[640px]">
        <ParkBlock
          run={
            {
              ...SPENT_RUN,
              park: { ...QUESTIONS_SPENT, actions: processRunParkChoices(SPENT_RUN) },
            } as ProcessRun
          }
          managerLine={undefined}
          onChoose={noop}
          onChangeProof={noop}
          onAnswerRequest={noop}
          onDelegate={resolved}
          onDrill={noop}
        />
      </div>
    </MemoryRouter>
  )
}

const HELD: PendingQuestionGrant = {
  id: 'held',
  label: 'askUser',
  question: { question: 'Which account should the check sign in with?' },
  answer: async () => {
    throw new Error(
      'This question waits on the run’s question limit. Allow another question on the run first.',
    )
  },
  decide: resolved,
  cancel: resolved,
} as unknown as PendingQuestionGrant

function Held() {
  return (
    <AuthProvider storage={NO_TOKEN}>
      <ApiProvider apiBaseUrl={null} wsBaseUrl={null} client="web">
        <AppSettingsProvider storage={MEMORY}>
          <ProjectsProvider>
            <FilesProvider>
              <div className="w-full max-w-[560px]">
                <AgentQuestionCard
                  grant={{
                    ...HELD,
                    question: {
                      ...HELD.question,
                      options: [{ label: 'The test account', detail: 'qa@example.test' }],
                    },
                  }}
                />
              </div>
            </FilesProvider>
          </ProjectsProvider>
        </AppSettingsProvider>
      </ApiProvider>
    </AuthProvider>
  )
}

const SVG = (color: string, label: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="184" height="328"><rect width="184" height="328" fill="${color}"/><text x="92" y="168" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#fff">${label}</text></svg>`,
  )}`

const tile = (id: string, phase: 'before' | 'after', color: string): EvidenceTile =>
  ({
    ref: { id, subject: 'Roster import', phase, kind: 'screenshot', createdAt: 0 },
    dataUri: SVG(color, phase),
  }) as unknown as EvidenceTile

const pairOf = (over: Partial<ProcessProofPair>): ProcessProofPair => ({
  subject: 'Roster import',
  beforeId: 'b1',
  afterId: 'a1',
  changedPixels: 24_000,
  totalPixels: 60_000,
  counted: true,
  ...over,
})

const REASON =
  'The migration runs once: the old table cannot be rebuilt from the base commit, so this was captured on the device before it ran.'

function Proof({ observed }: { observed: boolean }) {
  const view = verifyProofView(
    {
      pairs: [pairOf(observed ? { observedBefore: { reason: REASON } } : {})],
      newScreenIds: [],
      recordingIds: [],
    },
    [tile('b1', 'before', '#64748b'), tile('a1', 'after', '#0f766e')],
    { standing: 'passed' },
  )
  return (
    <div className="w-full max-w-[640px]">
      <ProofScreens view={view} onOpen={noop} onRequestImage={noop} />
      <p className="m-0 mt-3 text-[12px] text-(--text-secondary)">{view.screens[0]?.note}</p>
    </div>
  )
}

export const PROCESS_LAUNCH_SCENES: Scene[] = [
  {
    id: 'process-launch-envelope',
    title: 'Launch limits',
    component: 'ApprovalPanel (startFeatureWork) · LaunchCapsFields',
    group: 'Process',
    description:
      'The launch card’s limits: spend, spend per step, time, attempts, questions and each check’s timeout, folded to one line with the worst case the attempts come to. Each starts from the agent’s ask, else the project’s default, and goes with the approval. The device the capture and verify steps drive, and how the process has done, sit on the same card.',
    states: [
      {
        id: 'card',
        title: 'On the launch card',
        description:
          'The real card on fixture answers: limits from the project’s defaults, the worst case, the device and the statistics.',
        render: () => <LaunchCard />,
      },
      {
        id: 'no-device',
        title: 'No device named',
        description: 'The host could not tell: the card says nothing about one.',
        render: () => <LaunchCard routes={routesOf({ captureTarget: undefined })} />,
      },
      {
        id: 'folded',
        title: 'Folded',
        description: 'One line of limits, and the worst case under it.',
        render: () => <Fields />,
      },
      {
        id: 'open',
        title: 'Open',
        description: 'Each field says what it holds to. A project’s default says so.',
        render: () => <Fields open />,
      },
      {
        id: 'emptied',
        title: 'A default emptied',
        description: 'The field says what still applies: a launch with no cap takes the default.',
        render: () => <Fields open typed={{ maxIterations: '' }} />,
      },
      {
        id: 'invalid',
        title: 'Not a limit',
        description: 'A field that cannot be sent opens itself and holds Approve back.',
        render: () => <Fields typed={{ maxIterations: '0', questionCap: '-1' }} />,
      },
      {
        id: 'step-spend',
        title: 'Spend per step set',
        description:
          'The most one step may spend, beside the run’s spend limit. Empty — no limit — unless the project or the agent set one; a step that reaches it stops after that turn and waits.',
        render: () => <Fields open typed={{ stepSpendCapUsd: '2' }} />,
      },
      {
        id: 'group',
        title: 'Across a group',
        description: 'A group’s limits leave each project’s defaults in force when empty.',
        render: () => <Fields open note={LAUNCH_CAPS_COPY.legsDefault} />,
      },
    ],
    controls: [
      {
        id: 'attempts',
        label: 'Attempts',
        kind: 'choice',
        options: ['1', '2', '3', '5'].map((id) => ({ id, label: id })),
        default: '2',
      },
    ],
    play: (values) => <Fields open typed={{ maxIterations: values.attempts ?? '2' }} />,
  },
  {
    id: 'project-default-caps',
    title: 'Project default limits',
    component: 'ProjectDefaultCapsField',
    group: 'Project',
    description:
      'The limits a project’s launches start from, in the project editor. The line under the fields is what is saved on the project.',
    states: [
      {
        id: 'set',
        title: 'Two set',
        description: 'A spend limit and attempts; the time limit is left to each launch.',
        render: () => <ProjectDefaults />,
      },
      {
        id: 'step-spend',
        title: 'Spend per step set',
        description: 'The project starts every launch with a $2 limit on each step.',
        render: () => <ProjectDefaults caps={{ spendUsdCap: 10, stepSpendUsdCap: 2 }} />,
      },
    ],
    play: () => <ProjectDefaults />,
  },
  {
    id: 'process-run-statistics',
    title: 'Process statistics',
    component: 'ProcessesView',
    group: 'Process',
    description:
      'How each process has done over its ended runs: on its row, and version by version in its detail. A process with no ended runs shows nothing.',
    wide: true,
    states: [
      {
        id: 'library',
        title: 'In the library',
        description: 'The row’s line, on fixture answers.',
        render: () => <Library />,
      },
    ],
    play: () => <Library />,
  },
  {
    id: 'process-question-limit',
    title: 'Question limit reached',
    component: 'ParkBlock (ProcessPipeline) · AgentQuestionCard',
    group: 'Process',
    description:
      'A run held at its question limit stops with Allow another question and Abandon, from the tools’ own choices. Answering the held question first is refused in the backend’s words.',
    states: [
      {
        id: 'park',
        title: 'The stop',
        description: 'The choices the host offers.',
        render: () => <Spent />,
      },
      {
        id: 'refused',
        title: 'Answered too soon',
        description: 'Press the option: the card shows the backend’s reason and stays.',
        render: () => <Held />,
      },
    ],
    play: () => <Spent />,
  },
  {
    id: 'proof-observed-before',
    title: 'Observed before',
    component: 'ProofScreens',
    group: 'Process',
    description:
      'A one-way change has no before to rebuild, so the before is observed in place. It is labelled on the thumbnail, and its reason shows with the pair.',
    states: [
      {
        id: 'observed',
        title: 'Observed',
        description: 'The label on the pair, its reason on hover and in the comparison.',
        render: () => <Proof observed />,
      },
      {
        id: 'built',
        title: 'Built from the base',
        description: 'Paired with Observed: an ordinary pair has no label.',
        render: () => <Proof observed={false} />,
      },
    ],
    controls: [{ id: 'observed', label: 'Observed before', kind: 'toggle', default: true }],
    play: (values) => <Proof observed={values.observed !== 'false'} />,
  },
]
