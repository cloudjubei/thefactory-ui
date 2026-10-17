import type { ReactNode } from 'react'
import type { ProcessLedgerEntry, ProcessRun } from 'thefactory-tools/types'
import {
  FeatureCard,
  MessageList,
  RunAgentButton,
  type ChatMessageLike,
  type StoryStatus,
} from 'thefactory-ui/web'
import { getChatContextKey } from 'thefactory-tools/utils'
import {
  AppSettingsProvider,
  featureProcessOverlay,
  isFeatureInLiveRun,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
// Not on the package's public surface: the pipeline opens the panel itself. The showcase reaches
// into the source for its view, as the playground renders the library from source anyway.
import { StepSidePanelView } from '../../src/web/compound/process/pipeline/StepSidePanel'
import type { Scene } from '../showcase/types'

const noop = () => {}
const NOW = 1_000

const MEMORY: SyncKVStorage = { get: () => null, set: noop }

const FEATURES = [
  { id: 'f1', title: 'Faction cards in the army builder', status: 'in_progress' as StoryStatus },
  { id: 'f2', title: 'Points total per faction', status: 'pending' as StoryStatus },
  { id: 'f3', title: 'Export an army list', status: 'pending' as StoryStatus },
]

const PLAN: ProcessRun['plan'] = {
  definitionId: 'story',
  definitionScope: 'global',
  definitionVersion: 1,
  name: 'Story',
  steps: [
    {
      id: 'features:f1',
      name: 'Faction cards in the army builder',
      kind: 'process',
      subject: { kind: 'feature', id: 'f1', title: 'Faction cards in the army builder' },
    },
    {
      id: 'features:f2',
      name: 'Points total per faction',
      kind: 'process',
      subject: { kind: 'feature', id: 'f2', title: 'Points total per faction' },
    },
    { id: 'walkthrough', name: 'Walkthrough', kind: 'agent', agentType: 'verifier' },
    { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
  ],
  loops: [],
  frozenAt: 0,
}

const storyRun = (over: Partial<ProcessRun>): ProcessRun => ({
  id: 'run-story',
  projectId: 'p1',
  storyId: 's1',
  title: 'Army builder',
  status: 'running',
  loopCounts: {},
  ledger: [],
  startedAt: 0,
  updatedAt: 0,
  plan: PLAN,
  ...over,
})

const ON_FIRST_FEATURE = storyRun({ cursor: { stepId: 'features:f1', iteration: 1 } })

const MANAGER_ON_SECOND_FEATURE = storyRun({
  status: 'parked',
  park: { reason: 'step-failed', message: 'Verify failed', parkedAt: 500 },
  cursor: { stepId: 'features:f2', iteration: 1 },
  manager: {
    turn: { runId: 'm1', parkedAt: 500, signature: 's', startedAt: 900, chatContextId: 'c' },
  },
})

const AT_SIGN_OFF = storyRun({
  status: 'parked',
  park: { reason: 'gate', message: 'Ready for sign-off', parkedAt: 500 },
  cursor: { stepId: 'sign-off', iteration: 1 },
})

/** The feature's chip as the apps draw it (`ProcessStatusChip` with a `featureId`). */
function FeatureChip({ run, featureId }: { run: ProcessRun; featureId: string }) {
  const overlay = featureProcessOverlay(run, featureId, NOW)
  if (!overlay) return null
  return (
    <button
      type="button"
      className={`badge badge--soft badge--${overlay.semantic}`}
      title={overlay.title}
    >
      {overlay.semantic === 'review' ? 'Go to Review →' : `${overlay.label} →`}
    </button>
  )
}

/** The story's features as cards, each with its chip while the run is acting on it. */
/**
 * The story's features as cards, as `FeatureCardConnected` draws them with Run offered: the chip
 * while the run is acting on the feature, no Run while the live run carries it, Run otherwise.
 */
function FeatureCards({ run, only }: { run: ProcessRun; only?: string[] }) {
  return (
    <div className="flex max-w-[560px] flex-col gap-3">
      {FEATURES.filter((f) => only === undefined || only.includes(f.id)).map((feature) => {
        const chip = featureProcessOverlay(run, feature.id, NOW) !== undefined
        return (
          <FeatureCard
            key={feature.id}
            feature={feature}
            headerLeft={<span className="id-chip">{`1.${feature.id.slice(1)}`}</span>}
            actions={
              chip ? (
                <FeatureChip run={run} featureId={feature.id} />
              ) : isFeatureInLiveRun(run, feature.id) ? undefined : (
                <RunAgentButton onClick={noop} />
              )
            }
            pinActions={chip}
          />
        )
      })}
    </div>
  )
}

const AGENT_CHAT = getChatContextKey({
  type: 'AGENT_RUN_FEATURE',
  projectId: 'p1',
  storyId: 's1',
  featureId: 'f1',
  agentRunId: 'agent-1',
})

const SYSTEM_PROMPT: ChatMessageLike = {
  role: 'system',
  content: 'Current Story Context: Army builder — Faction cards in the army builder.',
}

const TRANSCRIPT: ChatMessageLike[] = [
  SYSTEM_PROMPT,
  {
    id: 'a1',
    role: 'assistant',
    content: 'Added `FactionCard` and wired it into the builder grid; the faction tests pass.',
  },
]

/** A chat's message list as `ChatBody` lays it out, `transcript` for an agent run's chat. */
function Messages({ messages, transcript }: { messages: ChatMessageLike[]; transcript: boolean }) {
  return (
    <AppSettingsProvider storage={MEMORY}>
      <div className="flex h-[360px] min-h-0 flex-col bg-(--surface-base)">
        <MessageList
          chatId={transcript ? AGENT_CHAT : 'general_1'}
          messages={messages}
          transcript={transcript}
        />
      </div>
    </AppSettingsProvider>
  )
}

const implementEntry = (over: Partial<ProcessLedgerEntry>): ProcessLedgerEntry => ({
  id: 'e1',
  stepId: 'implement',
  iteration: 1,
  status: 'done',
  startedAt: 0,
  endedAt: 10,
  runRef: { runId: 'run-feature', agentRunId: 'agent-1', chatContextId: AGENT_CHAT },
  ...over,
})

const featureRun = (entry: ProcessLedgerEntry): ProcessRun => ({
  id: 'run-feature',
  projectId: 'p1',
  storyId: 's1',
  featureId: 'f1',
  parentRunId: 'run-story',
  title: 'Faction cards in the army builder',
  status: 'parked',
  park: { reason: 'step-errored', message: entry.summary ?? '', parkedAt: 10 },
  cursor: { stepId: 'implement', iteration: 1 },
  loopCounts: {},
  ledger: [entry],
  startedAt: 0,
  updatedAt: 10,
  plan: {
    definitionId: 'feature',
    definitionScope: 'global',
    definitionVersion: 1,
    name: 'Feature',
    steps: [{ id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' }],
    loops: [],
    frozenAt: 0,
  },
})

const NEVER_STARTED = featureRun(
  implementEntry({
    outcome: 'errored',
    summary: 'Stopped before the agent started: the feature has no acceptance criteria',
    agentNotStarted: 'the feature has no acceptance criteria',
  }),
)

const STARTED = featureRun(
  implementEntry({ outcome: 'errored', summary: 'The agent stopped: the build failed' }),
)

/** The step panel over its pipeline column, the agent's chat drawn by the host's `renderAgentRun`. */
function StepPanel({ run }: { run: ProcessRun }): ReactNode {
  return (
    <div className="relative h-[480px] max-w-[760px] overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-base)">
      <StepSidePanelView
        run={run}
        target={{ runId: run.id, stepId: 'implement' }}
        onClose={noop}
        onOpenAgentRun={noop}
        renderAgentRun={() => <Messages messages={TRANSCRIPT} transcript />}
      />
    </div>
  )
}

export const PROCESS_FEATURE_SCENES: Scene[] = [
  {
    id: 'feature-process-chip',
    title: 'Feature process chip',
    component: 'FeatureCard + featureProcessOverlay',
    group: 'Process',
    description:
      "A feature shows the story run's chip only while the run is acting on it: its own step, or a story-level step acting on every feature.",
    states: [
      {
        id: 'feature-working',
        title: 'Feature being worked',
        description:
          'The run is on the first feature’s step: it reads Working; the next is queued.',
        render: () => <FeatureCards run={ON_FIRST_FEATURE} only={['f1', 'f2']} />,
      },
      {
        id: 'feature-queued',
        title: 'Queued feature',
        description:
          'A feature the run has not reached yet keeps its stored status: no chip, and no Run.',
        render: () => <FeatureCards run={ON_FIRST_FEATURE} only={['f2']} />,
      },
      {
        id: 'manager-on-it',
        title: 'Manager on it',
        description: 'The run stopped on the second feature and its agent manager is on it.',
        render: () => <FeatureCards run={MANAGER_ON_SECOND_FEATURE} only={['f1', 'f2']} />,
      },
      {
        id: 'story-step',
        title: 'Story-level step',
        description: 'At the sign-off gate the run acts on every feature, so each shows it.',
        render: () => <FeatureCards run={AT_SIGN_OFF} only={['f1', 'f2']} />,
      },
      {
        id: 'not-in-run',
        title: 'Feature not in the run',
        description: 'A feature the live run does not carry keeps its own Run (hover to see it).',
        render: () => <FeatureCards run={ON_FIRST_FEATURE} only={['f3']} />,
      },
      {
        id: 'queued-and-outside',
        title: 'Queued beside one outside the run',
        description:
          'The queued feature offers no Run — the run covers it; the one outside the run still does.',
        render: () => <FeatureCards run={ON_FIRST_FEATURE} only={['f2', 'f3']} />,
      },
    ],
  },
  {
    id: 'step-side-panel',
    title: 'Step side panel',
    component: 'StepSidePanel',
    group: 'Process',
    description: "One step's output over the pipeline, with its agent's transcript.",
    states: [
      {
        id: 'agent-started',
        title: 'Agent transcript',
        description: 'An agent step whose agent ran: the panel shows its transcript.',
        render: () => <StepPanel run={STARTED} />,
      },
      {
        id: 'agent-never-started',
        title: 'Agent never started',
        description:
          'The host stopped the attempt before the agent’s first turn: no chat, the reason.',
        render: () => <StepPanel run={NEVER_STARTED} />,
      },
    ],
  },
  {
    id: 'chat-empty-state',
    title: 'Chat empty state',
    component: 'MessageList',
    group: 'Chat',
    description: "A chat with no messages: a person's chat invites one; an agent run's says so.",
    states: [
      {
        id: 'person-chat',
        title: 'Person chat',
        render: () => <Messages messages={[]} transcript={false} />,
      },
      {
        id: 'no-transcript-yet',
        title: 'Agent run, no transcript yet',
        description: 'An agent run whose chat has nothing yet, under its system prompt.',
        render: () => <Messages messages={[SYSTEM_PROMPT]} transcript />,
      },
    ],
  },
]
