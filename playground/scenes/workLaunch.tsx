import type { ReactNode } from 'react'
import type { FeatureRequest } from 'thefactory-tools/types'
import {
  featureWorkAskView,
  launchSuggestionRows,
  workLaunchOptions,
  type LaunchSuggestionRow,
} from 'thefactory-ui/headless'
import {
  IncomingFeatureRequestCard,
  LaunchSuggestionPanel,
  WorkLaunchChooser,
} from 'thefactory-ui/web'
import type { Scene } from '../showcase/types'
import ApprovalPanel from '../../src/web/compound/chat/ApprovalPanel'
import ToolAskCard from '../../src/web/compound/chat/ToolAskCard'
import { upsertFeatureRequest } from '../../src/headless/hooks/featureRequestsStore'
import type { PendingToolGrant } from '../../src/headless/utils/chatTypes'

const noop = () => {}

const ROWS: LaunchSuggestionRow[] = launchSuggestionRows({
  featureProcessId: {
    value: 'feature-self-verified',
    reason: 'Two small features in one module — one agent can build and prove each.',
  },
  proofKinds: {
    value: ['unit-tests', 'checks'],
    reason: 'Pure logic with no screen change; tests and checks show it.',
  },
  codeReview: { value: true, reason: 'It changes how runs are billed — worth a second look.' },
  turnLimit: {
    value: { limitTurns: true, maxTurns: 40 },
    reason: 'Small change; 40 turns per step is plenty.',
  },
  baseBranch: { value: 'dev', reason: 'The project’s usual branch for new work.' },
})

const PENDING: FeatureRequest = {
  id: '7b3e91c4-2d5a-4f8e-b061-9c4d2e7a1f30',
  title: 'Report spend per process run',
  summary: 'Show what each process run cost, split by step, on its page.',
  doneWhen: [{ text: 'A run’s page shows its spend per step' }],
  targetProjectId: 'thefactory-tools',
  requestedBy: {
    fromProjectId: 'thefactory-backend',
    fromChatContext: { type: 'PROJECT', projectId: 'thefactory-backend' },
  },
  acceptance: 'manual',
  status: 'pending',
  createdAt: '2026-10-18T09:00:00.000Z',
  updatedAt: '2026-10-18T09:00:00.000Z',
}

const column = (node: ReactNode) => <div className="w-[480px] max-w-full">{node}</div>

upsertFeatureRequest(PENDING)

/** The ask an agent's `acceptProjectFeatureRequest` raises, proposing a way to start the work. */
function acceptGrant(mode: 'process' | 'chat'): PendingToolGrant {
  const args = { id: PENDING.id, mode, reason: 'Small and self-contained.' }
  return {
    id: `grant-accept-${mode}`,
    chatRunner: 'api',
    label: 'acceptProjectFeatureRequest',
    toolName: 'acceptProjectFeatureRequest',
    args,
    alwaysAllowScopes: [],
    grantCovers: 'exact-call',
    detail: { tool: 'acceptProjectFeatureRequest', args },
    decide: () => new Promise<void>(noop),
  }
}

function AcceptDock({ mode }: { mode: 'process' | 'chat' }) {
  return (
    <div className="max-w-2xl rounded-xl border border-(--border-subtle) bg-(--surface-base)">
      <ApprovalPanel grant={acceptGrant(mode)} onDecideLater={noop} />
    </div>
  )
}

function Incoming({
  request,
  choosing,
  startWork,
}: {
  request: FeatureRequest
  choosing?: boolean
  startWork?: boolean
}) {
  return (
    <div className="max-w-2xl">
      <IncomingFeatureRequestCard
        request={request}
        fromLabel="thefactory-backend"
        defaultMode="process"
        onAccept={noop}
        onReject={noop}
        onStartWork={startWork ? noop : undefined}
        onOpenFull={noop}
        initialChoosing={choosing}
        placedOn={
          request.handling?.storyId ? { label: '#31 Spend per run', onOpen: noop } : undefined
        }
      />
    </div>
  )
}

function StartWorkCard({ mode }: { mode: 'process' | 'chat' }) {
  const view = featureWorkAskView({ storyTitle: 'Spend per run', joinsOpenRun: false, mode })
  return (
    <div className="max-w-2xl rounded-xl border border-(--border-subtle) bg-(--surface-base) p-3">
      <ToolAskCard view={view} busy={false} onApprove={noop} onDeny={noop} onLater={noop} />
    </div>
  )
}

export const WORK_LAUNCH_SCENES: Scene[] = [
  {
    id: 'work-launch-card-mode',
    title: 'Start work card — the way picked',
    component: 'ToolAskCard',
    group: 'Process',
    description:
      'The startFeatureWork card names where the work happens for the way it is set to: a process run is tagged Isolated copy and says it works in its own copy; switched to In this chat, the tag goes and it says the chat’s agent works here. Approve starts it the way the card shows.',
    states: [
      {
        id: 'process',
        title: 'Process run',
        description: 'The look-alike base: the card set to a process run.',
        render: () => <StartWorkCard mode="process" />,
      },
      {
        id: 'chat',
        title: 'In this chat',
        description: 'Paired with Process run: the same card switched to In this chat.',
        render: () => <StartWorkCard mode="chat" />,
      },
    ],
  },
  {
    id: 'work-launch-choice',
    title: 'Start work — the choice',
    component: 'WorkLaunchChooser',
    group: 'Process',
    description:
      'The one choice every start makes — a story’s or a feature’s Run, accepting a feature request, starting its work again: a process run, or in this chat. The way the project last went is picked first.',
    states: [
      {
        id: 'process-first',
        title: 'Process run picked first',
        description: 'A project that last started work as a process run, or never started any.',
        render: () =>
          column(
            <WorkLaunchChooser
              options={workLaunchOptions(undefined)}
              onChoose={noop}
              onCancel={noop}
            />,
          ),
      },
      {
        id: 'chat-first',
        title: 'In this chat picked first',
        description: 'Paired with Process run picked first: the project last worked in a chat.',
        render: () =>
          column(
            <WorkLaunchChooser
              options={workLaunchOptions({ workLaunchMode: 'chat' })}
              onChoose={noop}
              onCancel={noop}
            />,
          ),
      },
      {
        id: 'starting',
        title: 'Starting',
        description:
          'Paired with Process run picked first: the choice waits while the work starts.',
        render: () =>
          column(
            <WorkLaunchChooser
              options={workLaunchOptions(undefined)}
              onChoose={noop}
              onCancel={noop}
              busy
            />,
          ),
      },
    ],
  },
  {
    id: 'work-launch-request',
    title: 'Feature request — Accept & start work',
    component: 'IncomingFeatureRequestCard',
    group: 'Process',
    description:
      'Accepting a feature request makes the same choice. A process run opens its launch card on the placed story; until it is confirmed the request offers Start work.',
    states: [
      {
        id: 'pending',
        title: 'Waiting for a decision',
        description: 'The look-alike base: the request before anyone decided.',
        render: () => <Incoming request={PENDING} />,
      },
      {
        id: 'choosing',
        title: 'Accept — the choice open',
        description: 'Paired with Waiting for a decision: Accept & start work asks how.',
        render: () => <Incoming request={PENDING} choosing />,
      },
      {
        id: 'waiting-to-start',
        title: 'Accepted — work not started',
        description:
          'Accepted for a process run whose launch card was closed: Start work offers the choice again.',
        render: () => (
          <Incoming
            request={{
              ...PENDING,
              status: 'accepted',
              handling: { storyId: 's31', featureIds: ['f1'] },
            }}
            startWork
          />
        ),
      },
    ],
  },
  {
    id: 'work-launch-accept-ask',
    title: 'Agent accepts a feature request — the choice',
    component: 'ApprovalPanel',
    group: 'Process',
    description:
      'An agent asks to accept a request sent to this project. Its card offers the same choice as every start — a process run, or in this chat — starting on the way the agent proposed; Accept starts the work the way picked.',
    states: [
      {
        id: 'process',
        title: 'Agent proposed a process run',
        description: 'The look-alike base: the card on the way the agent proposed.',
        render: () => <AcceptDock mode="process" />,
      },
      {
        id: 'chat',
        title: 'Agent proposed this chat',
        description: 'Paired with Agent proposed a process run: the other way picked.',
        render: () => <AcceptDock mode="chat" />,
      },
    ],
  },
  {
    id: 'launch-suggestion',
    title: 'Launch card — Suggest setup',
    component: 'LaunchSuggestionPanel',
    group: 'Process',
    description:
      'On a process run’s launch card, the agent the launch runs on — the CLI picked, or the API model — looks the story over in one short turn and proposes the setup, each setting with why. Use these sets the card; nothing launches until the person does.',
    states: [
      {
        id: 'ask',
        title: 'Ready to ask',
        description: 'The look-alike base: the action, before asking.',
        render: () =>
          column(<LaunchSuggestionPanel rows={[]} onAsk={noop} onApply={noop} onDismiss={noop} />),
      },
      {
        id: 'busy',
        title: 'Looking at the work',
        description: 'Paired with Ready to ask: the agent is looking.',
        render: () =>
          column(
            <LaunchSuggestionPanel rows={[]} busy onAsk={noop} onApply={noop} onDismiss={noop} />,
          ),
      },
      {
        id: 'suggested',
        title: 'Suggested',
        description: 'Paired with Ready to ask: each setting with why, to use or dismiss.',
        render: () =>
          column(
            <LaunchSuggestionPanel
              rows={ROWS}
              answeredBy="claude-fable-5"
              onAsk={noop}
              onApply={noop}
              onDismiss={noop}
            />,
          ),
      },
      {
        id: 'failed',
        title: 'Nothing suggested',
        description: 'Paired with Ready to ask: why no setup came back, the action still offered.',
        render: () =>
          column(
            <LaunchSuggestionPanel
              rows={[]}
              error="The agent did not answer with a JSON object."
              onAsk={noop}
              onApply={noop}
              onDismiss={noop}
            />,
          ),
      },
      {
        id: 'cli-signed-out',
        title: 'CLI signed out',
        description:
          'Paired with Nothing suggested: the launch runs on a CLI that cannot answer, and the card says why — no other model answers instead.',
        render: () =>
          column(
            <LaunchSuggestionPanel
              rows={[]}
              error="Claude Code's login has expired or was revoked — re-authorize it in Settings → CLI Agents, then try again."
              onAsk={noop}
              onApply={noop}
              onDismiss={noop}
            />,
          ),
      },
      {
        id: 'suggested-cli',
        title: 'Suggested by a CLI',
        description: 'Paired with Suggested: the CLI and model the launch runs on answered.',
        render: () =>
          column(
            <LaunchSuggestionPanel
              rows={ROWS}
              answeredBy="claude-code · opus"
              onAsk={noop}
              onApply={noop}
              onDismiss={noop}
            />,
          ),
      },
    ],
  },
]
