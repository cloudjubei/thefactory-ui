import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import type {
  ChatContext,
  ProcessLedgerEntry,
  ProcessRun,
  StuckSignal,
} from 'thefactory-tools/types'
import { getChatContextKey, stuckAskPayload } from 'thefactory-tools/utils'
import {
  ChatBody,
  SegmentedControl,
  StuckCard,
  ToneBadge,
  type StuckCardLayout,
} from 'thefactory-ui/web'
import {
  ApiProvider,
  AppSettingsProvider,
  AuthProvider,
  FilesProvider,
  ProjectsProvider,
  parseQuestionPayload,
  processParkStuckView,
  processStepStuckView,
  usePendingToolGrants,
  type PendingQuestionGrant,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
import { CirclingChip } from '../../src/web/compound/process/CirclingNotice'
import { ParkBlock } from '../../src/web/compound/process/ProcessPipeline'
import type { Scene } from '../showcase/types'
import { OnFixtures, type FixtureRoutes } from './onFixtures'

const noop = () => {}
const resolved = async () => {}

const FAILING: StuckSignal = {
  kind: 'repeated-error',
  toolName: 'runProjectCheck',
  count: 3,
  action: 'runProjectCheck {"kind":"test","path":"src/headless/utils"}',
  error: 'Cannot find module ./chatContextFill',
  reason:
    'it made the same call 3 times and it failed each time (runProjectCheck {"kind":"test"}): Cannot find module ./chatContextFill',
  key: 'k-failing',
}

const REPEATING: StuckSignal = {
  kind: 'repeated-call',
  toolName: 'readPaths',
  count: 5,
  action: 'readPaths {"paths":["src/web/compound/chat/ChatBody.tsx"]}',
  reason:
    'it made the same call 5 times and got the same result (readPaths {"paths":["src/web/compound/chat/ChatBody.tsx"]})',
  key: 'k-repeating',
}

const grantOf = (signal: StuckSignal): PendingQuestionGrant =>
  ({
    id: `ask-${signal.key}`,
    label: 'askUser',
    question: parseQuestionPayload(stuckAskPayload(signal)),
    answer: resolved,
    decide: resolved,
    cancel: resolved,
  }) as unknown as PendingQuestionGrant

const LAYOUTS: { id: StuckCardLayout; label: string; note: string }[] = [
  {
    id: 'rows',
    label: 'Rows',
    note: 'The pick. It reads like the question card people already answer, and each row says what it does, which matters most for Stop.',
  },
  {
    id: 'buttons',
    label: 'Buttons',
    note: 'Shorter, so more of the chat stays in view, but nothing says what Continue or Stop will do until after the press.',
  },
  {
    id: 'folded',
    label: 'Folded',
    note: 'Shortest. The evidence waits behind a tap, though the evidence is why the person is being asked.',
  },
]

/** Presses a button of what it wraps once, as a person would, to show the state it leads to. */
function Pressed({ label, children }: { label: string; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const button = [...(root.current?.querySelectorAll('button') ?? [])].find((b) =>
      b.textContent?.includes(label),
    )
    button?.click()
  }, [label])
  return (
    <div ref={root} className="contents">
      {children}
    </div>
  )
}

const MEMORY: SyncKVStorage = { get: () => null, set: noop }
const NO_TOKEN = { read: () => null, write: noop }

/** The composer's slot, signed out with no backend: nothing is read, so a state draws only what it is given. */
function Slot({ children, width = 560 }: { children: ReactNode; width?: number }) {
  return (
    <AuthProvider storage={NO_TOKEN}>
      <ApiProvider apiBaseUrl={null} wsBaseUrl={null} client="web">
        <AppSettingsProvider storage={MEMORY}>
          <ProjectsProvider>
            <FilesProvider>
              <div
                className="flex flex-col gap-2 border-t border-(--border-default) bg-(--surface-raised) px-3 py-3"
                style={{ width, maxWidth: '100%' }}
              >
                {children}
              </div>
            </FilesProvider>
          </ProjectsProvider>
        </AppSettingsProvider>
      </ApiProvider>
    </AuthProvider>
  )
}

function Alternatives() {
  const [layout, setLayout] = useState<StuckCardLayout>('rows')
  const shown = LAYOUTS.find((l) => l.id === layout) ?? LAYOUTS[0]!
  return (
    <div className="flex w-full max-w-[600px] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          ariaLabel="Card layout"
          value={layout}
          onChange={(value) => setLayout(value as StuckCardLayout)}
          options={LAYOUTS.map(({ id, label }) => ({ value: id, label }))}
        />
        {layout === 'rows' ? <ToneBadge tone="done">The pick</ToneBadge> : null}
      </div>
      <p className="m-0 text-[13px] text-(--text-secondary)">{shown.note}</p>
      <Slot width={600}>
        <StuckCard key={layout} grant={grantOf(FAILING)} onPark={noop} layout={layout} />
      </Slot>
    </div>
  )
}

const CHAT: ChatContext = { type: 'PROJECT', projectId: 'p1' }

const STUCK_ACTION = {
  id: 'action-stuck',
  runId: 'run-1',
  kind: 'question',
  status: 'pending',
  toolName: 'askUser',
  chatContextId: getChatContextKey(CHAT),
  payload: stuckAskPayload(FAILING),
  toolArgs: { question: stuckAskPayload(FAILING).question },
  createdAt: 0,
}

const sentAnswers: unknown[] = []

const LIVE_ROUTES: FixtureRoutes = {
  '/api/v1/cli-runs/actions': () => (sentAnswers.length > 0 ? [] : [STUCK_ACTION]),
  '/api/v1/cli-runs/actions/decided': () => [],
  '/api/v1/cli-runs': () => [],
  '/api/v1/completions/turn': () => ({ active: false }),
  'POST /api/v1/cli-runs/actions/{actionId}/decide': ({ actionId }, _query, body) => {
    sentAnswers.push({ actionId, body })
    ;(window as unknown as { sentAnswers: unknown[] }).sentAnswers = sentAnswers
    return { ...STUCK_ACTION, status: 'approved' }
  },
}

/** The real chat body and grant feed on fixture answers: the card takes the composer's place. */
function LiveChat() {
  const { grants } = usePendingToolGrants(CHAT)
  const [text, setText] = useState('')
  return (
    <div className="h-[640px] w-full max-w-[640px] border border-(--border-subtle)">
      <ChatBody
        chatId={getChatContextKey(CHAT)}
        messages={[
          {
            id: 'ask',
            role: 'user',
            content: 'Run the tests and fix what fails.',
            startedAt: '2026-11-05T09:00:00.000Z',
          },
        ]}
        liveState={{ isSending: false, pendingAssistant: null, sendError: null }}
        grants={grants}
        onSend={noop}
        inputValue={text}
        onInputChange={setText}
      />
    </div>
  )
}

const attempt = (over: Partial<ProcessLedgerEntry>): ProcessLedgerEntry => ({
  id: 'impl-1',
  stepId: 'implement',
  iteration: 1,
  status: 'done',
  outcome: 'failed',
  startedAt: 0,
  agentStop: 'stuck',
  stuck: FAILING,
  model: { runner: 'api' },
  runRef: { runId: 'run-a1', agentRunId: 'agent-a1', runner: 'api' },
  ...over,
})

const STUCK_RUN: ProcessRun = {
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
  plan: {
    definitionId: 'feature-default',
    definitionScope: 'global',
    definitionVersion: 3,
    name: 'Feature',
    frozenAt: 0,
    steps: [{ id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' }],
    edges: [],
  },
  ledger: [attempt({})],
  park: {
    reason: 'step-failed',
    stepId: 'implement',
    parkedAt: 0,
    message: `Developer stopped: ${FAILING.reason}`,
    actions: ['retry', 'abandon'],
  },
} as unknown as ProcessRun

function RunPark() {
  const chip = processStepStuckView(STUCK_RUN.ledger[0])
  return (
    <MemoryRouter>
      <div className="flex w-full max-w-[640px] flex-col gap-3">
        {chip ? (
          <div className="flex items-center gap-2 text-[13.5px] font-semibold">
            Implement <CirclingChip view={chip} />
          </div>
        ) : null}
        <ParkBlock
          run={STUCK_RUN}
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

export const STUCK_SCENES: Scene[] = [
  {
    id: 'chat-stuck-card',
    title: 'Stuck card',
    component: 'StuckCard',
    group: 'Chat',
    description:
      'The host paused a turn going nowhere and asks the person what next. It takes the composer’s place as a question does, shows what the agent kept doing, and offers Continue, Give it a hint or Stop. Stop asks first. It never expires, and reads the same on every model. Rows is the pick; Buttons and Folded are on the board.',
    states: [
      {
        id: 'alternatives',
        title: 'Alternatives',
        description: 'Rows, Buttons and Folded, switched here on the real card.',
        render: () => <Alternatives />,
      },
      {
        id: 'failing',
        title: 'The same failure',
        description: 'The evidence quotes the call and the error.',
        render: () => (
          <Slot>
            <StuckCard grant={grantOf(FAILING)} onPark={noop} />
          </Slot>
        ),
      },
      {
        id: 'repeating',
        title: 'The same result',
        description: 'Calls that worked have no error line.',
        render: () => (
          <Slot>
            <StuckCard grant={grantOf(REPEATING)} onPark={noop} />
          </Slot>
        ),
      },
      {
        id: 'hint',
        title: 'Give it a hint',
        description: 'The row opens the text box. A bare “Stop” cannot go through it.',
        render: () => (
          <Slot>
            <Pressed label="Give it a hint">
              <StuckCard grant={grantOf(FAILING)} onPark={noop} />
            </Pressed>
          </Slot>
        ),
      },
      {
        id: 'stop-asked',
        title: 'Stop asks first',
        description: 'Nothing is sent until the second press; Keep it waiting goes back.',
        render: () => (
          <Slot>
            <Pressed label="End this turn here">
              <StuckCard grant={grantOf(FAILING)} onPark={noop} />
            </Pressed>
          </Slot>
        ),
      },
      {
        id: 'phone',
        title: 'At a phone’s width',
        description: 'A long call wraps inside the evidence, never past the card.',
        render: () => (
          <Slot width={358}>
            <StuckCard grant={grantOf(REPEATING)} onPark={noop} />
          </Slot>
        ),
      },
      {
        id: 'live',
        title: 'Real chat body on fixtures',
        description:
          'ChatBody and usePendingToolGrants on fixture answers: the card takes the composer’s place, and the answer goes to the decide route.',
        render: () => (
          <OnFixtures routes={LIVE_ROUTES}>
            <FilesProvider>
              <LiveChat />
            </FilesProvider>
          </OnFixtures>
        ),
      },
    ],
    controls: [
      {
        id: 'layout',
        label: 'Layout',
        kind: 'choice',
        options: LAYOUTS.map(({ id, label }) => ({ id, label })),
        default: 'rows',
      },
    ],
    presets: LAYOUTS.map(({ id, label }) => ({ id, name: label, values: { layout: id } })),
    play: (values) => (
      <Slot>
        <StuckCard
          key={values.layout}
          grant={grantOf(FAILING)}
          onPark={noop}
          layout={(values.layout ?? 'rows') as StuckCardLayout}
        />
      </Slot>
    ),
  },
  {
    id: 'run-step-stuck',
    title: 'A step the host stopped',
    component: 'ParkBlock (ProcessPipeline) · CirclingNotice · CirclingChip',
    group: 'Process',
    description:
      'With nobody to ask, the host stops a step repeating itself. The step’s row carries a Stuck chip and the stop shows the evidence from its ledger entry, in the same display as going in circles.',
    states: [
      {
        id: 'evidence',
        title: 'Evidence on the run page',
        description: `The chip on the row and the notice at the stop. ${processParkStuckView(STUCK_RUN)?.headline ?? ''}`,
        render: () => <RunPark />,
      },
    ],
    play: () => <RunPark />,
  },
]
