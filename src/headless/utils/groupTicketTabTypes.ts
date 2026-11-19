import type { ProcessStatusTone } from './processView'

/** Which sprint a tab's tickets are in: the open one, none that is open, or either. */
export type GroupTicketTabSprint = 'open' | 'not-open' | 'any'

/** What a tab offers on a ticket. */
export type GroupTicketTabAction =
  | 'take'
  | 'carry-on'
  | 'discuss'
  | 'review'
  | 'replies'
  | 'approve-and-merge'

/** Jira's status categories: to do, in progress, done. */
export type GroupTicketStatusCategory = 'new' | 'indeterminate' | 'done'

/** One tab of a group's Tickets tab: the tickets in its statuses and sprint, and what each side may do. */
export interface GroupTicketTab {
  id: string
  name: string
  /** Jira status names; with no categories either, any status. */
  statuses: string[]
  /** A ticket whose status is in one of these categories matches too. */
  categories?: GroupTicketStatusCategory[]
  sprint: GroupTicketTabSprint
  /** What the person may do on their own tickets. */
  yours: GroupTicketTabAction[]
  /** What the person may do on everyone else's. */
  others: GroupTicketTabAction[]
}

/** A group's tabs as the backend tells them; `custom` is false while they are the defaults. */
export interface GroupTicketTabs {
  tabs: GroupTicketTab[]
  custom: boolean
}

/** A ticket's replies to the person's own update and comments on their pull requests. */
export interface GroupTicketReplies {
  slack: number
  github: number
  /** When the newest one came. */
  latest?: string
}

/** One tab on the tab bar. */
export interface GroupTicketTabItem {
  id: string
  label: string
  /** How many tickets it holds; absent until a read said. */
  count: number | undefined
}

/** A row's replies in a line, with how long ago the newest came. */
export interface GroupTicketRepliesView {
  /** "2 Slack replies · 1 GitHub comment". */
  line: string
  /** "3 hours ago". */
  when?: string
  /** None of either yet. */
  none: boolean
}

/** Which side of a tab a row is on. */
export type GroupTicketSide = 'yours' | 'others'

/** One side of a tab in the editor. */
export interface GroupTicketTabSideView {
  side: GroupTicketSide
  label: string
  /** Every action, ticked or not, in the order they show on a row. */
  actions: { action: GroupTicketTabAction; label: string; on: boolean }[]
}

/** A tab as the editor shows it. */
export interface GroupTicketTabEditorRow {
  tab: GroupTicketTab
  /** "In Review, Code Review · in the open sprint". */
  summary: string
  canMoveUp: boolean
  canMoveDown: boolean
  /** Each status category, ticked or not. */
  categories: { category: GroupTicketStatusCategory; label: string; on: boolean }[]
  sides: GroupTicketTabSideView[]
}

/** What the tabs editor shows. */
export type GroupTicketTabsEditorView =
  | { kind: 'loading' }
  | { kind: 'failed'; error: string }
  | {
      kind: 'tabs'
      rows: GroupTicketTabEditorRow[]
      /** The tabs are the group's own: Reset to default is offered. */
      custom: boolean
      /** A change is on its way. */
      saving: boolean
      /** Why the last change did not go through: it was undone. */
      error?: string
      canAdd: boolean
    }

/** The editor's tabs and what the backend holds, as the store keeps them. */
export interface GroupTicketTabsEditorState {
  /** What shows: the saved tabs with the person's changes on their way. */
  tabs: GroupTicketTabs | undefined
  readError: string | null
  /** Changes sent and not yet answered. */
  saving: number
  saveError: string | null
}

/** A tab's status in a line on the ticket page. */
export interface GroupTicketToneLabel {
  label: string
  tone: ProcessStatusTone
}

/** One change the person makes in the tabs editor. */
export type GroupTicketTabsChange =
  | { kind: 'add' }
  | { kind: 'rename'; id: string; name: string }
  | { kind: 'move'; id: string; by: -1 | 1 }
  | { kind: 'remove'; id: string }
  | { kind: 'statuses'; id: string; text: string }
  | { kind: 'category'; id: string; category: GroupTicketStatusCategory }
  | { kind: 'sprint'; id: string; sprint: GroupTicketTabSprint }
  | { kind: 'action'; id: string; side: GroupTicketSide; action: GroupTicketTabAction }
