import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TEST_SESSION_COPY } from '../utils/testSessionViewConstants'
import type { TestSession, TestSessionView } from '../utils/testSessionViewTypes'

const api = vi.hoisted(() => ({
  readTestSession: vi.fn(),
  startTestSession: vi.fn(),
  stopTestSession: vi.fn(),
}))

vi.mock('../api/testSessionApi', () => api)

import { TestSessionStore } from './testSessionStore'

const session = (over: Partial<TestSession> = {}): TestSession => ({
  key: 'g1',
  runId: 'r1',
  status: 'running',
  startedAt: 1,
  parts: [],
  terms: [],
  log: { lines: [], errors: 0, warnings: 0, feature: 0, read: 0 },
  proof: [],
  ...over,
})

const view = (over: Partial<TestSessionView> = {}): TestSessionView => ({
  runId: 'r1',
  key: 'g1',
  offered: true,
  ...over,
})

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (err: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const refusal = (status: number, error: string) => ({
  isAxiosError: true,
  response: { status, data: { error } },
})

const loaded = async (read: TestSessionView = view()) => {
  api.readTestSession.mockResolvedValueOnce(read)
  const store = new TestSessionStore('r1')
  await store.refresh()
  return store
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset()
})

describe('TestSessionStore', () => {
  it('holds the session once read, and tells its listeners', async () => {
    api.readTestSession.mockResolvedValueOnce(view({ session: session() }))
    const store = new TestSessionStore('r1')
    const listener = vi.fn()
    const off = store.subscribe(listener)
    await store.refresh()
    expect(store.getState().view?.session?.status).toBe('running')
    expect(listener).toHaveBeenCalled()
    off()
  })

  it('shows nothing for a run the backend does not know, and keeps what it had on any other failure', async () => {
    const store = await loaded(view({ session: session() }))
    api.readTestSession.mockRejectedValueOnce(refusal(500, 'boom'))
    await store.refresh()
    expect(store.getState().view?.session).toBeDefined()
    api.readTestSession.mockRejectedValueOnce(refusal(404, 'No process run r1.'))
    await store.refresh()
    expect(store.getState().view).toBeUndefined()
  })

  it('shows a start at once, and the session the backend answers with', async () => {
    const store = await loaded()
    const answer = deferred<TestSessionView>()
    api.startTestSession.mockReturnValueOnce(answer.promise)
    const started = store.start()
    expect(store.getState().pending).toBe('start')
    answer.resolve(view({ session: session({ status: 'starting' }) }))
    expect(await started).toBe(true)
    expect(store.getState()).toEqual({ view: view({ session: session({ status: 'starting' }) }) })
  })

  it('starts the helper on the agent picked, and on the usual one when none is', async () => {
    const store = await loaded()
    api.startTestSession.mockResolvedValue(view({ session: session() }))
    await store.start({ runner: 'cli', cliTool: 'claude-code', cliModel: 'opus' })
    expect(api.startTestSession).toHaveBeenLastCalledWith('r1', {
      runner: 'cli',
      cliTool: 'claude-code',
      cliModel: 'opus',
    })
    await store.start()
    expect(api.startTestSession).toHaveBeenLastCalledWith('r1', {})
  })

  it('starts once however often it is pressed while the first is unanswered', async () => {
    const store = await loaded()
    const answer = deferred<TestSessionView>()
    api.startTestSession.mockReturnValueOnce(answer.promise)
    const first = store.start()
    expect(await store.start()).toBe(false)
    expect(await store.stop()).toBe(false)
    answer.resolve(view({ session: session() }))
    await first
    expect(api.startTestSession).toHaveBeenCalledTimes(1)
    expect(api.stopTestSession).not.toHaveBeenCalled()
  })

  it('rolls a start back to what it was, with why, when the backend refuses it', async () => {
    const before = view({ session: session({ status: 'stopped' }) })
    const store = await loaded(before)
    api.startTestSession.mockRejectedValueOnce(refusal(409, 'This run has ended.'))
    expect(await store.start()).toBe(false)
    expect(store.getState()).toEqual({ view: before, error: 'This run has ended.' })
  })

  it('says a start failed when the backend gave no reason', async () => {
    const store = await loaded()
    api.startTestSession.mockRejectedValueOnce(new Error('network'))
    await store.start()
    expect(store.getState().error).toBe('network')
    api.startTestSession.mockRejectedValueOnce({})
    await store.start()
    expect(store.getState().error).toBe(TEST_SESSION_COPY.startFailed)
  })

  it('shows a stop at once, rolls it back when refused, and clears the error on the next ask', async () => {
    const before = view({ session: session() })
    const store = await loaded(before)
    const answer = deferred<TestSessionView>()
    api.stopTestSession.mockReturnValueOnce(answer.promise)
    const stopping = store.stop()
    expect(store.getState().pending).toBe('stop')
    answer.reject({})
    expect(await stopping).toBe(false)
    expect(store.getState()).toEqual({ view: before, error: TEST_SESSION_COPY.stopFailed })
    api.stopTestSession.mockResolvedValueOnce(view({ session: session({ status: 'stopping' }) }))
    expect(await store.stop()).toBe(true)
    expect(store.getState().error).toBeUndefined()
    expect(store.getState().view?.session?.status).toBe('stopping')
  })

  it('drops a read that was under way when the person pressed', async () => {
    const store = await loaded()
    const slow = deferred<TestSessionView>()
    api.readTestSession.mockReturnValueOnce(slow.promise)
    const reading = store.refresh()
    api.startTestSession.mockResolvedValueOnce(view({ session: session({ status: 'starting' }) }))
    await store.start()
    slow.resolve(view())
    await reading
    expect(store.getState().view?.session?.status).toBe('starting')
  })

  it('takes the session a change pushes, for its own key only', async () => {
    const store = await loaded()
    store.onUpdate({ key: 'other', session: session({ key: 'other' }) })
    expect(store.getState().view?.session).toBeUndefined()
    store.onUpdate({ key: 'g1', session: session({ status: 'stopped' }) })
    expect(store.getState().view?.session?.status).toBe('stopped')
    store.onUpdate(null)
    store.onUpdate({ key: 'g1' })
    expect(store.getState().view?.session?.status).toBe('stopped')
  })

  it('takes no pushed change before it has read the session', () => {
    const store = new TestSessionStore('r1')
    store.onUpdate({ key: 'g1', session: session() })
    expect(store.getState().view).toBeUndefined()
  })
})
