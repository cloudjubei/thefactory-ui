import { describe, it, expect } from 'vitest'
import {
  aggregateGroupBadgeState,
  hasAnyBadge,
  EMPTY_BADGE_STATE,
  type BadgeState,
} from './badgeAggregation.js'

function makeState(over: Partial<BadgeState> = {}): BadgeState {
  return {
    agent_runs: { running: 0 },
    chat_messages: { unread: 0, thinking: false },
    git: { incoming: 0, uncommitted: 0 },
    tests: { failing: 0 },
    ...over,
  }
}

describe('EMPTY_BADGE_STATE', () => {
  it('is all-zero / all-false and reports no badge', () => {
    expect(EMPTY_BADGE_STATE).toEqual({
      agent_runs: { running: 0 },
      chat_messages: { unread: 0, thinking: false },
      git: { incoming: 0, uncommitted: 0 },
      tests: { failing: 0 },
    })
    expect(hasAnyBadge(EMPTY_BADGE_STATE)).toBe(false)
  })
})

describe('hasAnyBadge', () => {
  it('is true when any single channel is non-zero/true', () => {
    expect(hasAnyBadge(makeState({ agent_runs: { running: 1 } }))).toBe(true)
    expect(hasAnyBadge(makeState({ chat_messages: { unread: 2, thinking: false } }))).toBe(true)
    expect(hasAnyBadge(makeState({ chat_messages: { unread: 0, thinking: true } }))).toBe(true)
    expect(hasAnyBadge(makeState({ git: { incoming: 1, uncommitted: 0 } }))).toBe(true)
    expect(hasAnyBadge(makeState({ git: { incoming: 0, uncommitted: 3 } }))).toBe(true)
    expect(hasAnyBadge(makeState({ tests: { failing: 1 } }))).toBe(true)
  })
})

describe('aggregateGroupBadgeState', () => {
  it('sums numeric channels and ORs the thinking flag across members', () => {
    const byProject: Record<string, BadgeState> = {
      a: makeState({
        agent_runs: { running: 2 },
        chat_messages: { unread: 3, thinking: false },
        git: { incoming: 1, uncommitted: 4 },
        tests: { failing: 1 },
      }),
      b: makeState({
        agent_runs: { running: 1 },
        chat_messages: { unread: 5, thinking: true },
        git: { incoming: 2, uncommitted: 6 },
        tests: { failing: 2 },
      }),
    }
    const agg = aggregateGroupBadgeState(['a', 'b'], byProject)
    expect(agg).toEqual({
      agent_runs: { running: 3 },
      chat_messages: { unread: 8, thinking: true },
      git: { incoming: 3, uncommitted: 10 },
      tests: { failing: 3 },
    })
  })

  it('skips member ids with no state and returns empty for no members', () => {
    const byProject: Record<string, BadgeState> = {
      a: makeState({ git: { incoming: 0, uncommitted: 2 } }),
    }
    expect(aggregateGroupBadgeState(['a', 'missing'], byProject).git.uncommitted).toBe(2)
    expect(aggregateGroupBadgeState([], {})).toEqual(EMPTY_BADGE_STATE)
  })
})
