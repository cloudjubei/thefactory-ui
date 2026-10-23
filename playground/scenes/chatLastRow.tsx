import { MessageList, MessageRow, type ChatMessageLike } from 'thefactory-ui/web'
import {
  AppSettingsProvider,
  ChatActionsProvider,
  describeLastMessageDelete,
  describeLastUserMessageRestart,
  type ChatActions,
  type ChatStopNotice,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
import type { Scene } from '../showcase/types'

const noop = () => {}
const MEMORY: SyncKVStorage = { get: () => null, set: noop }
const AGENTS_HIDDEN: SyncKVStorage = {
  get: () => JSON.stringify({ notifications: { agentMessages: 'hidden' } }),
  set: noop,
}
const ACTIONS: ChatActions = { openReview: noop, draftMessage: noop }

const PERSON: ChatMessageLike = {
  id: 'person',
  role: 'user',
  content: 'Ask the knowledge base which chapters cover the night-fighting rules.',
  startedAt: '2026-10-22T09:12:00.000Z',
}
const STARTED: ChatMessageLike = {
  id: 'started',
  role: 'assistant',
  content: 'I asked the knowledge base; the answer will come back when the search finishes.',
  completedAt: '2026-10-22T09:12:20.000Z',
}
const BACKGROUND_RESULTS: ChatMessageLike = {
  id: 'background-results',
  role: 'user',
  content:
    'Background results — calls you made earlier have finished:\n\n### job job-7442d88e — askKnowledge\n\nChapters 7 and 12 cover night fighting.',
  startedAt: '2026-10-22T09:14:05.000Z',
  backgroundResults: [
    { jobId: 'job-7442d88e', toolName: 'askKnowledge', status: 'succeeded', tookMs: 104_000 },
  ],
}
const STOP: ChatStopNotice = {
  cause: 'overseer',
  reason:
    'Overseer could not start the agent’s session: the chat’s open changes could not be carried into its workspace. Nothing the agent did caused this.',
  raw: 'resident session bring-up failed',
}
const FAILED: ChatMessageLike = {
  id: 'failed',
  role: 'system',
  content: 'Error',
  error: STOP.raw,
  stopNotice: STOP,
}
const VERIFIER: ChatMessageLike = {
  id: 'verifier',
  role: 'user',
  content: '### Not signed off\n\nThe answer cites chapter 7 but not chapter 12.',
  handoffFrom: 'verifier',
  startedAt: '2026-10-22T09:20:00.000Z',
}
const DEVELOPER_REPLY: ChatMessageLike = {
  id: 'developer-reply',
  role: 'assistant',
  content: 'Added chapter 12 to the answer.',
  answersHandoffFrom: 'verifier',
  completedAt: '2026-10-22T09:21:00.000Z',
}

/** A chat's message list as `ChatBody` lays it out, with its delete and restart actions. */
function Messages({
  messages,
  storage = MEMORY,
}: {
  messages: ChatMessageLike[]
  storage?: SyncKVStorage
}) {
  return (
    <AppSettingsProvider storage={storage}>
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

/**
 * The same rows with the last one's delete control hovered — the list keeps that
 * state to itself, so the rows are drawn as it draws them in that moment.
 */
function DeleteHovered({ messages }: { messages: ChatMessageLike[] }) {
  const last = messages.length - 1
  return (
    <AppSettingsProvider storage={MEMORY}>
      <ChatActionsProvider value={ACTIONS}>
        <div className="w-full space-y-3 bg-(--surface-base) p-4">
          {messages.map((msg, i) => (
            <MessageRow
              key={msg.id ?? i}
              msg={msg}
              globalIndex={i}
              totalMessages={messages.length}
              isThinking={false}
              isLast={i === last}
              prevUserMessagesLen={messages.length}
              enhancedTotalLength={messages.length}
              onDeleteLastMessage={noop}
              deleteControl={describeLastMessageDelete({
                hasDeleteAction: true,
                isLast: i === last,
                turnInFlight: false,
              })}
              deletePreview={i === last}
              onRestartTurn={noop}
              restartControl={describeLastUserMessageRestart({
                hasRestartAction: true,
                isLast: i === last,
                role: msg.role,
                isErrorNotice: false,
                turnInFlight: false,
              })}
            />
          ))}
        </div>
      </ChatActionsProvider>
    </AppSettingsProvider>
  )
}

export const CHAT_LAST_ROW_SCENES: Scene[] = [
  {
    id: 'chat-last-row-controls',
    title: 'Last message of any kind',
    component: 'MessageList',
    group: 'Chat',
    description:
      'Whatever kind of row ends the chat — the person’s message, background results, a stop, the agents’ exchange, folded or with the agents hidden — it offers the delete on hover, so the conversation can always be taken back one message at a time. A row that is the agent’s input offers Try again as the person’s message does. Web, desktop and mobile draw the same controls.',
    states: [
      {
        id: 'person-message-last',
        title: 'Person’s message last',
        description:
          'The look-alike base: the person’s message ends the chat and offers Try again, and the delete on hover.',
        render: () => <Messages messages={[STARTED, PERSON]} />,
      },
      {
        id: 'background-results-last',
        title: 'Background results last',
        description:
          'Background results the host gave the agent end the chat: they offer Try again, as the person’s message does, and the delete on hover.',
        render: () => <Messages messages={[PERSON, STARTED, BACKGROUND_RESULTS]} />,
      },
      {
        id: 'background-results-delete-hover',
        title: 'Background results, delete hovered',
        description:
          'The delete on the background results while it is hovered: the card is tinted as the one row that goes, and the controls stay clear of the tint.',
        render: () => <DeleteHovered messages={[PERSON, STARTED, BACKGROUND_RESULTS]} />,
      },
      {
        id: 'stop-last',
        title: 'Stop last',
        description:
          'A stopped turn ends the chat: Try again stays in its card, and the delete sits under it on hover.',
        render: () => <Messages messages={[STARTED, PERSON, FAILED]} />,
      },
      {
        id: 'agent-exchange-last',
        title: 'Agents’ exchange last',
        description:
          'The agents’ exchange, folded into one line, ends the chat: the line offers the delete on hover, and it takes the exchange’s last message.',
        render: () => <Messages messages={[STARTED, PERSON, VERIFIER, DEVELOPER_REPLY]} />,
      },
      {
        id: 'agent-exchange-last-hidden',
        title: 'Agents’ exchange last, agents hidden',
        description:
          'The same chat with the agents’ messages set to hidden: the exchange that ends the chat is drawn in full, so its last message offers the delete on hover.',
        render: () => (
          <Messages
            messages={[STARTED, PERSON, VERIFIER, DEVELOPER_REPLY]}
            storage={AGENTS_HIDDEN}
          />
        ),
      },
    ],
  },
]
