import type { ChatContext, ProcessRun } from 'thefactory-tools/types'
import {
  getChatContextKey,
  isAgentRunChatContext,
  isChatHiddenFromList,
  processStepStates,
} from 'thefactory-tools/utils'

import { assistantArchivedNotice, assistantBackNotice } from './assistantConstants'
import { chatChannelOf } from './chatChannel'
import { chatKindOf, chatWorkPill } from './chatHeader'
import { CHAT_KIND_VIEW } from './chatHeaderConstants'
import type { ChatKind } from './chatHeaderTypes'
import {
  CHAT_LIST_COPY,
  CHAT_LIST_GROUP_MAIN_TITLE,
  CHAT_LIST_SUBS,
  chatListShownNotice,
} from './chatListConstants'
import { chatLastActivityAt } from './chatListEntry'
import type {
  ChatListFilter,
  ChatListNotice,
  ChatListRow,
  ChatListRowInput,
  ChatListScope,
  ChatListSection,
} from './chatListTypes'
import { formatChatTitle } from './chatTitle'
import { processRunBadge } from './processView'
import { isStoryStatus } from './status'

/** Whether a chat belongs in the chat list: not an assistant conversation, nor an agent run's own chat. Pure. */
export function isChatInChatList(context: ChatContext): boolean {
  return chatKindOf(context) !== 'assistant' && !isAgentRunChatContext(context)
}

const QUIET_STATUS: ChatListRowInput['status'] = {
  isThinking: false,
  isAgentRunning: false,
  unreadCount: 0,
  needsYou: 0,
  muted: false,
}

function isRunWorking(run: ProcessRun | undefined): boolean {
  if (!run) return false
  return (
    run.status === 'running' ||
    run.status === 'pending' ||
    run.integration?.status === 'integrating'
  )
}

function rowTitle(input: ChatListRowInput, kind: ChatKind): string {
  const { chat, run, work } = input
  const stored = chat.title?.trim() || undefined
  switch (kind) {
    case 'run':
      return run?.title ?? stored ?? CHAT_KIND_VIEW.run.label
    case 'story':
    case 'feature':
      return work?.title ?? formatChatTitle({ context: chat.context })
    case 'request':
      return stored ?? CHAT_KIND_VIEW.request.label
    case 'group':
      return chat.context.type === 'GROUP'
        ? CHAT_LIST_GROUP_MAIN_TITLE
        : (stored ?? CHAT_LIST_SUBS.topic)
    default:
      return formatChatTitle({
        context: chat.context,
        chatTitle: stored,
        projectName: input.projectName,
      })
  }
}

function runSub(run: ProcessRun | undefined): string {
  if (!run) return CHAT_KIND_VIEW.run.label
  if (run.status === 'parked' && run.park) return run.park.message
  const current = processStepStates(run).find((s) => s.current)
  return current?.step.name ?? run.plan.name
}

function rowSub(input: ChatListRowInput, kind: ChatKind): string {
  const { chat, run, work } = input
  switch (kind) {
    case 'run':
      return runSub(run)
    case 'story':
      return work ? CHAT_LIST_SUBS.story(work.ref) : CHAT_KIND_VIEW.story.label
    case 'feature':
      return work ? CHAT_LIST_SUBS.feature(work.ref) : CHAT_KIND_VIEW.feature.label
    case 'request':
      return CHAT_LIST_SUBS.request
    case 'group':
      return chat.context.type === 'GROUP'
        ? CHAT_LIST_SUBS.group(input.groupName)
        : CHAT_LIST_SUBS.groupTopic
    case 'topic':
      return CHAT_LIST_SUBS.topic
    default:
      return CHAT_LIST_SUBS.project
  }
}

function rowPill(input: ChatListRowInput, kind: ChatKind): ChatListRow['pill'] {
  if (kind === 'run') return input.run ? processRunBadge(input.run, input.now) : undefined
  const work = kind === 'story' || kind === 'feature' ? input.work : undefined
  if (!work || !isStoryStatus(work.status)) return undefined
  return chatWorkPill(work.status)
}

/**
 * One chat as the list shows it: its kind, title and the line under it, the
 * status pill of the run, story or feature it is about, how much waits on the
 * person in it (its own asks and needs-you messages), whether something works
 * in it, unread news and whether the person hid it from the list. A chat that
 * counts on Processes (`chatChannelOf`) — a process run's — shows none of that:
 * what waits, runs or is unread in it is told on its run. Pure.
 */
export function chatListRow(input: ChatListRowInput): ChatListRow {
  const { chat, run } = input
  const kind = chatKindOf(chat.context)
  const onChat = chatChannelOf(chat.context) === 'chat'
  const status = onChat ? input.status : QUIET_STATUS
  const runWorking = onChat && isRunWorking(run)
  const pill = rowPill(input, kind)
  const lastActivityAt = chatLastActivityAt(chat)
  return {
    key: getChatContextKey(chat.context),
    context: chat.context,
    kind,
    kindLabel: CHAT_KIND_VIEW[kind].label,
    title: rowTitle(input, kind),
    sub: rowSub(input, kind),
    ...(pill ? { pill } : {}),
    needsYou: status.muted ? 0 : status.needsYou,
    running: status.isThinking || status.isAgentRunning || runWorking,
    runningChannel: runWorking ? 'processes' : 'chat',
    fresh: status.unreadCount > 0,
    ...(lastActivityAt ? { lastActivityAt } : {}),
    hidden: isChatHiddenFromList({ listHiddenAt: chat.listHiddenAt ?? undefined }),
    muted: input.status.muted,
    ...(chat.context.projectId ? { projectId: chat.context.projectId } : {}),
    ...(input.projectName ? { projectName: input.projectName } : {}),
    ...(input.projectIcon ? { projectIcon: input.projectIcon } : {}),
  }
}

function activityMs(row: ChatListRow): number {
  const ms = Date.parse(row.lastActivityAt ?? '')
  return Number.isNaN(ms) ? -Infinity : ms
}

/** The list's order: what needs the person, then what runs, then the most recent. Pure. */
export function byChatListAttention(a: ChatListRow, b: ChatListRow): number {
  const needs = Number(b.needsYou > 0) - Number(a.needsYou > 0)
  if (needs !== 0) return needs
  const running = Number(b.running) - Number(a.running)
  if (running !== 0) return running
  const at = activityMs(b) - activityMs(a)
  return Number.isNaN(at) ? 0 : at
}

/**
 * Whether a row stays under a filter chip. A process run's chat stays only
 * under Runs — it counts on Processes, never with the chats. Pure.
 */
export function matchesChatListFilter(row: ChatListRow, filter: ChatListFilter): boolean {
  if (filter === 'runs') return row.kind === 'run'
  if (chatChannelOf(row.context) !== 'chat') return false
  switch (filter) {
    case 'needs-you':
      return row.needsYou > 0
    case 'running':
      return row.running
    case 'stories':
      return row.kind === 'story' || row.kind === 'feature'
    default:
      return true
  }
}

/** How many rows each filter chip keeps. Pure. */
export function chatListFilterCounts(rows: readonly ChatListRow[]): Record<ChatListFilter, number> {
  const count = (filter: ChatListFilter) =>
    rows.filter((r) => matchesChatListFilter(r, filter)).length
  return {
    all: count('all'),
    'needs-you': count('needs-you'),
    running: count('running'),
    runs: count('runs'),
    stories: count('stories'),
  }
}

/**
 * Whether a chat can be in a scope's list at all — a project's own chats, or a
 * group's own and its projects'. Read before a row is built, so a list never
 * works out rows (and reads other projects' stories for them) that it cannot
 * show. Pure.
 */
export function isChatInScopePool(context: ChatContext, scope: ChatListScope): boolean {
  if (scope.kind === 'project') return context.projectId === scope.projectId
  if (context.groupId === scope.groupId) return true
  return context.projectId !== undefined && scope.projectIds.includes(context.projectId)
}

function isGroupsOwn(row: ChatListRow, groupId: string): boolean {
  return row.kind === 'group' && row.context.groupId === groupId
}

/**
 * The rows a scope's list draws from, before a filter: a project's chats, or a
 * group's own chats with whatever needs the person or runs in its projects,
 * and its projects' process run chats (only Runs shows them).
 * The archived view draws from the chats hidden from the list — a group's own
 * only — and the current view from the rest. Pure.
 */
export function chatListPool(
  rows: readonly ChatListRow[],
  scope: ChatListScope,
  archived: boolean,
): ChatListRow[] {
  return rows.filter((row) => {
    if (row.hidden !== archived) return false
    if (scope.kind === 'project') return row.projectId === scope.projectId
    if (isGroupsOwn(row, scope.groupId)) return true
    if (archived || row.projectId === undefined) return false
    return (
      scope.projectIds.includes(row.projectId) &&
      (row.needsYou > 0 || row.running || row.kind === 'run')
    )
  })
}

/**
 * The list as drawn: one project's chats in one section; a group's own chats,
 * then what needs the person and what runs in its projects, then its
 * projects' run chats, each in its own section, empty ones left out; or the
 * archived chats, quiet. Pure.
 */
export function chatListSections(input: {
  rows: readonly ChatListRow[]
  scope: ChatListScope
  filter: ChatListFilter
  archived: boolean
}): ChatListSection[] {
  const { scope, filter, archived } = input
  const pool = chatListPool(input.rows, scope, archived).sort(byChatListAttention)
  if (archived) {
    return [
      {
        id: 'archived',
        rows: pool.map((r) => ({ ...r, needsYou: 0, running: false, fresh: false })),
      },
    ]
  }
  const visible = pool.filter((r) => matchesChatListFilter(r, filter))
  if (scope.kind === 'project') return [{ id: 'chats', rows: visible }]
  const own = visible.filter((r) => isGroupsOwn(r, scope.groupId))
  const elsewhere = visible.filter((r) => !isGroupsOwn(r, scope.groupId))
  const sections: ChatListSection[] = [
    { id: 'group-chats', label: CHAT_LIST_COPY.groupChats, tone: 'neutral', rows: own },
    {
      id: 'group-needs-you',
      label: CHAT_LIST_COPY.groupNeedsYou,
      tone: 'needs-you',
      rows: elsewhere.filter((r) => r.needsYou > 0),
    },
    {
      id: 'group-running',
      label: CHAT_LIST_COPY.groupRunning,
      tone: 'running',
      rows: elsewhere.filter((r) => r.needsYou === 0 && r.running),
    },
    {
      id: 'group-runs',
      label: CHAT_LIST_COPY.groupRuns,
      tone: 'neutral',
      rows: elsewhere.filter((r) => chatChannelOf(r.context) === 'processes'),
    },
  ]
  return sections.filter((s) => s.rows.length > 0)
}

/**
 * What the list says once a chat is archived from it, with Undo bringing it
 * back — an Assistant conversation by its name. Pure.
 */
export function chatListHiddenNotice(context: ChatContext, title?: string): ChatListNotice {
  const text =
    chatKindOf(context) === 'assistant' ? assistantArchivedNotice(title) : CHAT_LIST_COPY.hidden
  return { text, undo: context }
}

/** What the list says once a chat is back in it, by its name when it has one. Pure. */
export function chatListBackNotice(context: ChatContext, title?: string): ChatListNotice {
  return {
    text:
      chatKindOf(context) === 'assistant' ? assistantBackNotice(title) : chatListShownNotice(title),
  }
}

/** A chat as the list holds it once it left the list (`listHiddenAt`) or came back (`undefined`). Pure. */
export function withChatListHidden<T extends { listHiddenAt?: string | null }>(
  entry: T,
  listHiddenAt: string | undefined,
): T {
  const { listHiddenAt: _listHiddenAt, ...rest } = entry
  return (listHiddenAt === undefined ? rest : { ...rest, listHiddenAt }) as T
}
