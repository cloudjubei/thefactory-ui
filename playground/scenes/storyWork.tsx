import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { processWaitingOnBlockersMessage } from 'thefactory-tools/constants'
import type { Feature, ProcessRun, ReferenceTarget } from 'thefactory-tools/types'
import {
  FEATURE_KIND_HINTS,
  FEATURE_KIND_OPTIONS,
  featureWorkAskView,
  ReferenceRenderingContext,
  type ReferenceRendering,
  type FeatureKind,
  type PendingToolGrant,
} from 'thefactory-ui/headless'
import {
  DependencyBulletBase,
  FeatureCard,
  FeatureKindChip,
  SegmentedControl,
  type StoryStatus,
} from 'thefactory-ui/web'
// Not on the package's public surface: the pipeline and the chat dock draw these themselves. The
// showcase reaches into the source for them, as the playground renders the library from source.
import ApprovalPanel from '../../src/web/compound/chat/ApprovalPanel'
import ToolAskCard from '../../src/web/compound/chat/ToolAskCard'
import { ParkBlock, RunHead } from '../../src/web/compound/process/ProcessPipeline'
import type { Scene } from '../showcase/types'

const noop = () => {}
const resolved = async () => {}

const STORY_ID = '30782ee5-6b1d-4c1e-9a52-0d1f7e3b9c64'
const BLOCKING_STORY_ID = '6c7c9075-2f0a-4b8e-8c3d-51e9a7b4d210'
const DESIGN_FEATURE_ID = '98086351-4d2c-4f3a-b6e1-7a90c5d8e2f4'

type CardFeature = {
  id: string
  title: string
  description: string
  status: StoryStatus
  kind?: Feature['kind']
}

const CODE_FEATURE: CardFeature = {
  id: 'f2',
  title: 'Hot-seat turn handover',
  description: 'Pass the device between players without revealing the last move.',
  status: 'pending',
}

const DESIGN_FEATURE: CardFeature = {
  id: DESIGN_FEATURE_ID,
  title: 'Hot-seat handover screen',
  description: 'How the cover screen between two players looks, light and dark.',
  status: 'pending',
  kind: 'design',
}

/** The stories and features the scene's text names, as the app's chips resolve them. */
const NAMED: Record<string, { display: string; title: string; status: StoryStatus }> = {
  [BLOCKING_STORY_ID]: { display: '18', title: 'Turn engine', status: 'in_progress' },
  [STORY_ID]: { display: '21', title: 'Phase 6b — hot-seat play', status: 'blocked' },
  [`${STORY_ID}.${DESIGN_FEATURE_ID}`]: {
    display: '21.1',
    title: 'Hot-seat handover screen',
    status: 'blocked',
  },
}

/** What the app provides for the project in view: ids in text drawn as dependency chips. */
const REFERENCES: ReferenceRendering = {
  renderReference: (target: ReferenceTarget) => {
    if (target.type !== 'reference') return undefined
    const { reference } = target
    if (reference.kind !== 'story' && reference.kind !== 'feature') return undefined
    const key =
      reference.kind === 'feature'
        ? `${reference.storyId}.${reference.featureId}`
        : reference.storyId
    const named = NAMED[key]
    if (!named) return undefined
    const card = { id: key, title: named.title, status: named.status }
    return (
      <DependencyBulletBase
        interactive={false}
        resolved={
          reference.kind === 'feature'
            ? {
                kind: 'feature',
                display: named.display,
                storyId: reference.storyId,
                featureId: reference.featureId,
                feature: card,
              }
            : { kind: 'story', display: named.display, storyId: reference.storyId, story: card }
        }
      />
    )
  },
}

const withReferences = (node: ReactNode) => (
  <ReferenceRenderingContext.Provider value={REFERENCES}>{node}</ReferenceRenderingContext.Provider>
)

const column = (node: ReactNode) => <div className="w-[420px] max-w-full">{node}</div>

/** The feature editor's kind field, drawn as web and desktop draw it. */
function KindField({ kind }: { kind: FeatureKind }) {
  return column(
    <div className="flex flex-col gap-1">
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        Kind
      </span>
      <SegmentedControl
        options={[...FEATURE_KIND_OPTIONS]}
        value={kind}
        onChange={noop}
        size="sm"
        ariaLabel="Feature kind"
        className="self-start"
      />
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {FEATURE_KIND_HINTS[kind]}
      </div>
    </div>,
  )
}

/** A story feature row's title, with its kind chip, as the story's feature list draws it. */
function RowTitle({ feature }: { feature: CardFeature }) {
  return column(
    <div className="flex items-center gap-2 min-w-0 border-b border-(--border-subtle) px-3 py-2.5">
      <span className="text-sm font-medium text-(--text-primary) truncate">{feature.title}</span>
      <FeatureKindChip feature={feature} />
    </div>,
  )
}

/** Run 53fe8274 as it is now: launched from the story's chat, its story blocked by #18. */
function storyRun(over: Partial<ProcessRun> = {}): ProcessRun {
  return {
    id: '53fe8274-536b-41e1-8803-f51f94a79d70',
    projectId: 'wargames',
    storyId: STORY_ID,
    title: 'Phase 6b — hot-seat play',
    input: { runner: 'cli' },
    status: 'parked',
    loopCounts: {},
    startedAt: 0,
    updatedAt: 0,
    plan: {
      definitionId: 'story-default',
      definitionScope: 'global',
      definitionVersion: 4,
      name: 'Story',
      frozenAt: 0,
      steps: [
        {
          id: `features:${DESIGN_FEATURE_ID}`,
          name: 'Hot-seat handover screen',
          kind: 'process',
          processId: 'feature-design',
          subject: {
            kind: 'feature',
            id: DESIGN_FEATURE_ID,
            title: 'Hot-seat handover screen',
            work: 'design',
          },
        },
        { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
      ],
      loops: [],
    },
    ledger: [],
    park: {
      reason: 'waiting-on-blockers',
      stepId: `features:${DESIGN_FEATURE_ID}`,
      message: processWaitingOnBlockersMessage('Hot-seat handover screen', [BLOCKING_STORY_ID]),
      parkedAt: 0,
      waitingOn: [BLOCKING_STORY_ID],
    },
    ...over,
  }
}

/** The feature's own design run, stopped at its design approval. */
const DESIGN_RUN: ProcessRun = {
  id: 'a7c2e914-0b3d-4f5e-9d68-2c1b7e4f0a93',
  projectId: 'wargames',
  storyId: STORY_ID,
  parentRunId: '53fe8274-536b-41e1-8803-f51f94a79d70',
  title: 'Hot-seat handover screen',
  input: { runner: 'cli' },
  status: 'parked',
  loopCounts: {},
  startedAt: 0,
  updatedAt: 0,
  plan: {
    definitionId: 'feature-design',
    definitionScope: 'global',
    definitionVersion: 1,
    name: 'Feature design',
    frozenAt: 0,
    steps: [
      { id: 'design', name: 'Design', kind: 'agent', agentType: 'designer' },
      { id: 'design-approval', name: 'Design approval', kind: 'gate', gateKind: 'design' },
      { id: 'report', name: 'Report', kind: 'report' },
    ],
    loops: [
      {
        id: 'design-changes',
        from: 'design-approval',
        to: 'design',
        when: ['failed'],
        maxIterations: 5,
      },
    ],
  },
  ledger: [
    {
      id: 'design-1',
      stepId: 'design',
      iteration: 1,
      status: 'done',
      outcome: 'passed',
      startedAt: 0,
    },
  ],
  park: {
    reason: 'gate',
    stepId: 'design-approval',
    message: 'The design is filed as a proposal in the Design view.',
    parkedAt: 1,
  },
}

/** The run without its story, whose chip in the header reads the app's stories — not drawn here. */
function storyRunWithoutStoryChip(): ProcessRun {
  const { storyId: _storyId, ...run } = storyRun()
  return run
}

const frame = (node: ReactNode) => (
  <MemoryRouter>
    <div className="max-w-[720px] p-4">{node}</div>
  </MemoryRouter>
)

const park = (run: ProcessRun) =>
  withReferences(
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
    ),
  )

const head = (run: ProcessRun) => (
  <MemoryRouter>
    <div className="max-w-[720px] overflow-hidden rounded-lg border border-(--border-subtle)">
      <RunHead
        run={run}
        stopHolder={undefined}
        depth={0}
        now={1}
        projectName="WarGames"
        onCrumb={noop}
        onCancel={noop}
        onDelete={noop}
      />
    </div>
  </MemoryRouter>
)

function grant(toolName: string, args: Record<string, unknown>): PendingToolGrant {
  return {
    id: `grant-${toolName}`,
    chatRunner: 'cli',
    label: toolName,
    toolName,
    args,
    alwaysAllowScopes: [],
    grantCovers: 'exact-call',
    decide: () => new Promise<void>(noop),
  }
}

const MARK_DONE = grant('setFeatureStatus', {
  storyId: STORY_ID,
  featureId: DESIGN_FEATURE_ID,
  status: 'done',
  reason: 'You said the handover screen is finished and approved it here.',
})

const REMOVE_BLOCKER = grant('removeBlocker', {
  storyId: STORY_ID,
  featureId: DESIGN_FEATURE_ID,
  blocker: BLOCKING_STORY_ID,
  reason: 'You said the handover screen no longer needs the turn engine.',
})

function Dock({ children }: { children: ReactNode }) {
  return withReferences(
    <div className="max-w-2xl rounded-xl border border-(--border-subtle) bg-(--surface-base)">
      {children}
    </div>,
  )
}

const LAUNCH_WAITING = featureWorkAskView({
  storyTitle: 'Phase 6b — hot-seat play',
  joinsOpenRun: false,
  waitingOn: [BLOCKING_STORY_ID],
})

export const STORY_WORK_SCENES: Scene[] = [
  {
    id: 'feature-kind',
    title: 'Design or code feature',
    component: 'FeatureKindChip, FeatureCard, SegmentedControl (feature editor)',
    group: 'Process',
    description:
      'A feature is code unless it is marked design. A design feature is worked by a designer, who files drafts as a proposal in the Design view; the person approves it there. The editor switches the kind, and a design feature carries a “Design” chip wherever it is listed — a code feature carries none.',
    states: [
      {
        id: 'editor-code',
        title: 'Editor — code',
        description: 'The default. A developer builds it.',
        render: () => <KindField kind="code" />,
      },
      {
        id: 'editor-design',
        title: 'Editor — design',
        description: 'Switched to design: the hint says who works it and where it is approved.',
        render: () => <KindField kind="design" />,
      },
      {
        id: 'row-code',
        title: 'Story row — code feature',
        description: 'No chip: code is what a feature is unless marked.',
        render: () => <RowTitle feature={CODE_FEATURE} />,
      },
      {
        id: 'row-design',
        title: 'Story row — design feature',
        description: 'The “Design” chip after the title.',
        render: () => <RowTitle feature={DESIGN_FEATURE} />,
      },
      {
        id: 'card-design',
        title: 'Feature card — design feature',
        description: 'The card in a chat’s tool results, the chip beside its status.',
        render: () => column(<FeatureCard feature={DESIGN_FEATURE} />),
      },
    ],
  },
  {
    id: 'run-waiting-on-blockers',
    title: 'Run waiting on blockers',
    component: 'RunHead, ParkBlock (ProcessPipeline)',
    group: 'Process',
    description:
      'A story run launched while its work is blocked elsewhere (run 53fe8274, its story blocked by #18) does not fail: it waits, and starts by itself once the blocking work is done. Waiting is not a stop the person must act on, and is not counted as needing them; it can still be stopped or closed.',
    states: [
      {
        id: 'head',
        title: 'Run header',
        description: 'The “Waiting” badge, in the neutral tone of queued work.',
        render: () => head(storyRunWithoutStoryChip()),
      },
      {
        id: 'stop',
        title: 'Its stop',
        description:
          'What it waits on, as a chip, and that it starts by itself; it offers only ways to end it.',
        render: () => park(storyRun()),
      },
    ],
  },
  {
    id: 'design-approval-gate',
    title: 'Design approval',
    component: 'ParkBlock (ProcessPipeline)',
    group: 'Process',
    description:
      'A design feature’s run stops at its design approval once the designer has filed the proposal. Accepting the proposal in the Design view approves it; sending it back there returns the design to the designer with the note. The same decision is offered on the run.',
    states: [
      {
        id: 'choices',
        title: 'Approve or send back',
        description: '“Approve the design” leads; “Send back for changes” takes a note.',
        render: () => park(DESIGN_RUN),
      },
    ],
  },
  {
    id: 'story-decision-asks',
    title: 'Story decisions from chat',
    component: 'ApprovalPanel, ToolAskCard',
    group: 'Chat',
    description:
      'A chat agent may mark a feature done or lift a blocker only with the person’s approval — always asked, never allowed for good. A launch whose story is blocked says what it waits on and that it starts by itself.',
    states: [
      {
        id: 'mark-done',
        title: 'Mark a feature done',
        render: () => (
          <Dock>
            <ApprovalPanel grant={MARK_DONE} onDecideLater={noop} />
          </Dock>
        ),
      },
      {
        id: 'remove-blocker',
        title: 'Lift a blocker',
        render: () => (
          <Dock>
            <ApprovalPanel grant={REMOVE_BLOCKER} onDecideLater={noop} />
          </Dock>
        ),
      },
      {
        id: 'launch-waits',
        title: 'Start work that waits on a blocker',
        description: 'The launch card names the blocking work; the run waits for it.',
        render: () => (
          <Dock>
            <div className="m-3">
              <ToolAskCard
                view={LAUNCH_WAITING}
                busy={false}
                onApprove={noop}
                onDeny={noop}
                onLater={noop}
              />
            </div>
          </Dock>
        ),
      },
    ],
  },
]
