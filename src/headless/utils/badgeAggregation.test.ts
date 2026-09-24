import { describe, it, expect } from 'vitest'
import type { ProcessRun, ProcessRunStatus } from 'thefactory-tools/types'
import {
  aggregateGroupBadgeState,
  formatBadgeCount,
  hasAnyBadge,
  processTallyByProject,
  EMPTY_BADGE_STATE,
} from './badgeAggregation'
import type { BadgeState } from './badgeAggregationTypes'

function makeState(over: Record<string, any> = {}): BadgeState {
  return {
    chat_messages: { unread: 0, thinking: false, ...(over.chat_messages || {}) },
    git: { incoming: 0, uncommitted: 0, ...(over.git || {}) },
    tests: { failing: 0, ...(over.tests || {}) },
    activity: { running: 0, paused: 0, unseen: 0, ...(over.activity || {}) },
    process: { running: 0, waiting: 0, ...(over.process || {}) },
  }
}

type TallyRun = Pick<ProcessRun, 'id' | 'projectId' | 'status' | 'parentRunId' | 'park'>

function run(
  id: string,
  projectId: string,
  status: ProcessRunStatus,
  extra: Partial<Pick<TallyRun, 'parentRunId' | 'park'>> = {},
): TallyRun {
  return { id, projectId, status, ...extra }
}

const gatePark = (): TallyRun['park'] => ({
  reason: 'gate',
  stepId: 'sign-off',
  message: 'Ready for you',
  parkedAt: 1,
})

describe('EMPTY_BADGE_STATE', () => {
  it('is all-zero / all-false and reports no badge', () => {
    expect(EMPTY_BADGE_STATE).toEqual({
      chat_messages: { unread: 0, thinking: false },
      git: { incoming: 0, uncommitted: 0 },
      tests: { failing: 0 },
      activity: { running: 0, paused: 0, unseen: 0 },
      process: { running: 0, waiting: 0 },
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

  it('badges a running process and a waiting process independently', () => {
    expect(hasAnyBadge(makeState({ process: { running: 1, waiting: 0 } }))).toBe(true)
    expect(hasAnyBadge(makeState({ process: { running: 0, waiting: 1 } }))).toBe(true)
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

describe('processTallyByProject', () => {
  it('counts a running root run as running, not waiting', () => {
    const tally = processTallyByProject([run('r1', 'p1', 'running')])
    expect(tally.get('p1')).toEqual({ running: 1, waiting: 0 })
  })

  it('counts a pending root run as running — it is live but not waiting on the user', () => {
    const tally = processTallyByProject([run('r1', 'p1', 'pending')])
    expect(tally.get('p1')).toEqual({ running: 1, waiting: 0 })
  })

  it('counts a root run parked at the sign-off gate as waiting', () => {
    const tally = processTallyByProject([run('r1', 'p1', 'parked', { park: gatePark() })])
    expect(tally.get('p1')).toEqual({ running: 0, waiting: 1 })
  })

  it('counts a root run parked for any other reason as waiting', () => {
    const tally = processTallyByProject([
      run('r1', 'p1', 'parked', {
        park: { reason: 'loop-exhausted', message: 'Out of tries', parkedAt: 2 },
      }),
      run('r2', 'p1', 'parked'),
    ])
    expect(tally.get('p1')).toEqual({ running: 0, waiting: 2 })
  })

  it('never counts a child run, whatever its status', () => {
    const tally = processTallyByProject([
      run('parent', 'p1', 'parked', { park: gatePark() }),
      run('child-running', 'p1', 'running', { parentRunId: 'parent' }),
      run('child-parked', 'p1', 'parked', { parentRunId: 'parent', park: gatePark() }),
      run('child-pending', 'p1', 'pending', { parentRunId: 'parent' }),
    ])
    expect(tally.get('p1')).toEqual({ running: 0, waiting: 1 })
  })

  it('leaves out a project whose only runs are children or finished', () => {
    const tally = processTallyByProject([
      run('c1', 'p1', 'running', { parentRunId: 'elsewhere' }),
      run('d1', 'p2', 'succeeded'),
      run('d2', 'p2', 'failed'),
      run('d3', 'p2', 'cancelled'),
    ])
    expect(tally.has('p1')).toBe(false)
    expect(tally.has('p2')).toBe(false)
    expect(tally.size).toBe(0)
  })

  it('buckets each project separately, mixing running, waiting and finished runs', () => {
    const tally = processTallyByProject([
      run('a1', 'alpha', 'running'),
      run('a2', 'alpha', 'parked', { park: gatePark() }),
      run('a3', 'alpha', 'pending'),
      run('a4', 'alpha', 'succeeded'),
      run('b1', 'beta', 'parked'),
      run('g1', 'gamma', 'running'),
      run('g2', 'gamma', 'cancelled'),
    ])
    expect(Object.fromEntries(tally)).toEqual({
      alpha: { running: 2, waiting: 1 },
      beta: { running: 0, waiting: 1 },
      gamma: { running: 1, waiting: 0 },
    })
  })

  it('returns an empty map for no runs', () => {
    expect(processTallyByProject([]).size).toBe(0)
  })
})

describe('aggregateGroupBadgeState', () => {
  it('sums numeric channels and ORs the thinking flag across members', () => {
    const byProject: Record<string, BadgeState> = {
      a: makeState({
        chat_messages: { unread: 3, thinking: false },
        git: { incoming: 1, uncommitted: 4 },
        tests: { failing: 1 },
        process: { running: 2, waiting: 1 },
      }),
      b: makeState({
        chat_messages: { unread: 5, thinking: true },
        git: { incoming: 2, uncommitted: 6 },
        tests: { failing: 2 },
        process: { running: 0, waiting: 3 },
      }),
    }
    const agg = aggregateGroupBadgeState(['a', 'b'], byProject)
    expect(agg).toEqual({
      chat_messages: { unread: 8, thinking: true },
      git: { incoming: 3, uncommitted: 10 },
      tests: { failing: 3 },
      activity: { running: 0, paused: 0, unseen: 0 },
      process: { running: 2, waiting: 4 },
    })
  })

  it('rolls per-project process tallies up into the group — running and waiting stay apart', () => {
    const tally = processTallyByProject([
      run('a1', 'a', 'running'),
      run('b1', 'b', 'parked', { park: gatePark() }),
      run('b2', 'b', 'running', { parentRunId: 'b1' }),
      run('c1', 'c', 'parked'),
    ])
    const byProject: Record<string, BadgeState> = {}
    for (const pid of ['a', 'b', 'c']) {
      byProject[pid] = makeState({ process: tally.get(pid) ?? { running: 0, waiting: 0 } })
    }
    expect(aggregateGroupBadgeState(['a', 'b'], byProject).process).toEqual({
      running: 1,
      waiting: 1,
    })
    expect(aggregateGroupBadgeState(['b', 'c'], byProject).process).toEqual({
      running: 0,
      waiting: 2,
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
