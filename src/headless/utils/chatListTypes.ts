import type { ChatContext, ProcessRun } from 'thefactory-tools/types'

import type { ChatKind } from './chatHeaderTypes'
import type { ChatTimesShape } from './chatListEntry'
import type { ChatRowStatus } from './chatRowStatus'
import type { ProcessStatusTone } from './processView'

/** The chips over the chat list. */
export type ChatListFilter = 'all' | 'needs-you' | 'running' | 'runs' | 'stories'

/** Whose chats the list shows: one project's, or a group's own with what needs the person in its projects. */
export type ChatListScope =
  | { kind: 'project'; projectId: string }
  | { kind: 'group'; groupId: string; projectIds: readonly string[] }

/** What the list reads of a chat — a summary or a loaded chat. */
export type ChatListChat = ChatTimesShape & {
  context: ChatContext
  title?: string | null
  listHiddenAt?: string | null
}

/** The story or feature a chat is about, as the list names it. */
export type ChatListWork = {
  title: string
  status: string
  /** Its number: `#4` for a story, `#3.2` for a feature. */
  ref: string
}

/** Everything the list knows about one chat. */
export type ChatListRowInput = {
  chat: ChatListChat
  status: Pick<
    ChatRowStatus,
    'isThinking' | 'isAgentRunning' | 'unreadCount' | 'needsYou' | 'muted'
  >
  /** The process run a run chat belongs to, once it is read. */
  run?: ProcessRun
  /** The story or feature a story or feature chat is about, once it is read. */
  work?: ChatListWork
  projectName?: string
  /** The project's icon key, for a row shown outside its project. */
  projectIcon?: string
  groupName?: string
  /** The clock a run's status is read against. */
  now: number
}

/** One chat as a row of the list. */
export type ChatListRow = {
  key: string
  context: ChatContext
  kind: ChatKind
  kindLabel: string
  title: string
  sub: string
  pill?: { label: string; tone: ProcessStatusTone }
  /** How many things in the chat wait on the person. */
  needsYou: number
  running: boolean
  /** Whose ink the running droplets are: a process run's or a chat agent's. */
  runningChannel: 'processes' | 'chat'
  /** Messages the person has not read yet. */
  fresh: boolean
  lastActivityAt?: string
  /** The person hid it from their list. */
  hidden: boolean
  /** The person set it to tell them nothing: no number, no dot. */
  muted: boolean
  projectId?: string
  projectName?: string
  projectIcon?: string
}

/** A run of rows under one heading; `label` absent for the list's single section. */
export type ChatListSection = {
  id: 'chats' | 'archived' | 'group-chats' | 'group-needs-you' | 'group-running' | 'group-runs'
  label?: string
  tone?: 'neutral' | 'needs-you' | 'running'
  rows: ChatListRow[]
}

/** The line the list shows after a chat leaves or comes back to it, with what Undo puts back. */
export type ChatListNotice = {
  text: string
  /** The chat Undo shows in the list again. */
  undo?: ChatContext
}
