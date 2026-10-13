import type { ChatKind } from './chatHeaderTypes'
import type {
  AgentMessagesDisplay,
  ChatNotifyKind,
  ChatNotifyLevel,
  ChatNotifyLevels,
} from './chatNotifyTypes'

/** Each kind of chat as Settings › Notifications lists it, in that order. */
export const CHAT_NOTIFY_KINDS: readonly { kind: ChatNotifyKind; label: string }[] = [
  { kind: 'run', label: 'Process run chats' },
  { kind: 'work', label: 'Story and feature chats' },
  { kind: 'request', label: 'Incoming requests' },
  { kind: 'project', label: 'Project chats' },
  { kind: 'group', label: 'Group chats' },
]

/** The levels, in the order a picker offers them. */
export const CHAT_NOTIFY_LEVELS: readonly ChatNotifyLevel[] = ['needs-me', 'everything', 'nothing']

export const CHAT_NOTIFY_LEVEL_LABELS: Record<ChatNotifyLevel, string> = {
  'needs-me': 'When it needs me',
  everything: 'Everything',
  nothing: 'Nothing',
}

/** Run chats and incoming requests reach the person only when they need them; every other chat in full. */
export const DEFAULT_CHAT_NOTIFY_LEVELS: ChatNotifyLevels = {
  run: 'needs-me',
  work: 'everything',
  request: 'needs-me',
  project: 'everything',
  group: 'everything',
}

/** A chat of no kind the person sets a level for — the assistant's — reaches them in full. */
export const CHAT_NOTIFY_LEVEL_WITHOUT_KIND: ChatNotifyLevel = 'everything'

export const AGENT_MESSAGES_DISPLAYS: readonly AgentMessagesDisplay[] = [
  'collapsed',
  'full',
  'hidden',
]

export const AGENT_MESSAGES_DISPLAY_LABELS: Record<AgentMessagesDisplay, string> = {
  collapsed: 'Collapsed',
  full: 'Shown in full',
  hidden: 'Hidden',
}

export const DEFAULT_AGENT_MESSAGES_DISPLAY: AgentMessagesDisplay = 'collapsed'

export const NOTIFY_ME_TITLE = 'Notify me'
export const NOTIFY_ME_INTRO = 'Each chat can override it from its settings menu.'
export const AGENT_MESSAGES_TITLE = 'Messages between agents'
export const AGENT_MESSAGES_HINT =
  'Manager briefs and replies, verifier hand-backs and host notes. They never count as unread.'
export const NEEDS_ME_MEANING_TITLE = 'What “needs me” means'
export const NEEDS_ME_MEANING =
  'A question, an approval, a sign-off, an incoming request, or the manager giving up and asking you.'

/** How the per-chat picker names going back to the kind's level. */
export const CHAT_NOTIFY_USE_DEFAULT = (level: ChatNotifyLevel): string =>
  `My default (${CHAT_NOTIFY_LEVEL_LABELS[level]})`

/** What a muted chat's row says of itself. */
export const CHAT_NOTIFY_MUTED_LABEL = 'Muted'

/** What "Notify me" says when a choice could not be saved. */
export const CHAT_NOTIFY_SAVE_FAILED = 'Could not save — try again.'

/** The tile each kind of chat is drawn with in the settings. */
export const CHAT_NOTIFY_KIND_TILES: Record<ChatNotifyKind, ChatKind> = {
  run: 'run',
  work: 'story',
  request: 'request',
  project: 'project',
  group: 'group',
}

/** The OS notification for news reaching a chat. */
export const CHAT_NEWS_NOTIFICATION = { title: 'New chat activity', tag: 'chat' } as const

/** The OS notification for an ask coming to wait on the person in a chat. */
export const CHAT_NEEDS_YOU_NOTIFICATION = {
  title: 'A chat needs you',
  tag: 'chat-needs-you',
} as const
