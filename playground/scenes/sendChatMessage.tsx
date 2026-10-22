import { useState, type ReactNode } from 'react'
import { getChatContextKey } from 'thefactory-tools/utils'
import { SendChatMessageCard, ToolCallCard } from 'thefactory-ui/web'
import { sendChatMessageView } from 'thefactory-ui/headless'
// Not on the package's public surface — same approach as playground/scenes/chat.tsx.
import ApprovalPanel, { type ApprovalPanelProps } from '../../src/web/compound/chat/ApprovalPanel'
import type { Scene } from '../showcase/types'

/**
 * Every state of the sendChatMessage approval card — dock (shared tool-ask
 * message body), inline tool row, decided outcomes, malformed fallback. Fixed
 * sample data so a state's URL captures the same pixels every load.
 *
 * Fixtures use the real backend payload shape (ChatMessageSendApprovalDetail):
 * targetTitle = chat title, targetLabel = host readable name, chatId = a real
 * chat context key. A held result has delivered:false and agentStarted:false.
 *
 * Scene id `send-chat-message` is the URL verifiers open (`/?scene=send-chat-message`).
 * Main's existing dock state also lives at `/?scene=approval-panel&state=send-message`.
 */

const TARGET_PROJECT_ID = 'thefactory-backend'
const TARGET_CHAT_ID = getChatContextKey({
  type: 'PROJECT',
  projectId: TARGET_PROJECT_ID,
} as never)
const TARGET_CHAT_TITLE = 'Release prep'
const TARGET_LABEL = `chat "${TARGET_CHAT_TITLE}" in project ${TARGET_PROJECT_ID}`

const DETAIL = {
  targetChatId: TARGET_CHAT_ID,
  targetProjectId: TARGET_PROJECT_ID,
  targetTitle: TARGET_CHAT_TITLE,
  targetLabel: TARGET_LABEL,
}

const ARGS = {
  chatId: TARGET_CHAT_ID,
  projectId: TARGET_PROJECT_ID,
  awaitReply: true,
  message: [
    'Please **add** the `sendChatMessage` tool to the chat tools.',
    '',
    '- It posts into another chat as the user would',
    '- It may wait for a reply there',
    '',
    'See [the docs](https://example.com/docs) for details.',
    '',
    ...Array.from({ length: 16 }, (_, i) => `Detail line ${i + 1} of the plan.`),
  ].join('\n'),
}

const CODE = [
  'Apply this patch:',
  '',
  '```ts',
  ...Array.from({ length: 16 }, (_, i) => `registerTool('tool${i + 1}')`),
  '```',
].join('\n')

const SHORT = {
  chatId: TARGET_CHAT_ID,
  projectId: TARGET_PROJECT_ID,
  message: 'Ship the **release notes** today.',
  awaitReply: false,
}

const onResourceLink = (link: unknown) => console.info('open', link)

type Grant = ApprovalPanelProps['grant']

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-2xl rounded-xl border border-(--border-subtle) bg-(--surface-base) p-3">
      {children}
    </div>
  )
}

function DockPanel() {
  const [decided, setDecided] = useState<string | null>(null)
  const grant = {
    id: 'g1',
    chatRunner: 'cli',
    label: 'sendChatMessage',
    toolName: 'mcp__thefactory__sendChatMessage',
    args: ARGS,
    detail: { tool: 'sendChatMessage', args: ARGS, detail: DETAIL },
    alwaysAllowScopes: ['chat'],
    decide: async (d: string) => setDecided(d),
  } as unknown as Grant
  return (
    <Frame>
      {decided ? (
        <p className="text-[13px]">Decided: {decided}</p>
      ) : (
        <ApprovalPanel
          grant={grant}
          chatTitle="Group planning"
          onResourceLink={onResourceLink}
          onDecideLater={() => setDecided('later')}
        />
      )}
    </Frame>
  )
}

export const SEND_CHAT_MESSAGE_SCENES: Scene[] = [
  {
    id: 'send-chat-message',
    title: 'sendChatMessage approval card',
    component: 'SendChatMessagePreview',
    group: 'Chat',
    description:
      'Agent-to-agent message approval on the shared tool-ask card: route, markdown body, await-reply, sender label, outcome link.',
    states: [
      {
        id: 'dock-awaiting',
        title: 'Dock approval panel (awaiting)',
        description: 'Shared tool-ask card: await-reply switch, scopes, long message folded.',
        render: () => <DockPanel />,
      },
      {
        id: 'long-message-unfolded',
        title: 'Long message unfolded',
        render: () => (
          <Frame>
            <SendChatMessageCard
              view={sendChatMessageView({
                args: ARGS,
                detail: { tool: 'sendChatMessage', args: ARGS, detail: DETAIL },
              })}
              sourceChatTitle="Group planning"
              onResourceLink={onResourceLink as never}
              defaultExpanded
            />
          </Frame>
        ),
      },
      {
        id: 'long-message-folded-in-code',
        title: 'Long message folded inside a code block',
        render: () => (
          <Frame>
            <SendChatMessageCard
              view={sendChatMessageView({
                args: { ...ARGS, awaitReply: false, message: CODE },
                detail: { tool: 'sendChatMessage', args: {}, detail: DETAIL },
              })}
              sourceChatTitle="Group planning"
            />
          </Frame>
        ),
      },
      {
        id: 'inline-tool-row',
        title: 'Inline tool row (awaiting)',
        description: 'Sender label reads Group planning.',
        render: () => (
          <Frame>
            <ToolCallCard
              toolCall={
                {
                  name: 'mcp__thefactory__sendChatMessage',
                  arguments: SHORT,
                } as never
              }
              resultType="require_confirmation"
              onResourceLink={onResourceLink as never}
              sourceChatTitle="Group planning"
            />
          </Frame>
        ),
      },
      {
        id: 'decided-sent',
        title: 'Decided — sent',
        description: 'Delivered + agentStarted (not held — held means delivered:false).',
        render: () => (
          <Frame>
            <SendChatMessageCard
              view={sendChatMessageView({
                args: SHORT,
                detail: { tool: 'sendChatMessage', args: SHORT, detail: DETAIL },
                resultType: 'success',
                result: {
                  delivered: true,
                  held: false,
                  chatTitle: TARGET_CHAT_TITLE,
                  agentStarted: true,
                  awaitingReply: false,
                },
              })}
              sourceChatTitle="Group planning"
              onResourceLink={onResourceLink as never}
            />
          </Frame>
        ),
      },
      {
        id: 'decided-denied',
        title: 'Decided — denied',
        description: 'Declined outcome with Open target chat.',
        render: () => (
          <Frame>
            <SendChatMessageCard
              view={sendChatMessageView({
                args: SHORT,
                detail: { tool: 'sendChatMessage', args: SHORT, detail: DETAIL },
                resultType: 'not_allowed',
                result: { reason: 'You declined this.' },
              })}
              sourceChatTitle="Group planning"
              onResourceLink={onResourceLink as never}
            />
          </Frame>
        ),
      },
      {
        id: 'malformed',
        title: 'Malformed payload',
        render: () => (
          <Frame>
            <SendChatMessageCard view={sendChatMessageView({ args: { note: 'no target' } })} />
          </Frame>
        ),
      },
      {
        id: 'malformed-raw-open',
        title: 'Malformed payload, raw JSON open',
        render: () => (
          <Frame>
            <SendChatMessageCard
              view={sendChatMessageView({
                args: { message: 'Where does this go?', note: 'no target' },
              })}
              defaultRawOpen
            />
          </Frame>
        ),
      },
    ],
  },
]
