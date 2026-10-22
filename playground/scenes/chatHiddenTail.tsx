import { MessageList, type ChatMessageLike } from 'thefactory-ui/web'
import {
  AppSettingsProvider,
  ChatActionsProvider,
  type ChatActions,
  type ChatStopNotice,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
import type { Scene } from '../showcase/types'

const noop = () => {}
const MEMORY: SyncKVStorage = { get: () => null, set: noop }
const ACTIONS: ChatActions = { openReview: noop, draftMessage: noop }

const STOP: ChatStopNotice = {
  cause: 'overseer',
  reason:
    'Overseer could not start the agent’s session: the chat’s open changes could not be carried into its workspace. Nothing the agent did caused this.',
  raw: 'resident session bring-up failed: the chat’s open review could not be carried into the workspace',
}

const EARLIER: ChatMessageLike = {
  id: 'earlier',
  role: 'assistant',
  content: 'The story tools are not available in this turn, so nothing has been created yet.',
}
const PERSON: ChatMessageLike = {
  id: 'person',
  role: 'user',
  content: 'Retry with story tools enabled',
}
const FAILED: ChatMessageLike = {
  id: 'failed',
  role: 'system',
  content: 'Error',
  error: STOP.raw,
  stopNotice: STOP,
}
const HIDDEN_NOTICE: ChatMessageLike = {
  id: 'hidden-notice',
  role: 'assistant',
  content: 'This chat’s open changes (5 files) have waited over 12 h for you.',
  openChangesCard: {
    kind: 'waiting',
    runId: 'run-changes',
    projectId: 'p1',
    chatContextId: '/projects/p1',
    since: 0,
    fileCount: 5,
  },
}

/** A chat's message list as `ChatBody` lays it out, with its delete and restart actions. */
function Messages({ messages }: { messages: ChatMessageLike[] }) {
  return (
    <AppSettingsProvider storage={MEMORY}>
      <ChatActionsProvider value={ACTIONS}>
        <div className="flex h-[420px] min-h-0 flex-col bg-(--surface-base)">
          <MessageList
            chatId="project_p1"
            messages={messages}
            onDeleteLastMessage={noop}
            onRestartTurn={noop}
          />
        </div>
      </ChatActionsProvider>
    </AppSettingsProvider>
  )
}

export const CHAT_HIDDEN_TAIL_SCENES: Scene[] = [
  {
    id: 'chat-hidden-notice-tail',
    title: 'Last message under a hidden notice',
    component: 'MessageList',
    group: 'Chat',
    description:
      'A message the host posted only to carry a card about the chat’s open changes is drawn as nothing, so it never takes the last message’s place: the failed turn above it still offers Try again, and its delete takes the hidden notice with it. Web, desktop and mobile read the same rule.',
    states: [
      {
        id: 'failed-turn',
        title: 'Failed turn',
        description:
          'The look-alike base: a turn that failed under the person’s message offers Try again.',
        render: () => <Messages messages={[EARLIER, PERSON, FAILED]} />,
      },
      {
        id: 'failed-turn-hidden-notice',
        title: 'Failed turn under a hidden notice',
        description:
          'The same chat with a host notice about open changes posted after the failure: nothing more is drawn, and the failed turn still offers Try again.',
        render: () => <Messages messages={[EARLIER, PERSON, FAILED, HIDDEN_NOTICE]} />,
      },
      {
        id: 'person-message-hidden-notice',
        title: 'Person’s message under a hidden notice',
        description:
          'Once the failed turn is deleted — the hidden notice goes with it — the person’s message is last and offers Try again.',
        render: () => <Messages messages={[EARLIER, PERSON, HIDDEN_NOTICE]} />,
      },
    ],
  },
]
