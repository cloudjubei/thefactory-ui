import { describe, expect, it } from 'vitest'
import {
  groupTicketRepliesView,
  groupTicketRowActions,
  groupTicketShownTab,
  groupTicketTabItems,
  groupTicketTabSummary,
} from './groupTicketTabs'
import type { GroupTicketTab } from './groupTicketTabTypes'

const tab = (id: string, over: Partial<GroupTicketTab> = {}): GroupTicketTab => ({
  id,
  name: `Tab ${id}`,
  statuses: [],
  sprint: 'open',
  yours: ['discuss'],
  others: ['discuss'],
  ...over,
})

const NOW = Date.parse('2026-11-19T12:00:00Z')

describe('groupTicketTabItems', () => {
  it('names each tab and counts it once a read said, in the order the group set', () => {
    expect(groupTicketTabItems([tab('a'), tab('b'), tab('c')], { a: 3, c: 0 })).toEqual([
      { id: 'a', label: 'Tab a', count: 3 },
      { id: 'b', label: 'Tab b', count: undefined },
      { id: 'c', label: 'Tab c', count: 0 },
    ])
  })

  it('is empty without tabs', () => {
    expect(groupTicketTabItems([], { a: 1 })).toEqual([])
  })
})

describe('groupTicketShownTab', () => {
  const tabs = [tab('a'), tab('b')]

  it('is the tab picked while the group still has it', () => {
    expect(groupTicketShownTab(tabs, 'b')?.id).toBe('b')
  })

  it('is the first tab when none was picked, or the picked one is gone', () => {
    expect(groupTicketShownTab(tabs, undefined)?.id).toBe('a')
    expect(groupTicketShownTab(tabs, 'gone')?.id).toBe('a')
  })

  it('is none while the tabs are unread or there are none', () => {
    expect(groupTicketShownTab(undefined, 'a')).toBeUndefined()
    expect(groupTicketShownTab([], undefined)).toBeUndefined()
  })
})

describe('groupTicketRowActions', () => {
  const every = tab('t', {
    yours: ['discuss', 'take', 'carry-on', 'review', 'replies', 'approve-and-merge'],
    others: ['review', 'discuss'],
  })
  const row = {
    mine: true,
    canTake: true,
    reviewOpen: true,
    groupStory: { id: 'g1', title: 'Sign in' },
  }

  it('offers the side’s actions in the order a row shows them, whatever order they were set in', () => {
    expect(groupTicketRowActions(row, every)).toEqual([
      'take',
      'carry-on',
      'review',
      'replies',
      'approve-and-merge',
      'discuss',
    ])
  })

  it('offers the others’ actions on someone else’s ticket, never replies', () => {
    const others = tab('t', { others: ['replies', 'review', 'discuss'] })
    expect(groupTicketRowActions({ ...row, mine: false }, others)).toEqual(['review', 'discuss'])
  })

  it('leaves out what cannot apply: Take on a started ticket, Carry on without a story, merge without a review', () => {
    expect(groupTicketRowActions({ mine: true, canTake: false, reviewOpen: false }, every)).toEqual(
      ['review', 'replies', 'discuss'],
    )
  })

  it('offers each action once though the tab lists it twice', () => {
    expect(groupTicketRowActions(row, tab('t', { yours: ['discuss', 'discuss'] }))).toEqual([
      'discuss',
    ])
  })

  it('offers Discuss alone on a ticket in no tab', () => {
    expect(groupTicketRowActions(row, undefined)).toEqual(['discuss'])
  })

  it('reads a row with no word on whose it is as someone else’s', () => {
    expect(groupTicketRowActions({ canTake: true, reviewOpen: false }, every)).toEqual([
      'review',
      'discuss',
    ])
  })
})

describe('groupTicketRepliesView', () => {
  it('counts Slack replies and GitHub comments, with when the newest came', () => {
    expect(
      groupTicketRepliesView({ slack: 2, github: 1, latest: '2026-11-19T09:00:00Z' }, NOW),
    ).toEqual({ line: '2 Slack replies · 1 GitHub comment', when: '3 hours ago', none: false })
  })

  it('says only the side that has any', () => {
    expect(groupTicketRepliesView({ slack: 0, github: 3 }, NOW)).toEqual({
      line: '3 GitHub comments',
      none: false,
    })
    expect(groupTicketRepliesView({ slack: 1, github: 0 }, NOW).line).toBe('1 Slack reply')
  })

  it('says there are none yet', () => {
    expect(groupTicketRepliesView({ slack: 0, github: 0 }, NOW)).toEqual({
      line: 'No replies yet',
      none: true,
    })
  })

  it('leaves out a newest time it cannot read', () => {
    expect(
      groupTicketRepliesView({ slack: 1, github: 0, latest: 'soon' }, NOW).when,
    ).toBeUndefined()
  })
})

describe('groupTicketTabSummary', () => {
  it('names its statuses and sprint', () => {
    expect(groupTicketTabSummary(tab('t', { statuses: ['In Review', 'Code Review'] }))).toBe(
      'In Review, Code Review · In the open sprint',
    )
  })

  it('names its status groups first, then its statuses', () => {
    expect(
      groupTicketTabSummary(
        tab('t', { categories: ['done'], statuses: ['Won’t do'], sprint: 'any' }),
      ),
    ).toBe('Every done, Won’t do · Any sprint')
  })

  it('says any status when it names none', () => {
    expect(groupTicketTabSummary(tab('t', { sprint: 'not-open' }))).toBe(
      'Any status · Not in an open sprint',
    )
    expect(groupTicketTabSummary(tab('t', { sprint: 'any' }))).toBe('Any status · Any sprint')
  })
})
