import { parseTicketStatuses } from './colleagueReviewSource'
import {
  GROUP_TICKET_NEW_TAB,
  GROUP_TICKET_SIDE_LABELS,
  GROUP_TICKET_STATUS_CATEGORIES,
  GROUP_TICKET_STATUS_CATEGORY_LABELS,
  GROUP_TICKET_TAB_ACTION_LABELS,
  GROUP_TICKET_TAB_ACTIONS,
  GROUP_TICKET_TABS_MAX,
} from './groupTicketTabConstants'
import { groupTicketTabSummary } from './groupTicketTabs'
import type {
  GroupTicketSide,
  GroupTicketTab,
  GroupTicketTabsChange,
  GroupTicketTabsEditorState,
  GroupTicketTabsEditorView,
  GroupTicketTabSideView,
} from './groupTicketTabTypes'

/** The first `tab-N` no tab has. */
function freeTabId(tabs: readonly GroupTicketTab[]): string {
  const taken = new Set(tabs.map((t) => t.id))
  let n = 1
  while (taken.has(`tab-${n}`)) n++
  return `tab-${n}`
}

function withTab(
  tabs: GroupTicketTab[],
  id: string,
  change: (tab: GroupTicketTab) => GroupTicketTab | undefined,
): GroupTicketTab[] {
  const at = tabs.findIndex((t) => t.id === id)
  if (at < 0) return tabs
  const changed = change(tabs[at]!)
  if (changed === tabs[at]) return tabs
  return changed ? tabs.map((t, i) => (i === at ? changed : t)) : tabs.filter((_, i) => i !== at)
}

/**
 * The tabs after one change in the editor. A change that changes nothing —
 * an empty name, a move past either end, a tab not there, one tab more than
 * a group may have — answers the same tabs. Pure.
 */
export function changeGroupTicketTabs(
  tabs: GroupTicketTab[],
  change: GroupTicketTabsChange,
): GroupTicketTab[] {
  switch (change.kind) {
    case 'add':
      if (tabs.length >= GROUP_TICKET_TABS_MAX) return tabs
      return [
        ...tabs,
        {
          id: freeTabId(tabs),
          name: GROUP_TICKET_NEW_TAB.name,
          statuses: [],
          sprint: GROUP_TICKET_NEW_TAB.sprint,
          yours: [...GROUP_TICKET_NEW_TAB.yours],
          others: [...GROUP_TICKET_NEW_TAB.others],
        },
      ]
    case 'rename': {
      const name = change.name.trim()
      return withTab(tabs, change.id, (tab) => (name && name !== tab.name ? { ...tab, name } : tab))
    }
    case 'move': {
      const at = tabs.findIndex((t) => t.id === change.id)
      const to = at + change.by
      if (at < 0 || to < 0 || to >= tabs.length) return tabs
      const moved = [...tabs]
      ;[moved[at], moved[to]] = [moved[to]!, moved[at]!]
      return moved
    }
    case 'remove':
      return withTab(tabs, change.id, () => undefined)
    case 'statuses':
      return withTab(tabs, change.id, (tab) => ({
        ...tab,
        statuses: parseTicketStatuses(change.text),
      }))
    case 'category':
      return withTab(tabs, change.id, (tab) => {
        const held = new Set(tab.categories ?? [])
        if (held.has(change.category)) held.delete(change.category)
        else held.add(change.category)
        return { ...tab, categories: GROUP_TICKET_STATUS_CATEGORIES.filter((c) => held.has(c)) }
      })
    case 'sprint':
      return withTab(tabs, change.id, (tab) => ({ ...tab, sprint: change.sprint }))
    case 'action':
      return withTab(tabs, change.id, (tab) => {
        const held = tab[change.side]
        const actions = held.includes(change.action)
          ? held.filter((a) => a !== change.action)
          : [...held, change.action]
        return { ...tab, [change.side]: actions }
      })
  }
}

function sideView(tab: GroupTicketTab, side: GroupTicketSide): GroupTicketTabSideView {
  const on = new Set(tab[side])
  return {
    side,
    label: GROUP_TICKET_SIDE_LABELS[side],
    actions: GROUP_TICKET_TAB_ACTIONS.filter((a) => side === 'yours' || a !== 'replies').map(
      (action) => ({ action, label: GROUP_TICKET_TAB_ACTION_LABELS[action], on: on.has(action) }),
    ),
  }
}

/** What the tabs editor shows: each tab with what it shows, where it may move, and its actions per side. Pure. */
export function groupTicketTabsEditorView(
  state: GroupTicketTabsEditorState,
): GroupTicketTabsEditorView {
  const { tabs, readError, saving, saveError } = state
  if (!tabs) return readError ? { kind: 'failed', error: readError } : { kind: 'loading' }
  const last = tabs.tabs.length - 1
  return {
    kind: 'tabs',
    rows: tabs.tabs.map((tab, at) => ({
      tab,
      summary: groupTicketTabSummary(tab),
      canMoveUp: at > 0,
      canMoveDown: at < last,
      categories: GROUP_TICKET_STATUS_CATEGORIES.map((category) => ({
        category,
        label: GROUP_TICKET_STATUS_CATEGORY_LABELS[category],
        on: (tab.categories ?? []).includes(category),
      })),
      sides: [sideView(tab, 'yours'), sideView(tab, 'others')],
    })),
    custom: tabs.custom,
    saving: saving > 0,
    ...(saveError ? { error: saveError } : {}),
    canAdd: tabs.tabs.length < GROUP_TICKET_TABS_MAX,
  }
}
