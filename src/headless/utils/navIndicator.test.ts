import { describe, expect, it } from 'vitest'
import { ZERO_BADGE_COUNTS, type BadgeCounts } from '../hooks/useBadgeCountsCore'
import type { BadgeState } from './badgeAggregationTypes'
import type { GroupTabKey, ShellTabKey } from './shellNav'
import {
  groupTabIndicator,
  navBadgeLabel,
  navRowIndicator,
  scopeRowIndicator,
  shellTabIndicator,
} from './navIndicator'

function state(
  over: Partial<{ [K in keyof BadgeState]: Partial<BadgeState[K]> }> = {},
): BadgeState {
  return {
    chat_messages: { unread: 0, thinking: false, ...over.chat_messages },
    git: { incoming: 0, uncommitted: 0, ...over.git },
    tests: { failing: 0, ...over.tests },
    activity: { running: 0, paused: 0, unseen: 0, ...over.activity },
    process: { running: 0, waiting: 0, ...over.process },
  }
}

function counts(over: Partial<BadgeCounts> = {}): BadgeCounts {
  return { ...ZERO_BADGE_COUNTS, ...over }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const v of Object.values(value)) deepFreeze(v)
    Object.freeze(value)
  }
  return value
}

describe('navRowIndicator', () => {
  it('shows nothing when no signal is set', () => {
    expect(navRowIndicator({ running: false })).toEqual({ kind: 'none' })
  })

  it('treats a zero-count badge as absent', () => {
    expect(
      navRowIndicator({
        running: false,
        waiting: { count: 0, category: 'processes' },
        unread: { count: 0, category: 'chat' },
      }),
    ).toEqual({ kind: 'none' })
    expect(
      navRowIndicator({
        running: false,
        waiting: { count: 0, category: 'processes' },
        unread: { count: 2, category: 'chat' },
      }),
    ).toEqual({ kind: 'badge', count: 2, category: 'chat' })
  })

  it('running alone is a spinner with no dot', () => {
    expect(navRowIndicator({ running: true })).toEqual({ kind: 'spinner' })
  })

  it('a spinner carries the waiting count as its dot, ahead of unread', () => {
    expect(
      navRowIndicator({
        running: true,
        waiting: { count: 1, category: 'processes' },
        unread: { count: 4, category: 'chat' },
      }),
    ).toEqual({ kind: 'spinner', dot: { count: 1, category: 'processes' } })
  })

  it('a spinner carries unread as its dot when nothing is waiting', () => {
    expect(navRowIndicator({ running: true, unread: { count: 3, category: 'chat' } })).toEqual({
      kind: 'spinner',
      dot: { count: 3, category: 'chat' },
    })
  })

  it('running outranks paused', () => {
    expect(navRowIndicator({ running: true, paused: true })).toEqual({ kind: 'spinner' })
  })

  it('a waiting count outranks the paused icon', () => {
    expect(
      navRowIndicator({
        running: false,
        paused: true,
        waiting: { count: 2, category: 'processes' },
      }),
    ).toEqual({ kind: 'badge', count: 2, category: 'processes' })
  })

  it('the paused icon outranks an unread count', () => {
    expect(
      navRowIndicator({ running: false, paused: true, unread: { count: 5, category: 'chat' } }),
    ).toEqual({ kind: 'paused' })
  })

  it('waiting outranks unread when neither runs', () => {
    expect(
      navRowIndicator({
        running: false,
        waiting: { count: 1, category: 'processes' },
        unread: { count: 9, category: 'chat' },
      }),
    ).toEqual({ kind: 'badge', count: 1, category: 'processes' })
  })

  it('is pure — the same input always yields the same output and is never mutated', () => {
    const input = deepFreeze({
      running: true,
      paused: true,
      waiting: { count: 1, category: 'processes' as const },
      unread: { count: 2, category: 'chat' as const },
    })
    const first = navRowIndicator(input)
    const second = navRowIndicator(input)
    expect(second).toEqual(first)
    expect(second).not.toBe(first)
  })
})

describe('scopeRowIndicator — a project row', () => {
  const both = [false, true] as const

  it.each(both)('a running root run spins with no number (active=%s)', (active) => {
    expect(scopeRowIndicator(state({ process: { running: 1 } }), { active })).toEqual({
      kind: 'spinner',
    })
  })

  it.each(both)(
    'a run parked at the gate is a badge of 1 in the processes colour (active=%s)',
    (active) => {
      expect(scopeRowIndicator(state({ process: { waiting: 1 } }), { active })).toEqual({
        kind: 'badge',
        count: 1,
        category: 'processes',
      })
    },
  )

  it.each(both)('running plus waiting is a spinner with a processes dot (active=%s)', (active) => {
    expect(scopeRowIndicator(state({ process: { running: 2, waiting: 3 } }), { active })).toEqual({
      kind: 'spinner',
      dot: { count: 3, category: 'processes' },
    })
  })

  it('an idle project shows nothing', () => {
    expect(scopeRowIndicator(state(), { active: false })).toEqual({ kind: 'none' })
    expect(scopeRowIndicator(state(), { active: true })).toEqual({ kind: 'none' })
  })

  it('hides chat on the active project — its Chat tab already shows it', () => {
    const chatty = state({ chat_messages: { unread: 4, thinking: true } })
    expect(scopeRowIndicator(chatty, { active: true })).toEqual({ kind: 'none' })
    expect(scopeRowIndicator(state({ chat_messages: { unread: 4 } }), { active: true })).toEqual({
      kind: 'none',
    })
  })

  it('keeps the chat behaviour on other projects: thinking spins with an unread dot', () => {
    expect(
      scopeRowIndicator(state({ chat_messages: { unread: 4, thinking: true } }), {
        active: false,
      }),
    ).toEqual({ kind: 'spinner', dot: { count: 4, category: 'chat' } })
    expect(
      scopeRowIndicator(state({ chat_messages: { thinking: true } }), { active: false }),
    ).toEqual({ kind: 'spinner' })
    expect(scopeRowIndicator(state({ chat_messages: { unread: 2 } }), { active: false })).toEqual({
      kind: 'badge',
      count: 2,
      category: 'chat',
    })
  })

  it('keeps the activity behaviour: a live activity spins even on the active project', () => {
    expect(scopeRowIndicator(state({ activity: { running: 1 } }), { active: true })).toEqual({
      kind: 'spinner',
    })
    expect(
      scopeRowIndicator(state({ activity: { running: 1, paused: 1 } }), { active: false }),
    ).toEqual({ kind: 'spinner' })
  })

  it('keeps the activity behaviour: a paused activity shows the paused icon over chat unread', () => {
    expect(
      scopeRowIndicator(state({ activity: { paused: 1 }, chat_messages: { unread: 3 } }), {
        active: false,
      }),
    ).toEqual({ kind: 'paused' })
  })

  it('ignores unseen activity results on the row — they belong to the App tab', () => {
    expect(scopeRowIndicator(state({ activity: { unseen: 5 } }), { active: false })).toEqual({
      kind: 'none',
    })
  })

  it('a waiting run outranks both a paused activity and chat unread', () => {
    expect(
      scopeRowIndicator(
        state({ process: { waiting: 1 }, activity: { paused: 1 }, chat_messages: { unread: 6 } }),
        { active: false },
      ),
    ).toEqual({ kind: 'badge', count: 1, category: 'processes' })
  })

  it('a running process on another project carries its chat unread as the dot', () => {
    expect(
      scopeRowIndicator(state({ process: { running: 1 }, chat_messages: { unread: 2 } }), {
        active: false,
      }),
    ).toEqual({ kind: 'spinner', dot: { count: 2, category: 'chat' } })
  })

  it('a running process on the active project drops the (hidden) chat unread dot', () => {
    expect(
      scopeRowIndicator(state({ process: { running: 1 }, chat_messages: { unread: 2 } }), {
        active: true,
      }),
    ).toEqual({ kind: 'spinner' })
  })

  it('ignores git and tests — they are tab-level channels', () => {
    expect(
      scopeRowIndicator(state({ git: { incoming: 3, uncommitted: 2 }, tests: { failing: 4 } }), {
        active: false,
      }),
    ).toEqual({ kind: 'none' })
  })
})

describe('shellTabIndicator — the Processes tab', () => {
  it('idle shows nothing', () => {
    expect(shellTabIndicator('processes', counts(), { viewing: false })).toEqual({ kind: 'none' })
  })

  it('a running run spins with no number', () => {
    expect(
      shellTabIndicator('processes', counts({ processesRunning: 1 }), { viewing: false }),
    ).toEqual({ kind: 'spinner' })
  })

  it('a run waiting at sign-off is a badge of 1 in the processes colour', () => {
    expect(
      shellTabIndicator('processes', counts({ processesWaiting: 1 }), { viewing: false }),
    ).toEqual({ kind: 'badge', count: 1, category: 'processes' })
  })

  it('running plus waiting is a spinner with a dot', () => {
    expect(
      shellTabIndicator('processes', counts({ processesRunning: 2, processesWaiting: 1 }), {
        viewing: false,
      }),
    ).toEqual({ kind: 'spinner', dot: { count: 1, category: 'processes' } })
  })

  it('still shows while the user is on the Processes tab', () => {
    expect(
      shellTabIndicator('processes', counts({ processesRunning: 1, processesWaiting: 1 }), {
        viewing: true,
      }),
    ).toEqual({ kind: 'spinner', dot: { count: 1, category: 'processes' } })
  })

  it('does not read other channels', () => {
    expect(
      shellTabIndicator(
        'processes',
        counts({ chat: 3, chatThinking: true, activityWorking: true, git: 2 }),
        { viewing: false },
      ),
    ).toEqual({ kind: 'none' })
  })
})

describe('shellTabIndicator — other tabs keep their behaviour', () => {
  it('Chat: thinking spins with an unread dot, otherwise the unread count', () => {
    expect(
      shellTabIndicator('chat', counts({ chat: 2, chatThinking: true }), { viewing: false }),
    ).toEqual({ kind: 'spinner', dot: { count: 2, category: 'chat' } })
    expect(shellTabIndicator('chat', counts({ chat: 2 }), { viewing: true })).toEqual({
      kind: 'badge',
      count: 2,
      category: 'chat',
    })
  })

  it('Git: the change count, never a spinner', () => {
    expect(
      shellTabIndicator('git', counts({ git: 5, processesRunning: 1 }), { viewing: false }),
    ).toEqual({ kind: 'badge', count: 5, category: 'git' })
  })

  it('App: a live activity spins with an unseen-results dot', () => {
    expect(
      shellTabIndicator('app', counts({ activityWorking: true, activityUnseen: 2 }), {
        viewing: false,
      }),
    ).toEqual({ kind: 'spinner', dot: { count: 2, category: 'activity' } })
  })

  it('App: a paused activity shows the paused icon over unseen results', () => {
    expect(
      shellTabIndicator('app', counts({ activityPaused: true, activityUnseen: 2 }), {
        viewing: false,
      }),
    ).toEqual({ kind: 'paused' })
  })

  it('App: unseen results alone are an activity badge', () => {
    expect(shellTabIndicator('app', counts({ activityUnseen: 3 }), { viewing: false })).toEqual({
      kind: 'badge',
      count: 3,
      category: 'activity',
    })
  })

  it('App: shows nothing while the user is viewing it', () => {
    expect(
      shellTabIndicator(
        'app',
        counts({ activityWorking: true, activityPaused: true, activityUnseen: 3 }),
        { viewing: true },
      ),
    ).toEqual({ kind: 'none' })
  })

  it.each<ShellTabKey>(['stories', 'files', 'notes', 'tests', 'timeline', 'tools', 'settings'])(
    '%s carries no indicator',
    (tab) => {
      const loud = counts({
        chat: 1,
        chatThinking: true,
        git: 1,
        tests: 1,
        activity: 1,
        activityWorking: true,
        activityUnseen: 1,
        processesRunning: 1,
        processesWaiting: 1,
      })
      expect(shellTabIndicator(tab, loud, { viewing: false })).toEqual({ kind: 'none' })
    },
  )
})

describe('groupTabIndicator', () => {
  it('Chat follows the chat rule', () => {
    expect(groupTabIndicator('chat', counts({ chat: 1, chatThinking: true }))).toEqual({
      kind: 'spinner',
      dot: { count: 1, category: 'chat' },
    })
    expect(groupTabIndicator('chat', counts({ chat: 4 }))).toEqual({
      kind: 'badge',
      count: 4,
      category: 'chat',
    })
  })

  it.each<GroupTabKey>(['home', 'tools'])('%s carries no indicator', (tab) => {
    expect(
      groupTabIndicator(tab, counts({ chat: 1, chatThinking: true, processesWaiting: 1 })),
    ).toEqual({ kind: 'none' })
  })
})

describe('navBadgeLabel', () => {
  it('says what a processes count means, singular and plural', () => {
    expect(navBadgeLabel({ count: 1, category: 'processes' })).toBe('1 run waiting for you')
    expect(navBadgeLabel({ count: 3, category: 'processes' })).toBe('3 runs waiting for you')
  })

  it('labels the other categories', () => {
    expect(navBadgeLabel({ count: 2, category: 'chat' })).toBe('2 unread')
    expect(navBadgeLabel({ count: 1, category: 'activity' })).toBe('1 new result')
    expect(navBadgeLabel({ count: 4, category: 'activity' })).toBe('4 new results')
    expect(navBadgeLabel({ count: 1, category: 'git' })).toBe('1 git change')
    expect(navBadgeLabel({ count: 7, category: 'git' })).toBe('7 git changes')
    expect(navBadgeLabel({ count: 1, category: 'tests' })).toBe('1 failing test')
    expect(navBadgeLabel({ count: 2, category: 'cross-project' })).toBe('2 requests')
  })

  it('caps a large count the same way the badge does', () => {
    expect(navBadgeLabel({ count: 250, category: 'processes' })).toBe('99+ runs waiting for you')
  })
})
