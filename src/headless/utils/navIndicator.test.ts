import { describe, expect, it } from 'vitest'
import { ZERO_BADGE_COUNTS, type BadgeCounts } from '../hooks/useBadgeCountsCore'
import type { BadgeState } from './badgeAggregationTypes'
import type { GroupTabKey, ShellTabKey } from './shellNav'
import {
  groupTabIndicator,
  inkBadgeTitle,
  navRowIndicator,
  navRowTitle,
  scopeRowIndicator,
  shellTabIndicator,
} from './navIndicator'

function state(
  over: Partial<{ [K in keyof BadgeState]: Partial<BadgeState[K]> }> = {},
): BadgeState {
  return {
    chat_messages: { unread: 0, waiting: 0, thinking: false, ...over.chat_messages },
    git: { incoming: 0, uncommitted: 0, ...over.git },
    tests: { failing: 0, ...over.tests },
    activity: { running: 0, paused: 0, unseen: 0, ...over.activity },
    process: { running: 0, waiting: 0, failed: 0, ...over.process },
    signIn: { expired: [], ...over.signIn },
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
    expect(navRowIndicator({ parts: [], rollup: true })).toEqual({ kind: 'none' })
  })

  it('treats zero counts as absent', () => {
    expect(
      navRowIndicator({
        parts: [{ channel: 'processes', count: 0 }],
        fresh: [{ channel: 'chat', count: 0 }],
        rollup: true,
      }),
    ).toEqual({ kind: 'none' })
  })

  it('draws what waits as ink, its parts in channel order, titled in words', () => {
    expect(
      navRowIndicator({
        parts: [
          { channel: 'git', count: 4 },
          { channel: 'chat', count: 1 },
          { channel: 'processes', count: 3 },
        ],
        rollup: true,
      }),
    ).toEqual({
      kind: 'ink',
      badge: {
        parts: [
          { channel: 'processes', count: 3 },
          { channel: 'chat', count: 1 },
          { channel: 'git', count: 4 },
        ],
        rollup: true,
      },
      title: '3 runs need you · 1 chat needs you · 4 git changes',
    })
  })

  it('draws a running scope with nothing waiting as ink with no parts', () => {
    expect(navRowIndicator({ parts: [], running: 'processes', rollup: false })).toEqual({
      kind: 'ink',
      badge: { parts: [], running: 'processes', rollup: false },
      title: 'a run is working',
    })
  })

  it('keeps the number while something runs — running never replaces it', () => {
    const out = navRowIndicator({
      parts: [{ channel: 'chat', count: 2 }],
      running: 'chat',
      rollup: false,
    })
    expect(out).toEqual({
      kind: 'ink',
      badge: { parts: [{ channel: 'chat', count: 2 }], running: 'chat', rollup: false },
      title: '2 chats need you · an agent is replying',
    })
  })

  it('ink outranks the paused icon, which outranks news', () => {
    expect(
      navRowIndicator({
        parts: [{ channel: 'processes', count: 1 }],
        paused: true,
        fresh: [{ channel: 'chat', count: 2 }],
        rollup: true,
      }).kind,
    ).toBe('ink')
    expect(
      navRowIndicator({ parts: [], running: 'activity', paused: true, rollup: true }).kind,
    ).toBe('ink')
    expect(
      navRowIndicator({
        parts: [],
        paused: true,
        fresh: [{ channel: 'chat', count: 2 }],
        rollup: true,
      }),
    ).toEqual({ kind: 'paused', title: 'Paused activity — resumes when you open it' })
  })

  it('shows news alone as a dot that says what is new', () => {
    expect(
      navRowIndicator({
        parts: [],
        fresh: [
          { channel: 'activity', count: 2 },
          { channel: 'chat', count: 1 },
        ],
        rollup: true,
      }),
    ).toEqual({ kind: 'dot', title: '1 chat has news · 2 new results' })
  })

  it('titles with what it was told to describe when that says more than the badge', () => {
    const out = navRowIndicator({
      parts: [{ channel: 'failed', count: 3 }],
      described: [
        { channel: 'processes', count: 2 },
        { channel: 'failed', count: 1 },
      ],
      rollup: false,
    })
    expect(out).toMatchObject({ kind: 'ink', title: '1 failed · 2 runs need you' })
  })

  it('adds what broke on a row as red, and says it first', () => {
    expect(
      navRowIndicator({
        parts: [
          { channel: 'chat', count: 1 },
          { channel: 'failed', count: 1 },
        ],
        broke: ['Claude sign-in expired'],
        rollup: true,
      }),
    ).toEqual({
      kind: 'ink',
      badge: {
        parts: [
          { channel: 'failed', count: 2 },
          { channel: 'chat', count: 1 },
        ],
        rollup: true,
      },
      title: 'Claude sign-in expired · 1 failed · 1 chat needs you',
    })
  })

  it('turns a tab’s whole count red when something broke, keeping its one part', () => {
    expect(
      navRowIndicator({
        parts: [{ channel: 'chat', count: 2 }],
        broke: ['Claude sign-in expired', 'Codex sign-in expired'],
        running: 'chat',
        rollup: false,
      }),
    ).toEqual({
      kind: 'ink',
      badge: { parts: [{ channel: 'failed', count: 4 }], running: 'chat', rollup: false },
      title:
        'Claude sign-in expired · Codex sign-in expired · 2 chats need you · an agent is replying',
    })
  })

  it('shows something broke on its own, with nothing else waiting', () => {
    expect(navRowIndicator({ parts: [], broke: ['Claude sign-in expired'], rollup: true })).toEqual(
      {
        kind: 'ink',
        badge: { parts: [{ channel: 'failed', count: 1 }], rollup: true },
        title: 'Claude sign-in expired',
      },
    )
  })

  it('is pure — the same input always yields the same output and is never mutated', () => {
    const input = deepFreeze({
      parts: [
        { channel: 'git' as const, count: 1 },
        { channel: 'failed' as const, count: 2 },
      ],
      running: 'chat' as const,
      paused: true,
      fresh: [{ channel: 'chat' as const, count: 2 }],
      rollup: true,
    })
    const first = navRowIndicator(input)
    const second = navRowIndicator(input)
    expect(second).toEqual(first)
    expect(second).not.toBe(first)
  })
})

describe('inkBadgeTitle', () => {
  it('says what each channel means, singular and plural', () => {
    expect(
      inkBadgeTitle([
        { channel: 'failed', count: 1 },
        { channel: 'processes', count: 1 },
        { channel: 'chat', count: 3 },
        { channel: 'git', count: 1 },
      ]),
    ).toBe('1 failed · 1 run needs you · 3 chats need you · 1 git change')
    expect(
      inkBadgeTitle([
        { channel: 'activity', count: 1 },
        { channel: 'tests', count: 2 },
        { channel: 'cross-project', count: 1 },
        { channel: 'storage', count: 2 },
      ]),
    ).toBe('1 new result · 2 failing tests · 1 request · 2 storage warnings')
  })

  it('names what runs', () => {
    expect(inkBadgeTitle([], 'processes')).toBe('a run is working')
    expect(inkBadgeTitle([], 'activity')).toBe('a run is working')
    expect(inkBadgeTitle([], 'chat')).toBe('an agent is replying')
    expect(inkBadgeTitle([], 'git')).toBe('something is running')
  })

  it('caps a large count the same way the badge does', () => {
    expect(inkBadgeTitle([{ channel: 'processes', count: 250 }])).toBe('99+ runs need you')
  })
})

describe('navRowTitle', () => {
  it('is the label alone when the row shows nothing', () => {
    expect(navRowTitle('Tools', { kind: 'none' })).toBe('Tools')
  })

  it('adds what the row shows after the label', () => {
    expect(navRowTitle('Tools', { kind: 'dot', title: '2 new results' })).toBe(
      'Tools — 2 new results',
    )
  })
})

describe('scopeRowIndicator — a project or group row', () => {
  it('an idle scope shows nothing', () => {
    expect(scopeRowIndicator(state())).toEqual({ kind: 'none' })
  })

  it('adds up everything waiting on the person into one rolled-up badge', () => {
    expect(
      scopeRowIndicator(
        state({
          process: { waiting: 3, failed: 1 },
          chat_messages: { waiting: 1, unread: 2 },
          git: { incoming: 1, uncommitted: 3 },
          tests: { failing: 9 },
        }),
      ),
    ).toEqual({
      kind: 'ink',
      badge: {
        parts: [
          { channel: 'failed', count: 1 },
          { channel: 'processes', count: 3 },
          { channel: 'chat', count: 1 },
          { channel: 'git', count: 4 },
        ],
        rollup: true,
      },
      title: '1 failed · 3 runs need you · 1 chat needs you · 4 git changes',
    })
  })

  it('a running run or activity runs in the processes channel', () => {
    for (const s of [state({ process: { running: 1 } }), state({ activity: { running: 2 } })]) {
      expect(scopeRowIndicator(s)).toEqual({
        kind: 'ink',
        badge: { parts: [], running: 'processes', rollup: true },
        title: 'a run is working',
      })
    }
  })

  it('a replying agent runs in the chat channel, but a working run comes first', () => {
    expect(scopeRowIndicator(state({ chat_messages: { thinking: true } }))).toMatchObject({
      badge: { running: 'chat' },
    })
    expect(
      scopeRowIndicator(state({ chat_messages: { thinking: true }, process: { running: 1 } })),
    ).toMatchObject({ badge: { running: 'processes' } })
  })

  it('a paused activity shows the paused icon when nothing waits or runs', () => {
    expect(
      scopeRowIndicator(state({ activity: { paused: 1 }, chat_messages: { unread: 3 } })),
    ).toEqual({
      kind: 'paused',
      title: 'Paused activity — resumes when you open it',
    })
  })

  it('news alone — unread chat or new results — is a dot', () => {
    expect(
      scopeRowIndicator(state({ chat_messages: { unread: 2 }, activity: { unseen: 1 } })),
    ).toEqual({
      kind: 'dot',
      title: '2 chats have news · 1 new result',
    })
  })

  it('an unread reply never adds to the number — only an ask does', () => {
    expect(scopeRowIndicator(state({ chat_messages: { unread: 5, waiting: 1 } }))).toMatchObject({
      badge: { parts: [{ channel: 'chat', count: 1 }] },
    })
  })

  it('an expired sign-in its agents use turns the row red, named in the title', () => {
    expect(
      scopeRowIndicator(
        state({
          process: { waiting: 2, failed: 1, running: 1 },
          signIn: { expired: ['Claude'] },
        }),
      ),
    ).toEqual({
      kind: 'ink',
      badge: {
        parts: [
          { channel: 'failed', count: 2 },
          { channel: 'processes', count: 2 },
        ],
        running: 'processes',
        rollup: true,
      },
      title: 'Claude sign-in expired · 1 failed · 2 runs need you · a run is working',
    })
  })

  it('ignores failing tests — the Tests tab keeps them', () => {
    expect(scopeRowIndicator(state({ tests: { failing: 4 } }))).toEqual({ kind: 'none' })
  })
})

describe('shellTabIndicator — the Processes tab', () => {
  it('idle shows nothing', () => {
    expect(shellTabIndicator('processes', counts(), { viewing: false })).toEqual({ kind: 'none' })
  })

  it('a running run moves with no number', () => {
    expect(
      shellTabIndicator('processes', counts({ processesRunning: 1 }), { viewing: false }),
    ).toEqual({
      kind: 'ink',
      badge: { parts: [], running: 'processes', rollup: false },
      title: 'a run is working',
    })
  })

  it('waiting runs are a number in the processes channel, shown together with running', () => {
    expect(
      shellTabIndicator('processes', counts({ processesRunning: 2, processesWaiting: 3 }), {
        viewing: true,
      }),
    ).toEqual({
      kind: 'ink',
      badge: { parts: [{ channel: 'processes', count: 3 }], running: 'processes', rollup: false },
      title: '3 runs need you · a run is working',
    })
  })

  it('a failed merge turns the whole count red and says so', () => {
    expect(
      shellTabIndicator('processes', counts({ processesWaiting: 2, processesFailed: 1 }), {
        viewing: false,
      }),
    ).toEqual({
      kind: 'ink',
      badge: { parts: [{ channel: 'failed', count: 3 }], rollup: false },
      title: '1 failed · 2 runs need you',
    })
  })

  it('an expired sign-in its runs use turns the count red and says so', () => {
    expect(
      shellTabIndicator(
        'processes',
        counts({ processesWaiting: 1, processesRunning: 1, processesSignInExpired: ['Claude'] }),
        { viewing: false },
      ),
    ).toEqual({
      kind: 'ink',
      badge: { parts: [{ channel: 'failed', count: 2 }], running: 'processes', rollup: false },
      title: 'Claude sign-in expired · 1 run needs you · a run is working',
    })
  })

  it('does not read other channels', () => {
    expect(
      shellTabIndicator(
        'processes',
        counts({ chat: 3, chatWaiting: 1, chatThinking: true, activityWorking: true, git: 2 }),
        { viewing: false },
      ),
    ).toEqual({ kind: 'none' })
  })
})

describe('shellTabIndicator — the other tabs keep their own channel', () => {
  it('Chat: chats waiting on the person, together with an agent replying', () => {
    expect(
      shellTabIndicator('chat', counts({ chat: 4, chatWaiting: 2, chatThinking: true }), {
        viewing: false,
      }),
    ).toEqual({
      kind: 'ink',
      badge: { parts: [{ channel: 'chat', count: 2 }], running: 'chat', rollup: false },
      title: '2 chats need you · an agent is replying',
    })
  })

  it('Chat: an expired sign-in its chats use turns the count red and says so', () => {
    expect(
      shellTabIndicator(
        'chat',
        counts({
          chat: 3,
          chatWaiting: 1,
          chatSignInExpired: ['Codex'],
          processesSignInExpired: ['Claude'],
        }),
        { viewing: false },
      ),
    ).toEqual({
      kind: 'ink',
      badge: { parts: [{ channel: 'failed', count: 2 }], rollup: false },
      title: 'Codex sign-in expired · 1 chat needs you',
    })
  })

  it('Chat: unread replies alone are a dot', () => {
    expect(shellTabIndicator('chat', counts({ chat: 2 }), { viewing: true })).toEqual({
      kind: 'dot',
      title: '2 chats have news',
    })
  })

  it('Git: the change count, never running', () => {
    expect(
      shellTabIndicator('git', counts({ git: 5, processesRunning: 1 }), { viewing: false }),
    ).toEqual({
      kind: 'ink',
      badge: { parts: [{ channel: 'git', count: 5 }], rollup: false },
      title: '5 git changes',
    })
  })

  it('App: new results with a live activity running', () => {
    expect(
      shellTabIndicator('app', counts({ activityWorking: true, activityUnseen: 2 }), {
        viewing: false,
      }),
    ).toEqual({
      kind: 'ink',
      badge: { parts: [{ channel: 'activity', count: 2 }], running: 'activity', rollup: false },
      title: '2 new results · a run is working',
    })
  })

  it('App: a paused activity shows the paused icon when nothing else does', () => {
    expect(shellTabIndicator('app', counts({ activityPaused: true }), { viewing: false })).toEqual({
      kind: 'paused',
      title: 'Paused activity — resumes when you open it',
    })
  })

  it('App: shows nothing while the person is viewing it', () => {
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
        chatWaiting: 1,
        chatThinking: true,
        git: 1,
        tests: 1,
        activity: 1,
        activityWorking: true,
        activityUnseen: 1,
        processesRunning: 1,
        processesWaiting: 1,
        processesFailed: 1,
        chatSignInExpired: ['Claude'],
        processesSignInExpired: ['Claude'],
      })
      expect(shellTabIndicator(tab, loud, { viewing: false })).toEqual({ kind: 'none' })
    },
  )
})

describe('groupTabIndicator', () => {
  it('Chat counts the GROUP’s own chats waiting, with an agent replying', () => {
    expect(groupTabIndicator('chat', { unread: 3, waiting: 1, thinking: true })).toEqual({
      kind: 'ink',
      badge: { parts: [{ channel: 'chat', count: 1 }], running: 'chat', rollup: false },
      title: '1 chat needs you · an agent is replying',
    })
  })

  it('Chat turns red when the group’s own chats use an expired sign-in', () => {
    expect(
      groupTabIndicator('chat', { unread: 0, waiting: 0, thinking: true }, ['Claude']),
    ).toEqual({
      kind: 'ink',
      badge: { parts: [{ channel: 'failed', count: 1 }], running: 'chat', rollup: false },
      title: 'Claude sign-in expired · an agent is replying',
    })
  })

  it('Chat shows news alone as a dot', () => {
    expect(groupTabIndicator('chat', { unread: 4, waiting: 0, thinking: false })).toEqual({
      kind: 'dot',
      title: '4 chats have news',
    })
  })

  it('clears once the group’s chats are read', () => {
    expect(groupTabIndicator('chat', { unread: 0, waiting: 0, thinking: false })).toEqual({
      kind: 'none',
    })
  })

  it.each<GroupTabKey>(['home', 'tools'])('%s carries no indicator', (tab) => {
    expect(groupTabIndicator(tab, { unread: 1, waiting: 1, thinking: true }, ['Claude'])).toEqual({
      kind: 'none',
    })
  })
})
