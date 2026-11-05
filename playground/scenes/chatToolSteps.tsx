import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MessageList, SegmentedControl, type ChatMessageLike } from 'thefactory-ui/web'
import {
  AppSettingsProvider,
  ChatActionsProvider,
  type ChatActions,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
import { FAKE_CLI_RUN } from '../../src/fakeBackend/fixtures/cliRuns'
import { OnFixtures } from './onFixtures'
import type { Scene } from '../showcase/types'

const noop = () => {}
const MEMORY: SyncKVStorage = { get: () => null, set: noop }
const ACTIONS: ChatActions = {
  openReview: noop,
  reviewTargetOf: (runId) => runId ?? 'turn-1',
  draftMessage: noop,
}

/** An ordinary finished tool call, as a chat message the list is sent. */
function toolStep(name: string, args: Record<string, unknown>, result?: unknown): ChatMessageLike {
  return {
    id: `t-${name}`,
    role: 'tool',
    content: '',
    toolCall: { toolCallId: `t-${name}`, name, arguments: args },
    toolResult: { type: 'success', durationMs: 40, ...(result !== undefined ? { result } : {}) },
  }
}

const ASK: ChatMessageLike = {
  id: 'ask',
  role: 'user',
  content: 'Where is the chat message list drawn?',
}
const BETWEEN: ChatMessageLike = {
  id: 'between',
  role: 'assistant',
  content: 'One call stays on its own row.',
}
const FOUND: ChatMessageLike = {
  id: 'found',
  role: 'assistant',
  content: 'The list is MessageList.',
}

const READS = [
  toolStep('readPaths', { paths: ['src/web/compound/chat/MessageList.tsx'] }),
  toolStep('grepFiles', { pattern: 'ToolStepsFold' }),
  toolStep('readFile', { path: 'src/web/compound/chat/MessageList.tsx' }),
]

const GIT_SETUP = toolStep(
  'setupProjectGitRepo',
  { projectId: 'p1' },
  { createdRepo: { fullName: 'acme/army-builder', private: true }, pushedBranch: 'factory/cards' },
)

const CHAT: ChatMessageLike[] = [
  ASK,
  toolStep('listContents', { path: 'src/web/compound/chat' }),
  BETWEEN,
  ...READS,
  GIT_SETUP,
  toolStep('listStories', { projectId: 'p1' }),
  FOUND,
]

const WAITING_ON_YOU: ChatMessageLike = {
  id: 't-deleteFile',
  role: 'tool',
  content: '',
  toolCall: {
    toolCallId: 't-deleteFile',
    name: 'deleteFile',
    arguments: { path: 'notes/old.md' },
    awaitingDecision: true,
  },
  toolResult: { type: 'require_confirmation' },
}

const SPLIT_BY_A_DECISION: ChatMessageLike[] = [
  ASK,
  ...READS,
  WAITING_ON_YOU,
  toolStep('listContents', { path: 'notes' }),
  toolStep('listStories', { projectId: 'p1' }),
]

const STILL_WRITING: ChatMessageLike[] = [ASK, BETWEEN, ...READS]

const CLI_TURN: ChatMessageLike[] = [
  ASK,
  { id: 'cli-turn', role: 'assistant', content: '', cliRunId: FAKE_CLI_RUN.id },
]

const OTHER_CHAT: ChatMessageLike[] = [
  { ...ASK, id: 'other-ask', content: 'And the native one?' },
  toolStep('listContents', { path: 'src/native/compound/chat' }),
  { ...BETWEEN, id: 'other-between', content: 'Here too.' },
  toolStep('readPaths', { paths: ['src/native/compound/chat/MessageList.tsx'] }),
  toolStep('readFile', { path: 'src/native/compound/chat/MessageList.tsx' }),
]

function Frame({ children, height = 'h-[560px]' }: { children: ReactNode; height?: string }) {
  return (
    <AppSettingsProvider storage={MEMORY}>
      <ChatActionsProvider value={ACTIONS}>
        <div className={`flex min-h-0 flex-col bg-(--surface-base) ${height}`}>{children}</div>
      </ChatActionsProvider>
    </AppSettingsProvider>
  )
}

/** Presses the list's closed "N steps" lines once it is drawn, as a person would. */
function Opened({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    root.current
      ?.querySelectorAll<HTMLButtonElement>('button[aria-expanded="false"][aria-label$=" steps"]')
      .forEach((line) => line.click())
  }, [])
  return (
    <div ref={root} className="contents">
      {children}
    </div>
  )
}

/** One mounted list sent two chats, as the app does when the person moves between them. */
function TwoChats() {
  const [chat, setChat] = useState<'first' | 'second'>('first')
  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl
        ariaLabel="Chat"
        value={chat}
        onChange={(next) => setChat(next === 'second' ? 'second' : 'first')}
        options={[
          { value: 'first', label: 'First chat' },
          { value: 'second', label: 'Second chat' },
        ]}
      />
      <Frame height="h-[480px]">
        <MessageList
          chatId={chat === 'first' ? 'project_p1' : 'project_p2'}
          messages={chat === 'first' ? CHAT : OTHER_CHAT}
        />
      </Frame>
    </div>
  )
}

export const CHAT_TOOL_STEP_SCENES: Scene[] = [
  {
    id: 'chat-tool-steps',
    title: 'Tool steps fold',
    component: 'MessageList',
    group: 'Chat',
    description:
      'Two or more ordinary tool calls in a row read as one “N steps” line, closed until it is pressed. One call stays its own row. Milestones, a call waiting on a decision, run cards, a message sent to another chat and a stored secret stay visible and split the run. Web and mobile fold the same way, in a chat and inside a CLI turn.',
    states: [
      {
        id: 'closed',
        title: 'Closed',
        description:
          'One call, an assistant line, three calls in one line, the git setup on its own row, one more call, then the reply.',
        render: () => (
          <Frame>
            <MessageList chatId="project_p1" messages={CHAT} />
          </Frame>
        ),
      },
      {
        id: 'opened',
        title: 'Opened',
        description: 'The line pressed: the three calls under it. Pressing it again closes it.',
        render: () => (
          <Frame height="h-[900px]">
            <Opened>
              <MessageList chatId="project_p1" messages={CHAT} />
            </Opened>
          </Frame>
        ),
      },
      {
        id: 'split-by-a-decision',
        title: 'Split by a decision',
        description:
          'A call waiting on the person stays on its own row, so what came before and after it fold apart.',
        render: () => (
          <Frame>
            <MessageList chatId="project_p1" messages={SPLIT_BY_A_DECISION} />
          </Frame>
        ),
      },
      {
        id: 'turn-still-writing',
        title: 'Turn still writing',
        description:
          'While the turn runs its trailing steps stay open, so they are not folded away as they happen. They fold when it ends.',
        render: () => (
          <Frame>
            <MessageList chatId="project_p1" messages={STILL_WRITING} isBusy />
          </Frame>
        ),
      },
      {
        id: 'cli-turn',
        title: 'Inside a CLI turn',
        description:
          'A finished CLI turn’s own calls fold the same way, between its opening line and its reply.',
        render: () => (
          <OnFixtures>
            <Frame>
              <MessageList chatId="project_p1" messages={CLI_TURN} />
            </Frame>
          </OnFixtures>
        ),
      },
      {
        id: 'moving-between-chats',
        title: 'Moving between chats',
        description:
          'A fold opened in one chat does not open the fold at the same place in the next one.',
        render: () => <TwoChats />,
      },
    ],
  },
]
