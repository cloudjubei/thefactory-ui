import { describe, it, expect } from 'vitest'
import {
  aggregateGroupBadgeState,
  formatBadgeCount,
  hasAnyBadge,
  EMPTY_BADGE_STATE,
  type BadgeState,
} from './badgeAggregation.js'

function makeState(over: Record<string, any> = {}): BadgeState {
  return {
    chat_messages: { unread: 0, thinking: false, ...(over.chat_messages || {}) },
    git: { incoming: 0, uncommitted: 0, ...(over.git || {}) },
    tests: { failing: 0, ...(over.tests || {}) },
    activity: { running: 0, paused: 0, unseen: 0, ...(over.activity || {}) },
  }
}

describe('EMPTY_BADGE_STATE', () => {
  it('is all-zero / all-false and reports no badge', () => {
    expect(EMPTY_BADGE_STATE).toEqual({
      chat_messages: { unread: 0, thinking: false },
      git: { incoming: 0, uncommitted: 0 },
      tests: { failing: 0 },
      activity: { running: 0, paused: 0, unseen: 0 },
    })
    expect(hasAnyBadge(EMPTY_BADGE_STATE)).toBe(false)
  })
})

describe('hasAnyBadge', () => {
  it('is true when any single channel is non-zero/true', () => {
    expect(hasAnyBadge(makeState({ chat_messages: { unread: 2, thinking: false } }))).toBe(true)
    expect(hasAnyBadge(makeState({ chat_messages: { unread: 0, thinking: true } }))).toBe(true)
    expect(hasAnyBadge(makeState({ git: { incoming: 1, uncommitted: 0 } }))).toBe(true)
    expect(hasAnyBadge(makeState({ git: { incoming: 0, uncommitted: 3 } }))).toBe(true)
    expect(hasAnyBadge(makeState({ tests: { failing: 1 } }))).toBe(true)
    expect(hasAnyBadge(makeState({ activity: { running: 1, paused: 0 } }))).toBe(true)
    expect(hasAnyBadge(makeState({ activity: { running: 0, paused: 1 } }))).toBe(true)
    expect(hasAnyBadge(makeState({ activity: { running: 0, paused: 0, unseen: 2 } }))).toBe(true)
  })
})

describe('formatBadgeCount', () => {
  it('renders the number, capping at 99+', () => {
    expect(formatBadgeCount(0)).toBe('0')
    expect(formatBadgeCount(5)).toBe('5')
    expect(formatBadgeCount(99)).toBe('99')
    expect(formatBadgeCount(100)).toBe('99+')
    expect(formatBadgeCount(1000)).toBe('99+')
  })
})

describe('aggregateGroupBadgeState', () => {
  it('sums numeric channels and ORs the thinking flag across members', () => {
    const byProject: Record<string, BadgeState> = {
      a: makeState({
        chat_messages: { unread: 3, thinking: false },
        git: { incoming: 1, uncommitted: 4 },
        tests: { failing: 1 },
      }),
      b: makeState({
        chat_messages: { unread: 5, thinking: true },
        git: { incoming: 2, uncommitted: 6 },
        tests: { failing: 2 },
      }),
    }
    const agg = aggregateGroupBadgeState(['a', 'b'], byProject)
    expect(agg).toEqual({
      chat_messages: { unread: 8, thinking: true },
      git: { incoming: 3, uncommitted: 10 },
      tests: { failing: 3 },
      activity: { running: 0, paused: 0, unseen: 0 },
    })
  })

  it('sums running + paused + unseen activities across members', () => {
    const byProject: Record<string, BadgeState> = {
      a: makeState({ activity: { running: 1, paused: 1, unseen: 2 } }),
      b: makeState({ activity: { running: 2, paused: 0, unseen: 3 } }),
    }
    const agg = aggregateGroupBadgeState(['a', 'b'], byProject)
    expect(agg.activity.running).toBe(3)
    expect(agg.activity.paused).toBe(1)
    expect(agg.activity.unseen).toBe(5)
  })

  it('skips member ids with no state and returns empty for no members', () => {
    const byProject: Record<string, BadgeState> = {
      a: makeState({ git: { incoming: 0, uncommitted: 2 } }),
    }
    expect(aggregateGroupBadgeState(['a', 'missing'], byProject).git.uncommitted).toBe(2)
    expect(aggregateGroupBadgeState([], {})).toEqual(EMPTY_BADGE_STATE)
  })
})
