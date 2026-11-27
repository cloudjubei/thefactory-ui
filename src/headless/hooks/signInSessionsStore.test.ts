import { describe, expect, it, vi } from 'vitest'
import type { SignInSessionState } from 'thefactory-tools/types'
import { SIGN_IN_SESSIONS_EVENT, SIGN_IN_SESSION_TEXT } from '../utils/signInSessionConstants'
import type { SignInSessionsApi } from '../utils/signInSessionTypes'
import { SignInSessionsStore } from './signInSessionsStore'

const PAGE: SignInSessionState = {
  id: 's1',
  kind: 'recording-site',
  subject: 'loom',
  title: 'Sign in to Loom',
  status: 'open',
  surface: { kind: 'browser' },
  startedAt: '2026-11-26T10:00:00.000Z',
  expiresAt: '2026-11-26T10:15:00.000Z',
}
const PROMPT: SignInSessionState = {
  ...PAGE,
  id: 's2',
  kind: 'cli',
  subject: 'some-tool',
  surface: { kind: 'prompt', message: 'Starting…' },
}

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

function fakeWs() {
  const reconnects = new Set<() => void>()
  const handlers = new Map<string, Set<(data: unknown) => void>>()
  return {
    on: <T = unknown>(event: string, handler: (data: T) => void) => {
      const set = handlers.get(event) ?? new Set()
      const held = handler as (data: unknown) => void
      handlers.set(event, set)
      set.add(held)
      return () => {
        set.delete(held)
      }
    },
    onReconnect: (handler: () => void) => {
      reconnects.add(handler)
      return () => {
        reconnects.delete(handler)
      }
    },
    emit: (data: unknown) => handlers.get(SIGN_IN_SESSIONS_EVENT)?.forEach((h) => h(data)),
    reconnect: () => reconnects.forEach((h) => h()),
    held: () => reconnects.size + [...handlers.values()].reduce((n, set) => n + set.size, 0),
  }
}

function setup(open: SignInSessionState[] = []) {
  const ws = fakeWs()
  const api = {
    list: vi.fn(async () => open),
    close: vi.fn(async () => {}),
    input: vi.fn(),
    resize: vi.fn(),
    answer: vi.fn(async () => {}),
  } satisfies SignInSessionsApi
  const store = new SignInSessionsStore(ws, api)
  const release = store.retain()
  const drawn = vi.fn()
  store.listen(drawn)
  return { ws, api, store, release, drawn }
}

describe('SignInSessionsStore', () => {
  it('shows nothing until a session is handed to it', () => {
    const { store, api } = setup()
    expect(store.snapshot()).toEqual({ shown: undefined, answering: false, error: undefined })
    expect(api.list).not.toHaveBeenCalled()
  })

  it('shows a session at once, and the same one again when handed it twice', () => {
    const { store, drawn } = setup()
    store.show(PAGE)
    expect(store.snapshot().shown).toEqual(PAGE)
    const first = store.snapshot()
    store.show(PAGE)
    expect(store.snapshot()).toBe(first)
    expect(drawn).toHaveBeenCalledTimes(1)
  })

  it('shows no session that is not open', () => {
    const { store } = setup()
    store.show({ ...PAGE, status: 'finished' })
    expect(store.snapshot().shown).toBeUndefined()
  })

  it('closes the view by itself the moment the backend tells the session ended', () => {
    const { store, ws } = setup()
    store.show(PAGE)
    ws.emit({ session: { ...PAGE, status: 'finished' } })
    expect(store.snapshot().shown).toBeUndefined()
  })

  it.each(['finished', 'closed', 'timed-out', 'failed'] as const)(
    'tells who waits for the ending of a session that ended %s, once',
    (status) => {
      const { store, ws } = setup()
      const ended = vi.fn()
      const off = store.onEnded(ended)
      store.show(PAGE)
      ws.emit({ session: { ...PAGE, status } })
      expect(ended).toHaveBeenCalledTimes(1)
      expect(ended).toHaveBeenCalledWith({ ...PAGE, status })
      off()
      ws.emit({ session: { ...PAGE, id: 's9', status } })
      expect(ended).toHaveBeenCalledTimes(1)
    },
  )

  it('tells of an ending even of a session it never showed', () => {
    const { store, ws } = setup()
    const ended = vi.fn()
    store.onEnded(ended)
    ws.emit({ session: { ...PAGE, status: 'timed-out' } })
    expect(ended).toHaveBeenCalledWith({ ...PAGE, status: 'timed-out' })
  })

  it('leaves the shown session alone when another one ends', () => {
    const { store, ws } = setup()
    store.show(PAGE)
    ws.emit({ session: { ...PROMPT, status: 'finished' } })
    expect(store.snapshot().shown).toEqual(PAGE)
  })

  it('shows what the session now shows as the backend tells it', () => {
    const { store, ws } = setup()
    store.show(PROMPT)
    const next = {
      ...PROMPT,
      surface: { kind: 'prompt', url: 'https://auth.example/device', input: { label: 'Code' } },
    }
    ws.emit({ session: next })
    expect(store.snapshot().shown).toEqual(next)
  })

  it('does not show a session by an event alone: only what a press handed over', () => {
    const { store, ws } = setup()
    ws.emit({ session: PAGE })
    expect(store.snapshot().shown).toBeUndefined()
  })

  it('never shows a session it was told has ended', () => {
    const { store, ws } = setup()
    ws.emit({ session: { ...PAGE, status: 'finished' } })
    store.show(PAGE)
    expect(store.snapshot().shown).toBeUndefined()
  })

  it('ignores an event that tells no session', () => {
    const { store, ws, drawn } = setup()
    store.show(PAGE)
    drawn.mockClear()
    ws.emit({ nope: true })
    ws.emit(undefined)
    expect(store.snapshot().shown).toEqual(PAGE)
    expect(drawn).not.toHaveBeenCalled()
  })

  it('closing by hand hides the view at once and ends the session', async () => {
    const { store, api } = setup()
    const closing = deferred<void>()
    api.close.mockReturnValueOnce(closing.promise)
    store.show(PAGE)
    const closed = store.close()
    expect(store.snapshot().shown).toBeUndefined()
    expect(api.close).toHaveBeenCalledWith('s1')
    closing.resolve()
    await closed
    expect(store.snapshot()).toEqual({ shown: undefined, answering: false, error: undefined })
  })

  it('closing with nothing shown asks nothing', async () => {
    const { store, api } = setup()
    await store.close()
    expect(api.close).not.toHaveBeenCalled()
  })

  it('shows the session again with why when closing fails and it is still open', async () => {
    const { store, api } = setup([PAGE])
    api.close.mockRejectedValueOnce(refusal(502, 'The backend is not answering.'))
    store.show(PAGE)
    await store.close()
    expect(store.snapshot()).toEqual({
      shown: PAGE,
      answering: false,
      error: 'The backend is not answering.',
    })
  })

  it('stays closed when closing fails because the session is already gone', async () => {
    const { store, api } = setup([])
    api.close.mockRejectedValueOnce(refusal(404, 'No sign-in s1 is open.'))
    store.show(PAGE)
    await store.close()
    expect(store.snapshot()).toEqual({ shown: undefined, answering: false, error: undefined })
  })

  it('stays closed when closing fails and the sessions cannot be read either', async () => {
    const { store, api } = setup()
    api.close.mockRejectedValueOnce(new Error('offline'))
    api.list.mockRejectedValueOnce(new Error('offline'))
    store.show(PAGE)
    await store.close()
    expect(store.snapshot().shown).toBeUndefined()
  })

  it('does not bring back a session that ended while its closing failed', async () => {
    const { store, api, ws } = setup([PAGE])
    const closing = deferred<void>()
    api.close.mockReturnValueOnce(closing.promise)
    store.show(PAGE)
    const closed = store.close()
    ws.emit({ session: { ...PAGE, status: 'closed' } })
    closing.reject(new Error('late'))
    await closed
    expect(store.snapshot().shown).toBeUndefined()
  })

  it('hands the person’s answer over once, busy until it is taken, and keeps it nowhere', async () => {
    const { store, api } = setup()
    const taking = deferred<void>()
    api.answer.mockReturnValueOnce(taking.promise)
    store.show(PROMPT)
    const first = store.answer('code-123')
    const second = store.answer('code-123')
    expect(store.snapshot().answering).toBe(true)
    taking.resolve()
    await Promise.all([first, second])
    expect(api.answer).toHaveBeenCalledTimes(1)
    expect(api.answer).toHaveBeenCalledWith('s2', 'code-123')
    expect(store.snapshot()).toEqual({ shown: PROMPT, answering: false, error: undefined })
    expect(JSON.stringify(store.snapshot())).not.toContain('code-123')
  })

  it('says why an answer was not taken, and clears it on the next try', async () => {
    const { store, api } = setup()
    api.answer.mockRejectedValueOnce(refusal(409, 'That code is not right.'))
    store.show(PROMPT)
    await store.answer('nope')
    expect(store.snapshot()).toEqual({
      shown: PROMPT,
      answering: false,
      error: 'That code is not right.',
    })
    const retry = store.answer('code-123')
    expect(store.snapshot().error).toBeUndefined()
    await retry
  })

  it('falls back to its own words when a refusal says nothing', async () => {
    const { store, api } = setup()
    api.answer.mockRejectedValueOnce({})
    store.show(PROMPT)
    await store.answer('x')
    expect(store.snapshot().error).toBe(SIGN_IN_SESSION_TEXT.answerFailed)
  })

  it('answers nothing with no session shown, or with nothing typed', async () => {
    const { store, api } = setup()
    await store.answer('x')
    store.show(PROMPT)
    await store.answer('')
    expect(api.answer).not.toHaveBeenCalled()
  })

  it('drops the shown session when the socket comes back and it is no longer open', async () => {
    const { store, ws, api } = setup([])
    const ended = vi.fn()
    store.onEnded(ended)
    store.show(PAGE)
    ws.reconnect()
    await vi.waitFor(() => expect(store.snapshot().shown).toBeUndefined())
    expect(api.list).toHaveBeenCalledTimes(1)
    expect(ended).not.toHaveBeenCalled()
  })

  it('keeps the shown session, as it now reads, when the socket comes back and it is still open', async () => {
    const now = { ...PROMPT, surface: { kind: 'prompt' as const, message: 'Paste the code.' } }
    const { store, ws, api } = setup([now])
    store.show(PROMPT)
    ws.reconnect()
    await vi.waitFor(() => expect(store.snapshot().shown).toEqual(now))
    expect(api.list).toHaveBeenCalledTimes(1)
  })

  it('keeps the shown session when the sessions cannot be read as the socket comes back', async () => {
    const { store, ws, api } = setup()
    api.list.mockRejectedValueOnce(new Error('offline'))
    store.show(PAGE)
    ws.reconnect()
    await Promise.resolve()
    await Promise.resolve()
    expect(store.snapshot().shown).toEqual(PAGE)
  })

  it('reads nothing as the socket comes back with nothing shown', () => {
    const { ws, api } = setup()
    ws.reconnect()
    expect(api.list).not.toHaveBeenCalled()
  })

  it('listens to the socket once however many hold it, and lets go with the last', () => {
    const { ws, store, release } = setup()
    const other = store.retain()
    expect(ws.held()).toBe(2)
    release()
    release()
    expect(ws.held()).toBe(2)
    other()
    expect(ws.held()).toBe(0)
  })

  it('stops telling a listener that let go', () => {
    const { store } = setup()
    const drawn = vi.fn()
    const off = store.listen(drawn)
    off()
    store.show(PAGE)
    expect(drawn).not.toHaveBeenCalled()
  })
})
