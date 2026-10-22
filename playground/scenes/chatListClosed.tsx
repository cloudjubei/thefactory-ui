import { useEffect, useRef, type ReactNode } from 'react'
import type { ChatContext, ProcessRun } from 'thefactory-tools/types'
import { getChatContextKey } from 'thefactory-tools/utils'
import { ChatSettingsMenu } from 'thefactory-ui/web'
import {
  ASSISTANT_COPY,
  assistantConversationRows,
  CHAT_LIST_COPY,
  CHAT_NOTIFY_LEVEL_LABELS,
  chatListRow,
  chatListSections,
  chatSettingsMenuItems,
  computeChatRowStatus,
  DEFAULT_APP_SETTINGS,
  inkBadgeLook,
  isChatArchivedFromList,
  processRunChatContext,
  type AssistantChat,
  type ChatListChat,
  type ChatListScope,
} from 'thefactory-ui/headless'
// Not on the package's public surface: the chat list draws its sections, the Assistant's list
// its rows. The showcase reaches into the source for them.
import { AssistantConversationRow } from '../../src/web/compound/chat/AssistantConversationList'
import { ChatListSectionView } from '../../src/web/compound/chat/ChatList'
import type { Scene } from '../showcase/types'

const noop = () => {}
const NOW = 1_760_000_000_000
const CLOSED_AT = '2026-10-20T14:00:00Z'
const LOOK = inkBadgeLook(DEFAULT_APP_SETTINGS.userPreferences)
const BADGE_COLORS = DEFAULT_APP_SETTINGS.notifications.badgeColors
const SCOPE: ChatListScope = { kind: 'project', projectId: 'p1' }

const REQUEST: ChatContext = { type: 'FEATURE_REQUEST', projectId: 'p1', featureRequestId: 'r1' }
const ASKING_REQUEST: ChatContext = {
  type: 'FEATURE_REQUEST',
  projectId: 'p1',
  featureRequestId: 'r2',
}
const TOPIC: ChatContext = { type: 'PROJECT_TOPIC', projectId: 'p1', topicId: 't1' }
const PROJECT: ChatContext = { type: 'PROJECT', projectId: 'p1' }

const FINISHED_RUN = {
  id: 'run-export',
  projectId: 'p1',
  title: 'CSV export for invoices',
  status: 'succeeded',
  loopCounts: {},
  ledger: [],
  startedAt: 0,
  updatedAt: 0,
  plan: {
    definitionId: 'story',
    definitionScope: 'global',
    definitionVersion: 1,
    name: 'Story',
    steps: [{ id: 'build', name: 'Build', kind: 'agent', agentType: 'developer' }],
    loops: [],
    frozenAt: 0,
  },
} satisfies ProcessRun
const RUN_CHAT = processRunChatContext(FINISHED_RUN)

const project: ChatListChat = {
  context: PROJECT,
  messageTimes: ['2026-10-21T09:00:00Z'],
}
const request: ChatListChat = {
  context: REQUEST,
  title: 'Detect a run’s web app from its project',
  messageTimes: ['2026-10-15T09:00:00Z', '2026-10-15T12:00:00Z'],
}
const handedOver: ChatListChat = { ...request, archivedAt: CLOSED_AT }
const asking: ChatListChat = {
  context: ASKING_REQUEST,
  title: 'Type the chat-message-send approval',
  messageTimes: ['2026-10-19T10:00:00Z'],
}
const askingClosed: ChatListChat = { ...asking, archivedAt: CLOSED_AT }
const hiddenTopic: ChatListChat = {
  context: TOPIC,
  title: 'Release notes',
  listHiddenAt: '2026-10-18T00:00:00Z',
  messageTimes: ['2026-10-17T10:00:00Z'],
}
const finishedRunChat: ChatListChat = {
  context: RUN_CHAT,
  archivedAt: CLOSED_AT,
  messageTimes: ['2026-10-19T10:00:00Z'],
}

/** Every chat as the list reads it: read up to the time it was last opened, its asks counted. */
function rowsOf(chats: ChatListChat[], asks: ReadonlyMap<ChatContext, number> = new Map()) {
  return chats.map((chat) => {
    const key = getChatContextKey(chat.context)
    return chatListRow({
      chat,
      status: computeChatRowStatus({
        context: chat.context,
        contextKey: key,
        chat,
        isSending: false,
        seen: { [key]: '2026-10-21T12:00:00Z' },
        pendingAsks: asks.get(chat.context) ?? 0,
      }),
      now: NOW,
      ...(chat.context === RUN_CHAT ? { run: FINISHED_RUN } : {}),
      projectName: 'TheFactory Tools',
    })
  })
}

function Frame({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div
      className="flex flex-col gap-1 overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-base) p-1.5"
      style={{ width: 340 }}
    >
      {title ? (
        <div className="px-1.5 pt-1.5 pb-1 text-[15px] font-semibold text-(--text-primary)">
          {title}
        </div>
      ) : null}
      {children}
    </div>
  )
}

function List({
  chats,
  asks,
  archived = false,
}: {
  chats: ChatListChat[]
  asks?: ReadonlyMap<ChatContext, number>
  archived?: boolean
}) {
  const sections = chatListSections({
    rows: rowsOf(chats, asks),
    scope: SCOPE,
    filter: 'all',
    archived,
  })
  return (
    <Frame {...(archived ? { title: CHAT_LIST_COPY.archivedTitle } : {})}>
      {sections.map((section) => (
        <ChatListSectionView
          key={section.id}
          section={section}
          grouped={false}
          look={LOOK}
          badgeColors={BADGE_COLORS}
          onOpen={noop}
        />
      ))}
    </Frame>
  )
}

const ASK = new Map([[ASKING_REQUEST, 1]])
const putBack: ChatListChat = { ...handedOver, listShownAt: '2026-10-21T09:00:00Z' }

/** The chat settings menu of a chat, opened as the person opens it. */
function OpenMenu({ chat }: { chat: ChatListChat }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    ref.current?.querySelector('button')?.click()
  }, [])
  const items = chatSettingsMenuItems({
    notifyLevel: CHAT_NOTIFY_LEVEL_LABELS.everything,
    canTune: true,
    listHidden: isChatArchivedFromList(chat),
    showDeveloperTools: false,
    canDelete: true,
  })
  return (
    <div ref={ref} className="flex justify-end p-3" style={{ width: 340 }}>
      <ChatSettingsMenu items={items} onSelect={noop} />
    </div>
  )
}

const conversation = (timestamp: string, title: string, over: Partial<AssistantChat> = {}) => ({
  context: { type: 'GENERAL', timestamp } as ChatContext,
  title,
  createdAt: new Date(Number(timestamp)).toISOString(),
  messageCount: 2,
  messageTimes: [new Date(Number(timestamp) + 60_000).toISOString()],
  ...over,
})
const PLANNING = conversation('1792400000000', 'Plan the release notes')
const SETUP = conversation('1792300000000', 'Set up git for the new project')
const SETUP_CLOSED = { ...SETUP, archivedAt: CLOSED_AT }
const SETUP_HIDDEN = { ...SETUP, listHiddenAt: CLOSED_AT }

/** The Assistant's list of conversations, each read as the list reads it. */
function Conversations({
  chats,
  archived = false,
}: {
  chats: AssistantChat[]
  archived?: boolean
}) {
  const rows = assistantConversationRows({
    chats,
    archived,
    statusOf: (chat) =>
      computeChatRowStatus({
        context: chat.context,
        contextKey: getChatContextKey(chat.context),
        chat,
        isSending: false,
        seen: { [getChatContextKey(chat.context)]: '2026-10-21T12:00:00Z' },
      }),
  })
  return (
    <Frame {...(archived ? { title: ASSISTANT_COPY.archived } : {})}>
      {rows.map((row) => (
        <AssistantConversationRow
          key={row.key}
          row={row}
          active={false}
          look={LOOK}
          badgeColors={BADGE_COLORS}
          onOpen={noop}
        />
      ))}
    </Frame>
  )
}

export const CHAT_LIST_CLOSED_SCENES: Scene[] = [
  {
    id: 'chat-list-closed',
    title: 'Closed chats in the chat list',
    component: 'ChatList',
    group: 'Chat',
    description:
      'A closed chat — a handed-over request, a finished run’s chat — leaves the list for the archived chats, beside the ones the person hid. It shows in the list again only while something calls the person back to it: an ask, or a message needing them since it was closed. Web, desktop and mobile draw the same rows.',
    states: [
      {
        id: 'open-request',
        title: 'An open request in the list',
        description:
          'The look-alike base: the project chat and an incoming request still open, in the list.',
        render: () => <List chats={[project, request]} />,
      },
      {
        id: 'closed-request-left-out',
        title: 'A handed-over request left out',
        description:
          'The same chats once the request was handed over and closed: only the project chat stays in the list.',
        render: () => <List chats={[project, handedOver]} />,
      },
      {
        id: 'open-request-asking',
        title: 'An open request with an ask',
        description:
          'The look-alike base: an open request with an ask waiting on the person, first in the list with its Needs you badge.',
        render: () => <List chats={[project, asking]} asks={ASK} />,
      },
      {
        id: 'closed-request-asking',
        title: 'A closed request with an ask',
        description:
          'A closed request an ask waits in: back in the list, drawn as an open one, until the ask is answered. Asks never lapse, so closing never hides one.',
        render: () => <List chats={[project, askingClosed]} asks={ASK} />,
      },
      {
        id: 'closed-request-put-back',
        title: 'A closed request put back in the list',
        description:
          'The same chats once the person chose Show in list again on the handed-over request: it is listed again, still closed, until they archive it.',
        render: () => <List chats={[project, putBack]} />,
      },
      {
        id: 'archived-hidden',
        title: 'Archived chats: one hidden',
        description: 'The look-alike base: the archived view holding a chat the person hid.',
        render: () => <List chats={[project, hiddenTopic]} archived />,
      },
      {
        id: 'archived-closed-and-hidden',
        title: 'Archived chats: closed and hidden',
        description:
          'The archived view holding the hidden chat with the closed ones — a finished run’s chat and a handed-over request — newest first, all quiet, drawn alike.',
        render: () => <List chats={[project, hiddenTopic, handedOver, finishedRunChat]} archived />,
      },
    ],
  },
  {
    id: 'chat-closed-unarchive',
    title: 'Show a closed chat in the list again',
    component: 'ChatSettingsMenu',
    group: 'Chat',
    description:
      'The chat settings menu of a chat out of the list offers Show in list again, whether the person hid it or it was closed. Choosing it on a closed chat brings it back to the list, still closed, until they archive it again. Web, desktop and mobile read the same rows.',
    states: [
      {
        id: 'menu-hidden-chat',
        title: 'Menu of a hidden chat',
        description: 'The look-alike base: a chat the person hid offers Show in list again.',
        overlay: true,
        render: () => <OpenMenu chat={hiddenTopic} />,
      },
      {
        id: 'menu-closed-chat',
        title: 'Menu of a closed chat',
        description:
          'A handed-over request, closed and never hidden, offers Show in list again too — not Archive from list, which would do nothing it can see.',
        overlay: true,
        render: () => <OpenMenu chat={handedOver} />,
      },
      {
        id: 'menu-closed-chat-put-back',
        title: 'Menu of a closed chat put back',
        description:
          'Once put back in the list, the closed request offers Archive from list, as an open chat does.',
        overlay: true,
        render: () => <OpenMenu chat={putBack} />,
      },
    ],
  },
  {
    id: 'assistant-closed',
    title: 'Closed conversations in the Assistant',
    component: 'AssistantConversationList',
    group: 'Chat',
    description:
      'A closed Assistant conversation leaves its list for the archived ones under the same rule as the chat list: it comes back only while something calls the person back to it, or when they show it again.',
    states: [
      {
        id: 'conversations-open',
        title: 'Two open conversations',
        description: 'The look-alike base: both conversations open, newest first.',
        render: () => <Conversations chats={[PLANNING, SETUP]} />,
      },
      {
        id: 'conversation-closed-left-out',
        title: 'A closed conversation left out',
        description:
          'The same conversations once the older one was closed: only the open one stays.',
        render: () => <Conversations chats={[PLANNING, SETUP_CLOSED]} />,
      },
      {
        id: 'conversations-archived-hidden',
        title: 'Archived conversations: one hidden',
        description:
          'The look-alike base: the archived view holding a conversation the person archived.',
        render: () => <Conversations chats={[PLANNING, SETUP_HIDDEN]} archived />,
      },
      {
        id: 'conversations-archived-closed',
        title: 'Archived conversations: one closed',
        description: 'The archived view holding the closed conversation, quiet.',
        render: () => <Conversations chats={[PLANNING, SETUP_CLOSED]} archived />,
      },
    ],
  },
]
