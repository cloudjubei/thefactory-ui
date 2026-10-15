import type { ReactNode } from 'react'
import type { ProcessRun } from 'thefactory-tools/types'
import {
  ChatHeader,
  ChatInput,
  ChatSettingsMenu,
  MessageRow,
  ModelChip,
  type ChatMessageLike,
} from 'thefactory-ui/web'
import {
  CHAT_NOTIFY_LEVEL_LABELS,
  chatHeaderView,
  chatSettingsMenuItems,
  processRunChatContext,
  RUN_CHAT_PLACEHOLDER,
  RUN_CHAT_TITLE,
} from 'thefactory-ui/headless'
import type { ModelInfo } from '../../src/headless/api'
// Not on the package's public surface: the pipeline draws its head and docks its chat itself. The
// showcase reaches into the source for them, as the playground renders the library from source.
import { RunHead } from '../../src/web/compound/process/ProcessPipeline'
import RunChatDock from '../../src/web/compound/process/RunChatDock'
import type { Scene } from '../showcase/types'

const noop = () => {}
const NOW = 1_760_000_000_000

const CLI_MODELS: ModelInfo[] = [
  { id: 'claude-opus-5-5', label: 'Opus 5.5', cli: 'claude-code' },
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5', cli: 'claude-code' },
]

const API_CONFIG = {
  id: 'cfg-1',
  name: 'Claude Opus',
  provider: 'anthropic',
  model: 'claude-opus-5-5',
}

const SETTINGS_ITEMS = chatSettingsMenuItems({
  notifyLevel: CHAT_NOTIFY_LEVEL_LABELS['needs-me'],
  canTune: true,
  listHidden: false,
  showDeveloperTools: false,
  canDelete: false,
})

const STORY_RUN: ProcessRun = {
  id: 'run-story',
  projectId: 'p1',
  title: 'Let unit tests watch their files',
  status: 'running',
  loopCounts: {},
  ledger: [
    { id: 'plan-1', stepId: 'plan', iteration: 1, status: 'done', outcome: 'passed', startedAt: 0 },
  ],
  startedAt: 0,
  updatedAt: 0,
  plan: {
    definitionId: 'story',
    definitionScope: 'global',
    definitionVersion: 1,
    name: 'Story',
    steps: [
      { id: 'plan', name: 'Plan', kind: 'agent', agentType: 'planner' },
      { id: 'features', name: 'Features', kind: 'agent', agentType: 'developer' },
      { id: 'checks', name: 'Checks', kind: 'check' },
      { id: 'code-review', name: 'Code review', kind: 'judge' },
      { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
    ],
    loops: [],
    frozenAt: 0,
  },
}

const FEATURE_RUN: ProcessRun = {
  id: 'run-feature',
  projectId: 'p1',
  parentRunId: 'run-story',
  parentStepId: 'features',
  title: 'Watch mode for the test runner',
  status: 'parked',
  park: { reason: 'step-failed', stepId: 'verify', message: 'Verify failed.', parkedAt: 0 },
  loopCounts: {},
  ledger: [
    {
      id: 'impl-1',
      stepId: 'implement',
      iteration: 1,
      status: 'done',
      outcome: 'passed',
      startedAt: 0,
    },
    {
      id: 'verify-1',
      stepId: 'verify',
      iteration: 1,
      status: 'done',
      outcome: 'failed',
      startedAt: 0,
    },
  ],
  startedAt: 0,
  updatedAt: 0,
  plan: {
    definitionId: 'feature',
    definitionScope: 'global',
    definitionVersion: 1,
    name: 'Feature',
    steps: [
      { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
      { id: 'verify', name: 'Verify', kind: 'agent', agentType: 'verifier' },
    ],
    loops: [],
    frozenAt: 0,
  },
}

type HeadProps = { run: ProcessRun; depth: number; unread?: boolean; chat?: boolean }

/** The run header as the pipeline draws it, its chat button opening the whole run's chat. */
function Head({ run, depth, unread = false, chat = true }: HeadProps) {
  return (
    <RunHead
      run={run}
      stopHolder={undefined}
      depth={depth}
      now={NOW}
      projectName="TheFactory Tools"
      onCrumb={noop}
      onCancel={noop}
      onDelete={noop}
      {...(chat ? { chat: { onOpen: noop, unread } } : {})}
    />
  )
}

function headState(id: string, title: string, description: string, props: HeadProps) {
  return {
    id,
    title,
    description,
    render: () => (
      <div className="overflow-hidden rounded-lg border border-(--border-subtle)">
        <Head {...props} />
      </div>
    ),
  }
}

const CHAT_MESSAGES: ChatMessageLike[] = [
  {
    id: 'u1',
    role: 'user',
    content: 'Why did verify fail on the watch-mode feature?',
  },
  {
    id: 'a1',
    role: 'assistant',
    content:
      'The verifier ran `npm test -- --watch` and it never exited, so the step timed out. The feature works; the check needs `--watch=false` in CI.',
  },
]

/** The chat's own model chip as the host renders it: editable, on Claude Code with Sonnet 5.5. */
function ChatModelChip() {
  return (
    <ModelChip
      editable
      mode="chat"
      model="claude-sonnet-5-5"
      activeConfig={API_CONFIG}
      recents={[API_CONFIG]}
      configs={[API_CONFIG]}
      onPick={noop}
      onOpenSettings={noop}
      getPrice={async () => undefined}
      useCli
      onToggleUseCli={noop}
      enabledClis={['claude-code', 'codex']}
      activeCli="claude-code"
      onPickCli={noop}
      cliModels={CLI_MODELS}
      onPickCliModel={noop}
    />
  )
}

/** The messages and the composer under a chat header, as `ChatBody` lays them out. */
function ChatColumn({ header }: { header: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-(--surface-base)">
      {header}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {CHAT_MESSAGES.map((msg, i) => (
          <MessageRow
            key={msg.id}
            msg={msg}
            globalIndex={i}
            totalMessages={CHAT_MESSAGES.length}
            isThinking={false}
            isLast={i === CHAT_MESSAGES.length - 1}
            prevUserMessagesLen={CHAT_MESSAGES.length}
            enhancedTotalLength={CHAT_MESSAGES.length}
          />
        ))}
      </div>
      <ChatInput value="" onChange={noop} onSend={noop} placeholder={RUN_CHAT_PLACEHOLDER} />
    </div>
  )
}

/**
 * The run chat beside its run: the slim header — collapse, "Run chat", the chat's model chip and
 * maximize — since the run's title, status and steps are on screen beside it.
 */
function DockedRunChat() {
  return (
    <ChatColumn
      header={
        <ChatHeader
          view={runChatView()}
          dockedLabel={RUN_CHAT_TITLE}
          modelChip={<ChatModelChip />}
          onCollapse={noop}
          onMaximize={noop}
        />
      }
    />
  )
}

/** The run chat on the Chat screen, where the run is not on screen: its full header and steps. */
function MaximizedRunChat() {
  return (
    <ChatColumn
      header={
        <ChatHeader
          view={runChatView()}
          modelChip={<ChatModelChip />}
          settingsMenu={<ChatSettingsMenu items={SETTINGS_ITEMS} onSelect={noop} />}
        />
      }
    />
  )
}

function runChatView() {
  return chatHeaderView({
    context: processRunChatContext(STORY_RUN),
    chatTitle: `Run: ${STORY_RUN.title}`,
    projectName: 'TheFactory Tools',
    run: STORY_RUN,
    now: NOW,
  })
}

/** The run's page column: its header and, under it, its steps — sample content for the layout. */
function RunPage({ run, depth }: { run: ProcessRun; depth: number }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <Head run={run} depth={depth} />
      <ol className="m-3 flex list-none flex-col gap-1 rounded-xl border border-(--border-subtle) bg-(--surface-raised) p-3">
        {run.plan.steps.map((step) => (
          <li key={step.id} className="text-[13px] text-(--text-primary)">
            {step.name}
          </li>
        ))}
      </ol>
    </div>
  )
}

function dockState(
  id: string,
  title: string,
  description: string,
  dock: { run: ProcessRun; depth: number; narrow?: boolean; initialWidth?: number },
) {
  return {
    id,
    title,
    description,
    overlay: true,
    render: (): ReactNode => (
      <div className="fixed inset-0 bg-(--surface-base)">
        <RunChatDock
          open
          chat={<DockedRunChat />}
          onClose={noop}
          {...(dock.narrow ? { narrow: true } : {})}
          {...(dock.initialWidth !== undefined ? { initialWidth: dock.initialWidth } : {})}
        >
          <RunPage run={dock.run} depth={dock.depth} />
        </RunChatDock>
      </div>
    ),
  }
}

const STORY = {
  id: 's7',
  title: 'Agent-to-agent chat messaging',
  status: 'in_progress' as const,
  features: [
    { id: 'f1', title: 'Send a message', status: 'done' as const },
    { id: 'f2', title: 'Reply in thread', status: 'in_progress' as const },
    { id: 'f3', title: 'Read receipts', status: 'pending' as const },
  ],
}

/** A docked chat's header at a panel's width: the title and icon controls, then the pill, meta and chip. */
function DockedHeader({ slim = false, width = 380 }: { slim?: boolean; width?: number }) {
  const view = slim
    ? runChatView()
    : chatHeaderView({
        context: { type: 'STORY', projectId: 'p1', storyId: STORY.id },
        story: STORY,
        storyDisplayIndex: () => 7,
        featureDisplayIndex: (_, featureId) =>
          STORY.features.findIndex((f) => f.id === featureId) + 1,
        now: NOW,
      })
  return (
    <div className="overflow-hidden rounded-lg border border-(--border-subtle)" style={{ width }}>
      <ChatHeader
        view={view}
        narrow
        modelChip={<ChatModelChip />}
        onCollapse={noop}
        onMaximize={noop}
        {...(slim
          ? { dockedLabel: RUN_CHAT_TITLE }
          : { settingsMenu: <ChatSettingsMenu items={SETTINGS_ITEMS} onSelect={noop} /> })}
      />
    </div>
  )
}

export const PROCESS_SCENES: Scene[] = [
  {
    id: 'docked-chat-header',
    title: 'Docked chat header',
    component: 'ChatHeader (narrow)',
    group: 'Chat',
    description:
      'A chat header in a docked panel or a sheet: the title keeps the first row with the icon controls and always the room left, and the status, the line and the model chip take the second. A run’s chat beside its run is one slim row.',
    states: [
      {
        id: 'story-panel',
        title: 'Story chat panel',
        description:
          'The story chat docked at its starting 380px: collapse, the kind tile, the title with the room left, maximize and the gear; under it the status, the line and the model chip.',
        render: () => <DockedHeader />,
      },
      {
        id: 'story-panel-wide',
        title: 'Story chat panel, widened',
        description:
          'The same header dragged to 560px: the title reads in full, the rows the same.',
        render: () => <DockedHeader width={560} />,
      },
      {
        id: 'run-chat-slim',
        title: 'Run chat beside its run',
        description:
          'Collapse, “Run chat”, the chat’s model chip and maximize — nothing the run page beside it already shows.',
        render: () => <DockedHeader slim />,
      },
    ],
  },
  {
    id: 'run-header',
    title: 'Run header',
    component: 'RunHead (ProcessPipeline)',
    group: 'Process',
    description:
      'The header of every page of a process run. The chat button is on the top run and on a nested run at any depth — each opens the one chat of the whole run tree; its dot says that chat has news.',
    states: [
      headState(
        'top-level',
        'Top-level run',
        'A story run with its chat button and nothing new in the chat.',
        { run: STORY_RUN, depth: 0 },
      ),
      headState(
        'top-level-unread',
        'Top-level run, unread',
        'The run chat has a reply or an ask the person has not seen.',
        { run: STORY_RUN, depth: 0, unread: true },
      ),
      headState(
        'nested',
        'Nested run',
        'A feature run drilled into from its story run: the breadcrumb back up, and the same chat button — it opens the story run’s chat.',
        { run: FEATURE_RUN, depth: 1 },
      ),
      headState(
        'nested-unread',
        'Nested run, unread',
        'The dot on a nested run is the whole run’s chat news, the same as on the top run.',
        { run: FEATURE_RUN, depth: 1, unread: true },
      ),
      headState(
        'nested-deep',
        'Two levels down',
        'Deeper still: the breadcrumb folds the levels between, and the chat button stays.',
        { run: FEATURE_RUN, depth: 2 },
      ),
    ],
  },
  {
    id: 'run-chat-dock',
    title: 'Run page with its chat',
    component: 'RunChatDock',
    group: 'Process',
    description:
      'The run chat docked beside the run, the same sidebar a story’s chat uses: flush against the page, no strip between them, dragged at its left edge to open wider. Beside its run the chat’s header is one slim row — collapse, “Run chat”, the chat’s own model chip and maximize — since the run’s title, status and steps are already on screen. Small screens get the story chat’s sheet with the same slim header.',
    states: [
      dockState('docked', 'Docked', 'The chat at its starting width beside a top-level run.', {
        run: STORY_RUN,
        depth: 0,
      }),
      dockState(
        'docked-widened',
        'Docked, widened',
        'The chat dragged wider — up to half the window — with the run page narrowed beside it.',
        { run: STORY_RUN, depth: 0, initialWidth: 720 },
      ),
      dockState(
        'docked-nested',
        'Docked on a nested run',
        'A nested run’s page with the whole run’s chat open beside it.',
        { run: FEATURE_RUN, depth: 1 },
      ),
      dockState(
        'small-screen-sheet',
        'Small screen',
        'On a small screen the run chat slides up in a sheet over the run, as a story’s chat does.',
        { run: STORY_RUN, depth: 0, narrow: true },
      ),
      {
        id: 'maximized',
        title: 'Maximized on the Chat screen',
        description:
          'Opened in its own view the run is no longer on screen, so the run chat gets the full header back: the run’s title and status, where it sits, its steps, the model chip and the settings gear.',
        overlay: true,
        render: () => (
          <div className="fixed inset-0 bg-(--surface-base)">
            <MaximizedRunChat />
          </div>
        ),
      },
    ],
  },
]
