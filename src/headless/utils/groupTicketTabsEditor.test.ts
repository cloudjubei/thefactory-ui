import { describe, expect, it } from 'vitest'
import { changeGroupTicketTabs, groupTicketTabsEditorView } from './groupTicketTabsEditor'
import type { GroupTicketTab, GroupTicketTabsEditorState } from './groupTicketTabTypes'

const tab = (id: string, over: Partial<GroupTicketTab> = {}): GroupTicketTab => ({
  id,
  name: `Tab ${id}`,
  statuses: [],
  sprint: 'open',
  yours: ['discuss'],
  others: ['discuss'],
  ...over,
})

const TABS = [tab('a'), tab('b'), tab('c')]
const ids = (tabs: readonly GroupTicketTab[]) => tabs.map((t) => t.id)

describe('changeGroupTicketTabs', () => {
  it('adds a tab at the end with an id no tab has', () => {
    const added = changeGroupTicketTabs([tab('tab-1'), tab('tab-3')], { kind: 'add' })
    expect(added).toHaveLength(3)
    expect(added[2]).toEqual({
      id: 'tab-2',
      name: 'New tab',
      statuses: [],
      sprint: 'open',
      yours: ['discuss'],
      others: ['discuss'],
    })
  })

  it('adds no tab past the most a group may have', () => {
    const full = Array.from({ length: 12 }, (_, i) => tab(`t${i}`))
    expect(changeGroupTicketTabs(full, { kind: 'add' })).toBe(full)
  })

  it('renames a tab to what was typed, trimmed, and keeps the name when nothing was', () => {
    expect(
      changeGroupTicketTabs(TABS, { kind: 'rename', id: 'b', name: '  In QA ' })[1]?.name,
    ).toBe('In QA')
    expect(changeGroupTicketTabs(TABS, { kind: 'rename', id: 'b', name: '   ' })).toBe(TABS)
  })

  it('moves a tab up or down, and not past either end', () => {
    expect(ids(changeGroupTicketTabs(TABS, { kind: 'move', id: 'b', by: -1 }))).toEqual([
      'b',
      'a',
      'c',
    ])
    expect(ids(changeGroupTicketTabs(TABS, { kind: 'move', id: 'b', by: 1 }))).toEqual([
      'a',
      'c',
      'b',
    ])
    expect(changeGroupTicketTabs(TABS, { kind: 'move', id: 'a', by: -1 })).toBe(TABS)
    expect(changeGroupTicketTabs(TABS, { kind: 'move', id: 'c', by: 1 })).toBe(TABS)
  })

  it('deletes a tab', () => {
    expect(ids(changeGroupTicketTabs(TABS, { kind: 'remove', id: 'b' }))).toEqual(['a', 'c'])
  })

  it('sets a tab’s statuses from what was typed, each once', () => {
    const changed = changeGroupTicketTabs(TABS, {
      kind: 'statuses',
      id: 'a',
      text: 'In Review,  Code Review, In Review',
    })
    expect(changed[0]?.statuses).toEqual(['In Review', 'Code Review'])
  })

  it('ticks a status group on and off, in Jira’s order', () => {
    const on = changeGroupTicketTabs(TABS, { kind: 'category', id: 'a', category: 'done' })
    const both = changeGroupTicketTabs(on, { kind: 'category', id: 'a', category: 'new' })
    expect(both[0]?.categories).toEqual(['new', 'done'])
    const off = changeGroupTicketTabs(both, { kind: 'category', id: 'a', category: 'new' })
    expect(off[0]?.categories).toEqual(['done'])
  })

  it('sets a tab’s sprint', () => {
    expect(
      changeGroupTicketTabs(TABS, { kind: 'sprint', id: 'c', sprint: 'not-open' })[2]?.sprint,
    ).toBe('not-open')
  })

  it('turns one side’s action on and off, leaving the other side be', () => {
    const on = changeGroupTicketTabs(TABS, {
      kind: 'action',
      id: 'a',
      side: 'yours',
      action: 'review',
    })
    expect(on[0]?.yours).toEqual(['discuss', 'review'])
    expect(on[0]?.others).toEqual(['discuss'])
    const off = changeGroupTicketTabs(on, {
      kind: 'action',
      id: 'a',
      side: 'yours',
      action: 'discuss',
    })
    expect(off[0]?.yours).toEqual(['review'])
  })

  it('changes nothing for a tab that is not there', () => {
    expect(changeGroupTicketTabs(TABS, { kind: 'rename', id: 'gone', name: 'X' })).toBe(TABS)
    expect(changeGroupTicketTabs(TABS, { kind: 'remove', id: 'gone' })).toBe(TABS)
    expect(changeGroupTicketTabs(TABS, { kind: 'move', id: 'gone', by: 1 })).toBe(TABS)
  })
})

describe('groupTicketTabsEditorView', () => {
  const state = (over: Partial<GroupTicketTabsEditorState> = {}): GroupTicketTabsEditorState => ({
    tabs: { tabs: TABS, custom: true },
    readError: null,
    saving: 0,
    saveError: null,
    ...over,
  })

  it('is loading until the first read answers', () => {
    expect(groupTicketTabsEditorView(state({ tabs: undefined }))).toEqual({ kind: 'loading' })
  })

  it('says why a first read failed', () => {
    expect(groupTicketTabsEditorView(state({ tabs: undefined, readError: 'down' }))).toEqual({
      kind: 'failed',
      error: 'down',
    })
  })

  it('lists each tab with what it shows, where it may move, and every action per side', () => {
    const view = groupTicketTabsEditorView(
      state({
        tabs: {
          tabs: [tab('a', { statuses: ['To Do'], yours: ['take', 'discuss'] }), tab('b')],
          custom: false,
        },
      }),
    )
    if (view.kind !== 'tabs') throw new Error(view.kind)
    expect(view.custom).toBe(false)
    expect(view.canAdd).toBe(true)
    expect(view.saving).toBe(false)
    const [first, second] = view.rows
    expect(first?.summary).toBe('To Do · In the open sprint')
    expect([first?.canMoveUp, first?.canMoveDown, second?.canMoveUp, second?.canMoveDown]).toEqual([
      false,
      true,
      true,
      false,
    ])
    expect(first?.sides.map((s) => s.label)).toEqual(['Yours', 'Others'])
    expect(first?.categories.map((c) => [c.label, c.on])).toEqual([
      ['Every to do', false],
      ['Every in progress', false],
      ['Every done', false],
    ])
    expect(first?.sides[0]?.actions.filter((a) => a.on).map((a) => a.label)).toEqual([
      'Take ticket',
      'Discuss',
    ])
    expect(first?.sides[0]?.actions.map((a) => a.action)).toEqual([
      'take',
      'carry-on',
      'review',
      'replies',
      'approve-and-merge',
      'discuss',
    ])
  })

  it('offers no Replies on the others’ side', () => {
    const view = groupTicketTabsEditorView(state())
    if (view.kind !== 'tabs') throw new Error(view.kind)
    expect(view.rows[0]?.sides[1]?.actions.map((a) => a.action)).not.toContain('replies')
  })

  it('says a change is on its way, and why the last one was undone', () => {
    const view = groupTicketTabsEditorView(state({ saving: 2, saveError: 'refused' }))
    expect(view).toMatchObject({ kind: 'tabs', saving: true, error: 'refused' })
  })

  it('offers no Add once the group has the most tabs', () => {
    const full = Array.from({ length: 12 }, (_, i) => tab(`t${i}`))
    expect(groupTicketTabsEditorView(state({ tabs: { tabs: full, custom: true } }))).toMatchObject({
      canAdd: false,
    })
  })

  it('keeps showing the tabs when a later read fails', () => {
    expect(groupTicketTabsEditorView(state({ readError: 'down' }))).toMatchObject({ kind: 'tabs' })
  })
})
