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

const NOW = 1_000

function makeState(over: Record<string, any> = {}): BadgeState {
  return {
    chat_messages: { unread: 0, waiting: 0, thinking: false, ...(over.chat_messages || {}) },
    git: { incoming: 0, uncommitted: 0, ...(over.git || {}) },
    tests: { failing: 0, ...(over.tests || {}) },
    activity: { running: 0, paused: 0, unseen: 0, unread: 0, ...(over.activity || {}) },
    process: { running: 0, waiting: 0, failed: 0, ...(over.process || {}) },
    signIn: { expired: [], ...(over.signIn || {}) },
  }
}

type TallyRun = Parameters<typeof processTallyByProject>[0][number] & Pick<ProcessRun, 'id'>

const PLAN: ProcessRun['plan'] = {
  definitionId: 'story-default',
  definitionScope: 'global',
  definitionVersion: 6,
  name: 'Story',
  steps: [{ id: 'sign-off', name: 'Sign-off', kind: 'gate' }],
  loops: [],
  frozenAt: 0,
}

function run(
  id: string,
  projectId: string,
  status: ProcessRunStatus,
  extra: Partial<
    Pick<
      ProcessRun,
      'parentRunId' | 'park' | 'workBranch' | 'ledger' | 'integration' | 'manager' | 'input'
    >
  > = {},
): TallyRun {
  return { id, projectId, status, plan: PLAN, ledger: [], ...extra }
}

const approvedWork = (integration?: ProcessRun['integration']) => ({
  workBranch: { name: 'factory/x-1', baseRef: 'main', baseSha: 'a'.repeat(40) },
  ledger: [
    {
      id: 'g',
      stepId: 'sign-off',
      iteration: 1,
      status: 'done' as const,
      outcome: 'passed' as const,
      startedAt: 0,
      override: { choice: 'approve' as const, at: 1, integration: 'squash' as const },
    },
  ],
  ...(integration ? { integration } : {}),
})

const gatePark = (): ProcessRun['park'] => ({
  reason: 'gate',
  stepId: 'sign-off',
  message: 'Ready for you',
  parkedAt: 1,
})

describe('EMPTY_BADGE_STATE', () => {
  it('is all-zero / all-false and reports no badge', () => {
    expect(EMPTY_BADGE_STATE).toEqual({
      chat_messages: { unread: 0, waiting: 0, thinking: false },
      git: { incoming: 0, uncommitted: 0 },
      tests: { failing: 0 },
      activity: { running: 0, paused: 0, unseen: 0, unread: 0 },
      process: { running: 0, waiting: 0, failed: 0, unread: 0 },
      signIn: { expired: [] },
    })
    expect(hasAnyBadge(EMPTY_BADGE_STATE)).toBe(false)
  })
})

describe('hasAnyBadge', () => {
  it('is true when any single channel is non-zero/true', () => {
    expect(hasAnyBadge(makeState({ chat_messages: { unread: 2, thinking: false } }))).toBe(true)
    expect(hasAnyBadge(makeState({ chat_messages: { unread: 0, thinking: true } }))).toBe(true)
    expect(hasAnyBadge(makeState({ chat_messages: { waiting: 1 } }))).toBe(true)
    expect(hasAnyBadge(makeState({ git: { incoming: 1, uncommitted: 0 } }))).toBe(true)
    expect(hasAnyBadge(makeState({ git: { incoming: 0, uncommitted: 3 } }))).toBe(true)
    expect(hasAnyBadge(makeState({ tests: { failing: 1 } }))).toBe(true)
    expect(hasAnyBadge(makeState({ activity: { running: 1, paused: 0 } }))).toBe(true)
    expect(hasAnyBadge(makeState({ activity: { running: 0, paused: 1 } }))).toBe(true)
    expect(hasAnyBadge(makeState({ activity: { running: 0, paused: 0, unseen: 2 } }))).toBe(true)
    expect(hasAnyBadge(makeState({ activity: { unread: 1 } }))).toBe(true)
  })

  it('badges a running process and a waiting process independently', () => {
    expect(hasAnyBadge(makeState({ process: { running: 1, waiting: 0 } }))).toBe(true)
    expect(hasAnyBadge(makeState({ process: { running: 0, waiting: 1 } }))).toBe(true)
    expect(hasAnyBadge(makeState({ process: { failed: 1 } }))).toBe(true)
    expect(hasAnyBadge(makeState({ process: { unread: 1 } }))).toBe(true)
  })

  it('badges an expired sign-in the scope’s agents use', () => {
    expect(hasAnyBadge(makeState({ signIn: { expired: ['Claude'] } }))).toBe(true)
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
    const tally = processTallyByProject([run('r1', 'p1', 'running')], NOW)
    expect(tally.get('p1')).toEqual({ running: 1, waiting: 0, failed: 0, unread: 0 })
  })

  it('counts a pending root run as running — it is live but not waiting on the user', () => {
    const tally = processTallyByProject([run('r1', 'p1', 'pending')], NOW)
    expect(tally.get('p1')).toEqual({ running: 1, waiting: 0, failed: 0, unread: 0 })
  })

  it('counts a root run parked at the sign-off gate as waiting', () => {
    const tally = processTallyByProject([run('r1', 'p1', 'parked', { park: gatePark() })], NOW)
    expect(tally.get('p1')).toEqual({ running: 0, waiting: 1, failed: 0, unread: 0 })
  })

  it('counts a root run parked for any other reason as waiting', () => {
    const tally = processTallyByProject(
      [
        run('r1', 'p1', 'parked', {
          park: { reason: 'loop-exhausted', message: 'Out of tries', parkedAt: 2 },
        }),
        run('r2', 'p1', 'parked'),
      ],
      NOW,
    )
    expect(tally.get('p1')).toEqual({ running: 0, waiting: 2, failed: 0, unread: 0 })
  })

  it('counts nothing for a run waiting on work elsewhere — it starts by itself', () => {
    const tally = processTallyByProject(
      [
        run('r1', 'p1', 'parked', {
          park: { reason: 'waiting-on-blockers', message: 'Waits on #s18', parkedAt: 2 },
        }),
      ],
      NOW,
    )
    expect(tally.get('p1')).toEqual({ running: 0, waiting: 0, failed: 0, unread: 0 })
  })

  it('counts approved work that was never brought in as waiting on the user', () => {
    const tally = processTallyByProject([run('r1', 'p1', 'succeeded', approvedWork())], NOW)
    expect(tally.get('p1')).toEqual({ running: 0, waiting: 1, failed: 0, unread: 0 })
  })

  it('counts approved work whose merge failed as failed — something broke, not waiting', () => {
    const tally = processTallyByProject(
      [
        run('r1', 'p1', 'succeeded', approvedWork({ mode: 'squash', status: 'failed', at: 2 })),
        run('r2', 'p1', 'succeeded', approvedWork({ mode: 'merge', status: 'failed', at: 3 })),
        run('r3', 'p1', 'parked', { park: gatePark() }),
      ],
      NOW,
    )
    expect(tally.get('p1')).toEqual({ running: 0, waiting: 1, failed: 2, unread: 0 })
  })

  it('does not count a run that failed and was let go', () => {
    expect(processTallyByProject([run('r1', 'p1', 'failed')], NOW).has('p1')).toBe(false)
  })

  it('counts approved work being brought in as running', () => {
    const tally = processTallyByProject(
      [
        run(
          'r1',
          'p1',
          'succeeded',
          approvedWork({ mode: 'squash', status: 'integrating', at: 2 }),
        ),
      ],
      NOW,
    )
    expect(tally.get('p1')).toEqual({ running: 1, waiting: 0, failed: 0, unread: 0 })
  })

  it('does not count approved work that landed', () => {
    const tally = processTallyByProject(
      [run('r1', 'p1', 'succeeded', approvedWork({ mode: 'squash', status: 'integrated', at: 2 }))],
      NOW,
    )
    expect(tally.has('p1')).toBe(false)
  })

  it('never counts a child run, whatever its status', () => {
    const tally = processTallyByProject(
      [
        run('parent', 'p1', 'parked', { park: gatePark() }),
        run('child-running', 'p1', 'running', { parentRunId: 'parent' }),
        run('child-parked', 'p1', 'parked', { parentRunId: 'parent', park: gatePark() }),
        run('child-pending', 'p1', 'pending', { parentRunId: 'parent' }),
      ],
      NOW,
    )
    expect(tally.get('p1')).toEqual({ running: 0, waiting: 1, failed: 0, unread: 0 })
  })

  it('leaves out a project whose only runs are children or finished', () => {
    const tally = processTallyByProject(
      [
        run('c1', 'p1', 'running', { parentRunId: 'elsewhere' }),
        run('d1', 'p2', 'succeeded'),
        run('d2', 'p2', 'failed'),
        run('d3', 'p2', 'cancelled'),
      ],
      NOW,
    )
    expect(tally.has('p1')).toBe(false)
    expect(tally.has('p2')).toBe(false)
    expect(tally.size).toBe(0)
  })

  it('buckets each project separately, mixing running, waiting and finished runs', () => {
    const tally = processTallyByProject(
      [
        run('a1', 'alpha', 'running'),
        run('a2', 'alpha', 'parked', { park: gatePark() }),
        run('a3', 'alpha', 'pending'),
        run('a4', 'alpha', 'succeeded'),
        run('b1', 'beta', 'parked'),
        run('g1', 'gamma', 'running'),
        run('g2', 'gamma', 'cancelled'),
      ],
      NOW,
    )
    expect(Object.fromEntries(tally)).toEqual({
      alpha: { running: 2, waiting: 1, failed: 0, unread: 0 },
      beta: { running: 0, waiting: 1, failed: 0, unread: 0 },
      gamma: { running: 1, waiting: 0, failed: 0, unread: 0 },
    })
  })

  it('returns an empty map for no runs', () => {
    expect(processTallyByProject([], NOW).size).toBe(0)
  })

  describe('a stop its agent manager has', () => {
    const turn = { runId: 'r1', parkedAt: 1, signature: 's', startedAt: 900, chatContextId: 'c' }
    const failedPark = { reason: 'step-failed' as const, message: 'm', parkedAt: 1 }

    it('counts as running — nothing waits on the person — from its claim through its turn and hold', () => {
      const hold = {
        runId: 'r3',
        parkedAt: 1,
        dependsOn: { kind: 'run' as const, runId: 'x' },
        resume: 'retry' as const,
        why: 'w',
        at: 900,
        until: 99_999,
      }
      const tally = processTallyByProject(
        [
          run('r1', 'p1', 'parked', { park: failedPark, manager: { turn } }),
          run('r2', 'p1', 'parked', {
            park: { ...failedPark, childRunId: 'child' },
            manager: { claim: { runId: 'child', parkedAt: 1, at: 950 } },
          }),
          run('r3', 'p1', 'parked', { park: failedPark, manager: { hold } }),
        ],
        NOW,
      )
      expect(tally.get('p1')).toEqual({ running: 3, waiting: 0, failed: 0, unread: 0 })
    })

    it('waits on the person once it waits on a card, its turn goes stale, or it is off', () => {
      const waitingOn = [{ actionId: 'a', toolName: 'askUser', kind: 'question', at: 950 }]
      const tally = processTallyByProject(
        [
          run('r1', 'p1', 'parked', {
            park: failedPark,
            manager: { turn: { ...turn, waitingOn } },
          }),
          run('r2', 'p1', 'parked', {
            park: failedPark,
            manager: { turn },
            input: { manager: { enabled: false } },
          }),
        ],
        NOW,
      )
      expect(tally.get('p1')).toEqual({ running: 0, waiting: 2, failed: 0, unread: 0 })
      const stale = processTallyByProject(
        [run('r1', 'p1', 'parked', { park: failedPark, manager: { turn } })],
        900 + 3 * 60 * 60 * 1000,
      )
      expect(stale.get('p1')).toEqual({ running: 0, waiting: 1, failed: 0, unread: 0 })
    })
  })

  describe('news in a run’s own chat', () => {
    it('makes a run wait on the person while an ask waits in its chat', () => {
      const tally = processTallyByProject(
        [run('r1', 'p1', 'running'), run('r2', 'p1', 'succeeded')],
        NOW,
        new Map([
          ['r1', { unread: 0, asks: 1 }],
          ['r2', { unread: 0, asks: 2 }],
        ]),
      )
      expect(tally.get('p1')).toEqual({ running: 0, waiting: 2, failed: 0, unread: 0 })
    })

    it('counts an unread reply as news beside where the run stands, never on top of a wait', () => {
      const tally = processTallyByProject(
        [
          run('r1', 'p1', 'running'),
          run('r2', 'p1', 'succeeded'),
          run('r3', 'p1', 'parked', { park: gatePark() }),
        ],
        NOW,
        new Map([
          ['r1', { unread: 2, asks: 0 }],
          ['r2', { unread: 1, asks: 0 }],
          ['r3', { unread: 1, asks: 0 }],
        ]),
      )
      expect(tally.get('p1')).toEqual({ running: 1, waiting: 1, failed: 0, unread: 2 })
    })

    it('never counts a nested run’s news on its own', () => {
      const tally = processTallyByProject(
        [run('c1', 'p1', 'running', { parentRunId: 'root' })],
        NOW,
        new Map([['c1', { unread: 1, asks: 1 }]]),
      )
      expect(tally.size).toBe(0)
    })
  })
})

describe('aggregateGroupBadgeState', () => {
  it('sums numeric channels and ORs the thinking flag across members', () => {
    const byProject: Record<string, BadgeState> = {
      a: makeState({
        chat_messages: { unread: 3, waiting: 1, thinking: false },
        git: { incoming: 1, uncommitted: 4 },
        tests: { failing: 1 },
        activity: { unseen: 1, unread: 2 },
        process: { running: 2, waiting: 1, failed: 1, unread: 1 },
      }),
      b: makeState({
        chat_messages: { unread: 5, waiting: 2, thinking: true },
        git: { incoming: 2, uncommitted: 6 },
        tests: { failing: 2 },
        activity: { unread: 3 },
        process: { running: 0, waiting: 3, failed: 2, unread: 2 },
      }),
    }
    const agg = aggregateGroupBadgeState(['a', 'b'], byProject)
    expect(agg).toEqual({
      chat_messages: { unread: 8, waiting: 3, thinking: true },
      git: { incoming: 3, uncommitted: 10 },
      tests: { failing: 3 },
      activity: { running: 0, paused: 0, unseen: 1, unread: 5 },
      process: { running: 2, waiting: 4, failed: 3, unread: 3 },
      signIn: { expired: [] },
    })
  })

  it('rolls per-project process tallies up into the group — running and waiting stay apart', () => {
    const tally = processTallyByProject(
      [
        run('a1', 'a', 'running'),
        run('b1', 'b', 'parked', { park: gatePark() }),
        run('b2', 'b', 'running', { parentRunId: 'b1' }),
        run('c1', 'c', 'parked'),
      ],
      NOW,
    )
    const byProject: Record<string, BadgeState> = {}
    for (const pid of ['a', 'b', 'c']) {
      byProject[pid] = makeState({
        process: tally.get(pid) ?? { running: 0, waiting: 0, failed: 0, unread: 0 },
      })
    }
    expect(aggregateGroupBadgeState(['a', 'b'], byProject).process).toEqual({
      running: 1,
      waiting: 1,
      failed: 0,
      unread: 0,
    })
    expect(aggregateGroupBadgeState(['b', 'c'], byProject).process).toEqual({
      running: 0,
      waiting: 2,
      failed: 0,
      unread: 0,
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

  it('names each expired sign-in its members use once, however many use it', () => {
    const byProject: Record<string, BadgeState> = {
      a: makeState({ signIn: { expired: ['Claude'] } }),
      b: makeState({ signIn: { expired: ['Codex', 'Claude'] } }),
      c: makeState(),
    }
    expect(aggregateGroupBadgeState(['a', 'b', 'c'], byProject).signIn.expired).toEqual([
      'Claude',
      'Codex',
    ])
  })
})
