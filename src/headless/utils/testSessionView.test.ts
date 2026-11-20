import { describe, expect, it } from 'vitest'

import { testSessionDisplay } from './testSessionView'
import { TEST_SESSION_COPY, TEST_SESSION_SHOWN_LINES } from './testSessionViewConstants'
import type { TestSession, TestSessionState, TestSessionView } from './testSessionViewTypes'

const session = (over: Partial<TestSession> = {}): TestSession => ({
  key: 'run-1',
  runId: 'run-1',
  status: 'running',
  startedAt: 1,
  url: 'http://127.0.0.1:4100',
  parts: [],
  environment: 'dev',
  terms: [],
  log: { lines: [], errors: 0, warnings: 0, feature: 0, read: 0 },
  proof: [],
  ...over,
})

const view = (over: Partial<TestSessionView> = {}): TestSessionView => ({
  runId: 'run-1',
  key: 'run-1',
  offered: true,
  ...over,
})

const state = (over: Partial<TestSessionState> = {}): TestSessionState => ({
  view: view(),
  ...over,
})

describe('testSessionDisplay', () => {
  it('shows nothing before the session is read', () => {
    expect(testSessionDisplay({ view: undefined })).toBeUndefined()
  })

  it('offers a start before any session, with nothing found yet', () => {
    const display = testSessionDisplay(state())
    expect(display).toMatchObject({
      title: TEST_SESSION_COPY.title,
      headline: TEST_SESSION_COPY.idle,
      tone: 'empty',
      action: { kind: 'start', label: TEST_SESSION_COPY.start, busy: false },
      counts: [],
      showsFindings: false,
    })
    expect(display?.open).toBeUndefined()
    expect(display?.detail).toBeUndefined()
  })

  it('shows nothing for a run with nothing to serve and no session', () => {
    expect(
      testSessionDisplay(state({ view: view({ offered: false, reason: 'No serve stack.' }) })),
    ).toBeUndefined()
  })

  it('shows starting at once when the person pressed start, before the backend answers', () => {
    const display = testSessionDisplay(state({ pending: 'start' }))
    expect(display).toMatchObject({
      headline: TEST_SESSION_COPY.starting,
      tone: 'working',
      action: { kind: 'stop', busy: true },
    })
  })

  it('shows a running session: the app to open, the data, the counts, the latest lines and the proof newest first', () => {
    const lines = Array.from({ length: TEST_SESSION_SHOWN_LINES + 3 }, (_, i) => ({
      role: i % 2 ? 'backend' : 'web',
      kind: (['error', 'warning', 'feature'] as const)[i % 3] ?? 'error',
      text: `line ${i}`,
      at: i,
    }))
    const display = testSessionDisplay(
      state({
        view: view({
          session: session({
            log: { lines, errors: 5, warnings: 5, feature: 5, read: 90 },
            proof: [
              {
                id: 'p1',
                kind: 'record',
                label: 'reminders 42',
                source: 'Data · getItem',
                environment: 'dev',
                at: 1,
              },
              {
                id: 'p2',
                kind: 'event',
                label: 'reminder.sent',
                detail: '{"id":42}',
                source: 'backend trail',
                at: 2,
              },
            ],
          }),
        }),
      }),
    )
    expect(display).toMatchObject({
      headline: TEST_SESSION_COPY.running,
      tone: 'done',
      detail: TEST_SESSION_COPY.data('dev'),
      open: { href: 'http://127.0.0.1:4100', label: TEST_SESSION_COPY.open },
      action: { kind: 'stop', label: TEST_SESSION_COPY.stop, busy: false },
      showsFindings: true,
      linesHidden: 3,
    })
    expect(display?.counts).toEqual([
      { key: 'error', label: TEST_SESSION_COPY.errors, value: 5, tone: 'stuck' },
      { key: 'warning', label: TEST_SESSION_COPY.warnings, value: 5, tone: 'blocked' },
      { key: 'feature', label: TEST_SESSION_COPY.feature, value: 5, tone: 'done' },
    ])
    expect(display?.lines).toHaveLength(TEST_SESSION_SHOWN_LINES)
    expect(display?.lines.at(-1)).toMatchObject({
      text: `line ${TEST_SESSION_SHOWN_LINES + 2}`,
      role: 'web',
      kindLabel: 'Change',
      tone: 'done',
    })
    expect(display?.lines[0]?.key).not.toBe(display?.lines[1]?.key)
    expect(display?.proof).toEqual([
      {
        key: 'p2',
        kindLabel: TEST_SESSION_COPY.event,
        label: 'reminder.sent',
        detail: '{"id":42}',
        meta: `backend trail · ${TEST_SESSION_COPY.noEnvironment}`,
      },
      {
        key: 'p1',
        kindLabel: TEST_SESSION_COPY.record,
        label: 'reminders 42',
        meta: 'Data · getItem · dev',
      },
    ])
  })

  it('shows a session still starting as the backend says, with no app to open yet', () => {
    const display = testSessionDisplay(
      state({ view: view({ session: session({ status: 'starting', url: undefined }) }) }),
    )
    expect(display).toMatchObject({
      headline: TEST_SESSION_COPY.starting,
      action: { kind: 'stop', busy: false },
    })
    expect(display?.open).toBeUndefined()
  })

  it('shows stopping at once when the person confirmed a stop', () => {
    const display = testSessionDisplay(
      state({ pending: 'stop', view: view({ session: session() }) }),
    )
    expect(display).toMatchObject({
      headline: TEST_SESSION_COPY.stopping,
      tone: 'working',
      action: { kind: 'stop', busy: true },
    })
    expect(display?.open).toBeUndefined()
  })

  it('offers a start again once stopped, saying why when nobody asked', () => {
    const display = testSessionDisplay(
      state({
        view: view({
          session: session({
            status: 'stopped',
            problem: 'The run ended.',
            environment: undefined,
          }),
        }),
      }),
    )
    expect(display).toMatchObject({
      headline: TEST_SESSION_COPY.stopped,
      tone: 'empty',
      detail: 'The run ended.',
      action: { kind: 'start', label: TEST_SESSION_COPY.startAgain },
      showsFindings: true,
    })
  })

  it('names no data environment when the session has none', () => {
    const display = testSessionDisplay(
      state({ view: view({ session: session({ status: 'stopped', environment: undefined }) }) }),
    )
    expect(display?.detail).toBe(TEST_SESSION_COPY.noData)
  })

  it('says why it failed, and offers to start again', () => {
    const display = testSessionDisplay(
      state({ view: view({ session: session({ status: 'failed', problem: 'build broke' }) }) }),
    )
    expect(display).toMatchObject({
      headline: TEST_SESSION_COPY.failed,
      tone: 'stuck',
      detail: 'build broke',
      action: { kind: 'start' },
    })
  })

  it('keeps a session of a run that ended on view, with no start, and the error of the last ask', () => {
    const display = testSessionDisplay(
      state({
        view: view({
          offered: false,
          reason: 'This run has ended.',
          session: session({ status: 'stopped' }),
        }),
        error: TEST_SESSION_COPY.startFailed,
      }),
    )
    expect(display?.action).toBeUndefined()
    expect(display?.error).toBe(TEST_SESSION_COPY.startFailed)
    expect(display?.showsFindings).toBe(true)
  })

  it('shows the helper gathering, with the way to its chat', () => {
    const chatContext = {
      type: 'PROJECT_TOPIC',
      projectId: 'be',
      topicId: 'test-session-run-1',
    } as never
    const display = testSessionDisplay(
      state({
        view: view({
          session: session({ helper: { chatContext, chatContextId: 'c', status: 'gathering' } }),
        }),
      }),
    )
    expect(display?.helper).toEqual({
      label: TEST_SESSION_COPY.helperGathering,
      tone: 'working',
      chat: { context: chatContext, chatContextId: 'c' },
      openLabel: TEST_SESSION_COPY.openChat,
    })
  })

  it.each([
    ['stopped', TEST_SESSION_COPY.helperStopped, 'empty', undefined],
    ['not-started', TEST_SESSION_COPY.helperNotStarted, 'stuck', 'No agent to start.'],
  ] as const)('shows a helper %s, with why', (status, label, tone, problem) => {
    const chatContext = { type: 'PROJECT_TOPIC', projectId: 'be', topicId: 't' } as never
    const display = testSessionDisplay(
      state({
        view: view({
          session: session({
            status: 'stopped',
            helper: { chatContext, chatContextId: 'c', status, ...(problem ? { problem } : {}) },
          }),
        }),
      }),
    )
    expect(display?.helper).toEqual({
      label,
      tone,
      chat: { context: chatContext, chatContextId: 'c' },
      openLabel: TEST_SESSION_COPY.openChat,
      ...(problem ? { detail: problem } : {}),
    })
  })

  it('shows no helper before one was started', () => {
    expect(
      testSessionDisplay(state({ view: view({ session: session() }) }))?.helper,
    ).toBeUndefined()
  })

  it('offers the helper’s model chip only beside a start', () => {
    expect(testSessionDisplay(state())?.picksAgent).toBe(true)
    expect(
      testSessionDisplay(state({ view: view({ session: session({ status: 'failed' }) }) }))
        ?.picksAgent,
    ).toBe(true)
    expect(testSessionDisplay(state({ view: view({ session: session() }) }))?.picksAgent).toBe(
      false,
    )
    expect(testSessionDisplay(state({ pending: 'start' }))?.picksAgent).toBe(false)
    expect(
      testSessionDisplay(
        state({ view: view({ offered: false, session: session({ status: 'stopped' }) }) }),
      )?.picksAgent,
    ).toBe(false)
  })

  it('lets a session of a run that ended still be stopped', () => {
    const display = testSessionDisplay(
      state({ view: view({ offered: false, session: session() }) }),
    )
    expect(display?.action).toMatchObject({ kind: 'stop' })
  })
})
