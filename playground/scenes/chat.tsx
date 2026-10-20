import type { ReactNode } from 'react'
import {
  MessageRow,
  ThinkingRow,
  ToolCallCard,
  type ChatMessageLike,
  type ToolCallCardProps,
} from 'thefactory-ui/web'
import { toolAskCardView, type PendingToolGrant } from 'thefactory-ui/headless'
// Not on the package's public surface: the chat renders them itself. The showcase reaches into
// the source for them, as the playground renders the library from source anyway.
import ApprovalPanel from '../../src/web/compound/chat/ApprovalPanel'
import ApprovalStack from '../../src/web/compound/chat/ApprovalStack'
import ToolAskCard from '../../src/web/compound/chat/ToolAskCard'
import type { CliRunStatus } from '../../src/headless/api/generated'
import { describeCliRunActivity, isCliRunWorking } from '../../src/headless/utils/cliRunActivity'
import { withCliRunFailure } from '../../src/headless/utils/cliRunner'
import { RUN_STOPPED_REASON } from '../../src/headless/utils/cliRunnerConstants'
import type { Scene } from '../showcase/types'

const noop = () => {}

// ---------------------------------------------------------------------------------------------
// Message bubbles

type Msg = ChatMessageLike & { showModel?: boolean }

/** Rows as the chat lays them out. No timestamps: they are relative to now. */
function Conversation({ messages }: { messages: Msg[] }) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg, i) => (
        <MessageRow
          key={msg.id ?? i}
          msg={msg}
          globalIndex={i}
          totalMessages={messages.length}
          isThinking={false}
          isLast={i === messages.length - 1}
          // Every user bubble counts as already seen, so none plays its arrival animation.
          prevUserMessagesLen={messages.length}
          enhancedTotalLength={messages.length}
        />
      ))}
    </div>
  )
}

const USER: Msg = {
  id: 'u1',
  role: 'user',
  content: 'Can the playground show every state of the approval card at its own URL?',
}

const ASSISTANT: Msg = {
  id: 'a1',
  role: 'assistant',
  content: [
    'Yes — each scene names a component and lists its states:',
    '',
    '1. **Index** — every scene and state as links',
    '2. **State URL** — `/?scene=<id>&state=<state>` renders just that state',
    '',
    '```ts',
    "sceneHref('approval-panel', 'install-package')",
    '```',
  ].join('\n'),
}

const ASSISTANT_WITH_MODEL: Msg = {
  ...ASSISTANT,
  id: 'a2',
  showModel: true,
  model: 'cli-agent/claude/claude-opus-5-5',
  content: 'Done. The scenes render from fixed data, so two loads capture the same pixels.',
}

const HANDOFF: Msg = {
  id: 'h1',
  role: 'user',
  handoffFrom: 'verifier',
  content: 'Verified: the index lists 9 scenes and every state URL renders on its own.',
}

const ERRORED: Msg = {
  id: 'e1',
  role: 'assistant',
  content: '',
  error: 'The model provider returned 529 Overloaded. Try again in a moment.',
}

// ---------------------------------------------------------------------------------------------
// Tool call rows

function ToolRows({ rows }: { rows: ToolCallCardProps[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row) => (
        <ToolCallCard key={row.toolCall.toolCallId} {...row} />
      ))}
    </div>
  )
}

const READ_FILE: ToolCallCardProps = {
  toolCall: {
    toolCallId: 't-read',
    name: 'readPaths',
    arguments: { paths: ['playground/main.tsx', 'docs/ARCHITECTURE.md'] },
  },
  resultType: 'success',
  result: { 'playground/main.tsx': 'import { StrictMode } from …' },
  durationMs: 184,
}

const SEARCH: ToolCallCardProps = {
  toolCall: {
    toolCallId: 't-grep',
    name: 'grepFiles',
    arguments: { queries: [{ path: 'src/web/index.ts', pattern: 'ApprovalPanel' }] },
  },
  resultType: 'success',
  result: [[]],
  durationMs: 42,
}

const RUNNING: ToolCallCardProps = {
  toolCall: { toolCallId: 't-run', name: 'runProjectCheck', arguments: { check: 'build' } },
  // No `startedAt`: a running row would count up from it.
  resultType: 'running',
}

const STOPPED: ToolCallCardProps = {
  toolCall: { toolCallId: 't-stopped', name: 'runProjectCheck', arguments: { check: 'build' } },
  resultType: 'aborted',
  result: { outcome: 'stopped', reason: RUN_STOPPED_REASON },
}

const ERRORED_CALL: ToolCallCardProps = {
  toolCall: {
    toolCallId: 't-err',
    name: 'writeExactReplace',
    arguments: { path: 'playground/main.tsx', search: 'Demo()', replace: 'Showcase()' },
  },
  resultType: 'errored',
  result: { error: 'Search text not found in playground/main.tsx' },
  durationMs: 12,
}

const DENIED: ToolCallCardProps = {
  toolCall: {
    toolCallId: 't-denied',
    name: 'requestNetworkUnlock',
    arguments: { host: 'registry.npmjs.org', reason: 'Install the showcase dependency' },
    decisionNote: 'Denied by you',
  },
  resultType: 'not_allowed',
  result: { reason: 'You declined this.' },
}

const AWAITING: ToolCallCardProps = {
  toolCall: {
    toolCallId: 't-await',
    name: 'requestInstallPackage',
    arguments: { ecosystem: 'npm', name: 'left-pad', version: '1.3.0' },
    awaitingDecision: true,
  },
  resultType: 'require_confirmation',
}

const SELECTABLE: ToolCallCardProps[] = [
  {
    toolCall: {
      toolCallId: 't-sel-1',
      name: 'deletePath',
      arguments: { path: 'playground/old-demo.tsx' },
    },
    resultType: 'require_confirmation',
    selectable: true,
    selected: true,
    onToggleSelect: noop,
    onAlwaysAllow: noop,
  },
  {
    toolCall: {
      toolCallId: 't-sel-2',
      name: 'renamePath',
      arguments: { from: 'playground/demo.tsx', to: 'playground/showcase.tsx' },
    },
    resultType: 'require_confirmation',
    selectable: true,
    selected: false,
    onToggleSelect: noop,
    onAlwaysAllow: noop,
  },
]

// ---------------------------------------------------------------------------------------------
// The dock's approval panel

/** A grant whose decision goes nowhere — the panel stays as it is drawn. */
function grant(
  toolName: string,
  args: Record<string, unknown>,
  extra: Partial<PendingToolGrant> = {},
): PendingToolGrant {
  return {
    id: `grant-${toolName}`,
    chatRunner: 'cli',
    label: toolName,
    toolName,
    args,
    alwaysAllowScopes: ['chat', 'everywhere'],
    grantCovers: 'exact-call',
    decide: () => new Promise<void>(noop),
    ...extra,
  }
}

/** Sized like the dock it replaces the composer in. */
function Dock({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-2xl rounded-xl border border-(--border-subtle) bg-(--surface-base)">
      {children}
    </div>
  )
}

function DockPanel({ of }: { of: PendingToolGrant }) {
  return (
    <Dock>
      <ApprovalPanel grant={of} onDecideLater={noop} />
    </Dock>
  )
}

const INSTALL = grant('requestInstallPackage', {
  ecosystem: 'npm',
  name: 'left-pad',
  version: '1.3.0',
  reason: 'The showcase pads its state ids for the index.',
})

const NETWORK = grant(
  'requestNetworkUnlock',
  { host: 'registry.npmjs.org', reason: 'npm install needs the registry.' },
  { trustableSite: 'registry.npmjs.org' },
)

const FETCH = grant(
  'requestExternalFetch',
  { url: 'https://vitejs.dev/config/preview-options', reason: 'Check how preview takes its port.' },
  { trustableSite: 'vitejs.dev' },
)

const MESSAGE = grant(
  'sendChatMessage',
  {
    chatId: 'chat-release',
    awaitReply: true,
    reason: 'The release chat owns the changelog.',
    message: 'The showcase landed. Please add **component showcase** to the release notes.',
  },
  { detail: { detail: { targetLabel: 'Release planning' } } },
)

const WRITE = grant('writeProjectFile', {
  path: 'playground/scenes/chat.tsx',
  reason: 'Seed the chat scenes.',
  content: [
    "import type { Scene } from '../showcase/types'",
    '',
    'export const CHAT_SCENES: Scene[] = [',
    "  { id: 'message-bubbles', title: 'Message bubbles', states: [] },",
    ']',
  ].join('\n'),
})

const DELETE = grant(
  'deleteAssistantConversation',
  { reason: 'It was a scratch conversation.' },
  { alwaysAllowScopes: [] },
)

const MANY_DELETES: PendingToolGrant[] = Array.from({ length: 26 }, (_, i) =>
  grant(
    'deleteDesignProposal',
    { proposalId: `proposal-${String(i + 1).padStart(2, '0')}` },
    {
      id: `grant-delete-${i + 1}`,
      alwaysAllowScopes: [],
      detail: {
        tool: 'deleteDesignProposal',
        detail: `Delete the proposal 'Draft ${String(i + 1).padStart(2, '0')} — chip slots' (1 image) from WarGames`,
      },
    },
  ),
)

const GENERIC = grant(
  'runShellCommand',
  { reason: 'Rebuild the playground.' },
  { alwaysAllowScopes: ['chat'], grantCovers: 'tool', detail: 'npm run playground:build' },
)

// ---------------------------------------------------------------------------------------------
// The approval card on its own, in the states only its props reach

function Card(props: Partial<Parameters<typeof ToolAskCard>[0]> & { of: PendingToolGrant }) {
  const { of, ...rest } = props
  return (
    <Dock>
      <div className="m-3">
        <ToolAskCard
          view={toolAskCardView(of)}
          busy={false}
          onApprove={noop}
          onDeny={noop}
          onLater={noop}
          {...rest}
        />
      </div>
    </Dock>
  )
}

// ---------------------------------------------------------------------------------------------
// A CLI turn's last rows, and the activity row while its run works

const CLI_TURN: Msg = {
  id: 'c1',
  role: 'assistant',
  showModel: true,
  model: 'cli-agent/claude/claude-opus-5-5',
  content: 'Reading the playground entry and the architecture notes before adding the scene.',
}

/** The turn as the run view lays it out: the activity row shows only while the run works. */
function CliTurn({ status, failure }: { status: CliRunStatus; failure?: string }) {
  const failed = withCliRunFailure([], status, failure)
  const activity = describeCliRunActivity({
    runningToolNames: [],
    booting: false,
    coldStart: false,
    sinceLastActionMs: 12_000,
    blocked: [],
  })
  return (
    <div className="flex flex-col gap-1.5">
      <Conversation messages={[CLI_TURN]} />
      <ToolCallCard {...READ_FILE} />
      <ToolCallCard {...(isCliRunWorking(status) ? RUNNING : STOPPED)} />
      {failed.length > 0 ? <Conversation messages={failed} /> : null}
      {isCliRunWorking(status) ? <ThinkingRow spinnerLabel={activity.label} /> : null}
    </div>
  )
}

export const CHAT_SCENES: Scene[] = [
  {
    id: 'message-bubbles',
    title: 'Message bubbles',
    component: 'MessageRow',
    group: 'Chat',
    description:
      'The chat’s rows: the person, the assistant, a hand-back from another agent, an error.',
    states: [
      {
        id: 'conversation',
        title: 'Conversation',
        description: 'A user turn, a Markdown reply and a reply with its model chip.',
        render: () => <Conversation messages={[USER, ASSISTANT, ASSISTANT_WITH_MODEL]} />,
      },
      { id: 'user', title: 'User', render: () => <Conversation messages={[USER]} /> },
      {
        id: 'assistant-markdown',
        title: 'Assistant, Markdown',
        render: () => <Conversation messages={[ASSISTANT]} />,
      },
      {
        id: 'assistant-with-model',
        title: 'Assistant with its model',
        render: () => <Conversation messages={[ASSISTANT_WITH_MODEL]} />,
      },
      {
        id: 'agent-handoff',
        title: 'Hand-back from another agent',
        render: () => <Conversation messages={[HANDOFF]} />,
      },
      { id: 'error', title: 'Error', render: () => <Conversation messages={[ERRORED]} /> },
    ],
  },
  {
    id: 'thinking-row',
    title: 'Thinking row',
    component: 'ThinkingRow',
    group: 'Chat',
    description: 'What the chat shows while the agent works, or waits on the person.',
    states: [
      {
        id: 'reasoning-open',
        title: 'Reasoning, open',
        render: () => (
          <ThinkingRow
            defaultOpen
            thinking="The registry needs ids that read well in a URL, so kebab-case, checked by a test."
          />
        ),
      },
      {
        id: 'blocked',
        title: 'Waiting on you',
        render: () => <ThinkingRow tone="blocked" spinnerLabel="Waiting for your approval" />,
      },
      {
        id: 'cli-working',
        title: 'CLI run working',
        render: () => <CliTurn status="running" />,
      },
      {
        id: 'cli-paused',
        title: 'CLI run paused',
        description:
          'A backend restart parks its runs paused. Nothing runs a paused run, so its turn shows as ended: the call it was on reads as stopped, no activity row, and the composer is free.',
        render: () => <CliTurn status="paused" />,
      },
      {
        id: 'cli-paused-failure',
        title: 'CLI run paused on a failure',
        description:
          'Its failure policy paused the run — here an expired login. It is not working either, and its turn ends with the failure, as a failed run’s does.',
        render: () => (
          <CliTurn
            status="paused"
            failure="Claude Code’s login expired. Sign in again to carry on."
          />
        ),
      },
    ],
  },
  {
    id: 'tool-call-rows',
    title: 'Tool call rows',
    component: 'ToolCallCard',
    group: 'Chat',
    description: 'One row per tool call, in every status it reaches.',
    states: [
      {
        id: 'statuses',
        title: 'Every status',
        render: () => (
          <ToolRows rows={[READ_FILE, SEARCH, RUNNING, STOPPED, ERRORED_CALL, DENIED, AWAITING]} />
        ),
      },
      { id: 'success', title: 'Succeeded', render: () => <ToolRows rows={[READ_FILE]} /> },
      { id: 'running', title: 'Running', render: () => <ToolRows rows={[RUNNING]} /> },
      {
        id: 'stopped',
        title: 'Stopped',
        description:
          'The call was still open when its run stopped working — stopped, failed or paused by a restart. It will not finish, so it no longer spins.',
        render: () => <ToolRows rows={[STOPPED]} />,
      },
      { id: 'errored', title: 'Errored', render: () => <ToolRows rows={[ERRORED_CALL]} /> },
      { id: 'denied', title: 'Denied', render: () => <ToolRows rows={[DENIED]} /> },
      {
        id: 'awaiting-decision',
        title: 'Waiting on a decision',
        render: () => <ToolRows rows={[AWAITING]} />,
      },
      {
        id: 'approval-batch',
        title: 'In an approval batch',
        description: 'Calls the person ticks to allow before Resume.',
        render: () => <ToolRows rows={SELECTABLE} />,
      },
    ],
  },
  {
    id: 'approval-panel',
    title: 'Approval panel',
    component: 'ApprovalPanel',
    group: 'Chat',
    description: 'The dock’s card for the one ask a chat is blocked on, for each kind of ask.',
    states: [
      {
        id: 'install-package',
        title: 'Install a package',
        render: () => <DockPanel of={INSTALL} />,
      },
      { id: 'network-unlock', title: 'Reach a host', render: () => <DockPanel of={NETWORK} /> },
      { id: 'external-fetch', title: 'Read a page', render: () => <DockPanel of={FETCH} /> },
      {
        id: 'send-message',
        title: 'Message another chat',
        render: () => <DockPanel of={MESSAGE} />,
      },
      { id: 'write-file', title: 'Write a file', render: () => <DockPanel of={WRITE} /> },
      { id: 'delete', title: 'Delete (cannot undo)', render: () => <DockPanel of={DELETE} /> },
      { id: 'generic-tool', title: 'Any other tool', render: () => <DockPanel of={GENERIC} /> },
      {
        id: 'many-waiting',
        title: 'Twenty-six waiting at once',
        description:
          'An agent asked to delete 26 design proposals: one card at a time with its full decision, paged; deciding one shows the next.',
        render: () => (
          <div className="flex h-[560px] flex-col rounded-xl border border-(--border-subtle) bg-(--surface-base)">
            <div className="flex-1 p-4 text-[13px] text-(--text-secondary)">
              The conversation stays above.
            </div>
            <ApprovalStack grants={MANY_DELETES} onDecideLater={noop} />
          </div>
        ),
      },
    ],
  },
  {
    id: 'approval-card',
    title: 'Approval card',
    component: 'ToolAskCard',
    group: 'Chat',
    description: 'The card every approval shares, in the states its decision passes through.',
    states: [
      { id: 'ask', title: 'Asking', render: () => <Card of={NETWORK} /> },
      { id: 'danger', title: 'Destructive', render: () => <Card of={DELETE} /> },
      { id: 'deciding', title: 'Deciding', render: () => <Card of={NETWORK} busy /> },
      {
        id: 'decide-failed',
        title: 'Decision failed',
        render: () => (
          <Card of={NETWORK} error="This approval already expired — the agent moved on." />
        ),
      },
      {
        id: 'cannot-approve',
        title: 'Cannot be approved',
        render: () => (
          <Card of={INSTALL} problem="The package registry is not reachable from this sandbox." />
        ),
      },
    ],
  },
]
