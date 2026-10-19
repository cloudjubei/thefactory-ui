import type { ReactNode } from 'react'
import { ChatStopCard, MessageRow, type ChatMessageLike } from 'thefactory-ui/web'
import { ChatActionsProvider, type ChatActions, type ChatStopNotice } from 'thefactory-ui/headless'
import type { Scene } from '../showcase/types'

const noop = () => {}

/** What a chat body provides its cards; the showcase's do nothing. */
const ACTIONS: ChatActions = { openReview: noop, draftMessage: noop }

const FEATURE = 'Detect deterministic refusal repetition with a small bounded shared retry policy'

const OVERSEER: ChatStopNotice = {
  cause: 'overseer',
  featureTitle: FEATURE,
  reason:
    'Overseer could not send the agent its own conversation: a test run that moved to the background left a note, and the note was read as a test result. Nothing the agent did caused this, and its work is untouched.',
  raw: "TypeError: Cannot read properties of undefined (reading 'filter')\n  while preparing the conversation for the model (summarising the result of runTests)",
}

const PROVIDER: ChatStopNotice = {
  cause: 'provider',
  reason:
    'The model provider was overloaded and did not answer. Nothing was lost; try again in a moment.',
  raw: '529 Overloaded',
}

const AGENT: ChatStopNotice = {
  cause: 'agent',
  featureTitle: FEATURE,
  reason:
    'The agent tried three times, and the type check still fails: src/mcpServer/McpServer.test.ts line 1778 passes an unknown value where a string is expected.',
  raw: "TS2345 src/mcpServer/McpServer.test.ts:1778:23\n  Argument of type 'unknown' is not assignable to parameter of type 'string'.",
}

const TURNS: ChatStopNotice = {
  cause: 'turns',
  featureTitle: FEATURE,
  reason:
    'The agent used all 50 of its turns before finishing this feature. Its work so far is kept; another run carries on from it.',
  raw: 'Agent loop exceeded max turns (50)',
  turnLimit: 50,
}

const NOTICES: Record<string, ChatStopNotice> = {
  overseer: OVERSEER,
  provider: PROVIDER,
  agent: AGENT,
  turns: TURNS,
}

const BEFORE: ChatMessageLike = {
  id: 'before',
  role: 'assistant',
  content: 'Running the three changed test files again, one at a time.',
}

/** The notice as the chat lays it out: the last row, with the chat's retry and its actions. */
function StopRow({ notice, actions = true }: { notice: ChatStopNotice; actions?: boolean }) {
  const messages: ChatMessageLike[] = [
    BEFORE,
    { id: 'stop', role: 'system', content: 'Error', error: notice.raw, stopNotice: notice },
  ]
  const rows = (
    <div className="flex max-w-3xl flex-col gap-3">
      {messages.map((msg, i) => (
        <MessageRow
          key={msg.id}
          msg={msg}
          globalIndex={i}
          totalMessages={messages.length}
          isThinking={false}
          isLast={i === messages.length - 1}
          prevUserMessagesLen={messages.length}
          enhancedTotalLength={messages.length}
          onRetry={noop}
        />
      ))}
    </div>
  )
  return actions ? <ChatActionsProvider value={ACTIONS}>{rows}</ChatActionsProvider> : rows
}

/** The card on its own, as a set of controls or a state asks. */
function Card({ notice, details = false }: { notice: ChatStopNotice; details?: boolean }) {
  return (
    <ChatActionsProvider value={ACTIONS}>
      <div className="max-w-3xl">
        <ChatStopCard
          key={`${notice.cause}-${details}-${notice.repeats ?? 0}`}
          notice={notice}
          restart={{ via: 'retry', title: 'Retry the last action', disabled: false }}
          onRestart={noop}
          defaultShowDetails={details}
        />
      </div>
    </ChatActionsProvider>
  )
}

function Phone({ children }: { children: ReactNode }) {
  return <div className="w-[375px] max-w-full">{children}</div>
}

export const CHAT_STOP_SCENES: Scene[] = [
  {
    id: 'chat-stop-card',
    title: 'Stop card',
    component: 'MessageRow (ChatStopCard)',
    group: 'Chat',
    description:
      'One card when a turn or a story run stops, in place of a red error box and an “errored” line: whose problem it was, what happened and what to do next, with the raw error under Show details.',
    states: [
      {
        id: 'overseer',
        title: 'Overseer fault',
        description:
          'Overseer’s own fault, not the agent’s: an amber pill, Try again and Open the changes.',
        render: () => <StopRow notice={OVERSEER} />,
      },
      {
        id: 'provider',
        title: 'The model provider failed',
        description:
          'A chat’s own turn the provider failed: “This turn stopped”, no feature named.',
        render: () => <StopRow notice={PROVIDER} />,
      },
      {
        id: 'agent',
        title: 'The agent’s work failed',
        description:
          'The agent’s checks kept failing: a red pill, and Ask the agent to fix it drafts a message from the reason.',
        render: () => <StopRow notice={AGENT} />,
      },
      {
        id: 'turns',
        title: 'Out of turns',
        description: 'Nothing failed: a neutral pill, and Carry on with as many turns again.',
        render: () => <StopRow notice={TURNS} />,
      },
      {
        id: 'details-open',
        title: 'Details shown',
        description: 'Show details opened: the raw error in a monospace block under the actions.',
        render: () => <Card notice={OVERSEER} details />,
      },
      {
        id: 'failed-again',
        title: 'Failed again',
        description:
          'The same failure a third time in a row: the card says so instead of a new box.',
        render: () => <StopRow notice={{ ...OVERSEER, repeats: 3 }} />,
      },
      {
        id: 'outside-a-chat',
        title: 'Outside a chat body',
        description:
          'With no chat around it to open changes or draft a message: only Try again and Show details.',
        render: () => <StopRow notice={AGENT} actions={false} />,
      },
      {
        id: 'old-error',
        title: 'Old error, no notice',
        description:
          'The look-alike it replaces: an error written before stop notices keeps today’s red box.',
        render: () => (
          <div className="flex max-w-3xl flex-col gap-3">
            <MessageRow
              msg={{ id: 'old', role: 'system', content: 'Error', error: OVERSEER.raw }}
              globalIndex={0}
              totalMessages={1}
              isThinking={false}
              isLast
              prevUserMessagesLen={1}
              enhancedTotalLength={1}
              onRetry={noop}
            />
          </div>
        ),
      },
      {
        id: 'phone-agent',
        title: 'On a phone, the agent’s work failed',
        description: 'At a phone’s width: the pill and the actions wrap under the title.',
        render: () => (
          <Phone>
            <StopRow notice={{ ...AGENT, repeats: 2 }} />
          </Phone>
        ),
      },
      {
        id: 'phone-details',
        title: 'On a phone, details shown',
        description: 'At a phone’s width with the raw error shown.',
        render: () => (
          <Phone>
            <Card notice={TURNS} details />
          </Phone>
        ),
      },
    ],
    controls: [
      {
        id: 'cause',
        label: 'Why it stopped',
        kind: 'choice',
        options: [
          { id: 'overseer', label: 'Overseer fault' },
          { id: 'provider', label: 'The model provider failed' },
          { id: 'agent', label: 'The agent’s work failed' },
          { id: 'turns', label: 'Out of turns' },
        ],
        default: 'overseer',
      },
      { id: 'details', label: 'Details shown', kind: 'toggle', default: false },
      { id: 'again', label: 'Failed again', kind: 'toggle', default: false },
    ],
    presets: [
      { id: 'overseer-fault', name: 'Overseer fault', values: { cause: 'overseer' } },
      { id: 'agent-failed', name: 'The agent’s work failed', values: { cause: 'agent' } },
      { id: 'out-of-turns', name: 'Out of turns', values: { cause: 'turns' } },
    ],
    play: (values) => {
      const notice = NOTICES[values.cause ?? 'overseer'] ?? OVERSEER
      return (
        <Card
          notice={values.again === 'true' ? { ...notice, repeats: 2 } : notice}
          details={values.details === 'true'}
        />
      )
    },
  },
]
