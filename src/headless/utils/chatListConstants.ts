import type { ChatListFilter } from './chatListTypes'

/** The chips over the chat list, in order. */
export const CHAT_LIST_FILTERS: readonly { id: ChatListFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'needs-you', label: 'Needs you' },
  { id: 'running', label: 'Running' },
  { id: 'runs', label: 'Runs' },
  { id: 'stories', label: 'Stories' },
]

export const CHAT_LIST_COPY = {
  title: 'Chats',
  groupTitle: (groupName: string) => `${groupName} · chats`,
  archivedTitle: 'Archived chats',
  moreOptions: 'More list options',
  showArchived: 'Show archived chats',
  backToCurrent: 'Back to current chats',
  newChat: 'New chat',
  undo: 'Undo',
  dismiss: 'Dismiss',
  groupChats: 'Group chats',
  groupNeedsYou: 'Needs you in this group',
  groupRunning: 'Running in this group',
  groupRuns: 'Runs in this group',
  needsYou: 'Needs you',
  running: 'Working',
  fresh: 'New messages',
  hidden:
    'Archived from your list. Find it under ⋯ → Show archived chats; it returns here by itself if it needs you.',
  archivedEmpty: 'No archived chats. A chat you archive from the list waits here.',
} as const

/** What the list says when a filter leaves nothing. */
export const CHAT_LIST_EMPTY: Record<ChatListFilter, string> = {
  all: 'No chats yet.',
  'needs-you': 'Nothing needs you. Agents are handling the rest.',
  running: 'Nothing is running.',
  runs: 'No process runs.',
  stories: 'No story or feature chats.',
}

/** What a row says under its title when nothing more is known. */
export const CHAT_LIST_SUBS = {
  project: 'Project chat',
  topic: 'Topic',
  request: 'Incoming request',
  groupTopic: 'Group topic',
  group: (groupName: string | undefined) => `${groupName ?? 'Group'} group chat`,
  story: (ref: string) => `Story ${ref}`,
  feature: (ref: string) => `Feature ${ref}`,
} as const

/** The name of a group's own main chat in its list. */
export const CHAT_LIST_GROUP_MAIN_TITLE = 'General'

/** A chat shown in the list again, as the list says it — by name when it has one. */
export const chatListShownNotice = (title?: string): string =>
  title ? `“${title}” is back in your list.` : 'The chat is back in your list.'

/** How long the list's notice stays before it goes by itself. */
export const CHAT_LIST_NOTICE_MS = 8000
