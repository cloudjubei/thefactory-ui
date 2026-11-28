import { describe, expect, it, vi } from 'vitest'
import type { SignInSessionState } from 'thefactory-tools/types'

import { CLI_SIGN_IN_TEXT } from '../utils/cliSignInConstants'
import { SIGN_IN_SESSION_TEXT } from '../utils/signInSessionConstants'
import type { CliSignInStart } from '../utils/cliSignInTypes'
import { CliSignInStore } from './cliSignInStore'

const SESSION: SignInSessionState = {
  id: 's1',
  kind: 'cli-login',
  subject: 'codex',
  title: 'Sign in to Codex',
  status: 'open',
  surface: { kind: 'prompt', message: 'Sign in on the page, then enter this code there.' },
  startedAt: '2026-11-27T12:00:00.000Z',
  expiresAt: '2026-11-27T12:15:00.000Z',
}
const CODEX: CliSignInStart = { cli: 'codex', label: 'Codex' }

const ended = (status: SignInSessionState['status'], over: Partial<SignInSessionState> = {}) => ({
  ...SESSION,
  status,
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

function fakeSignIn() {
  const endings = new Set<(session: SignInSessionState) => void>()
  return {
    show: vi.fn(),
    onEnded: (listener: (session: SignInSessionState) => void) => {
      endings.add(listener)
      return () => {
        endings.delete(listener)
      }
    },
    end: (session: SignInSessionState) => endings.forEach((ending) => ending(session)),
    held: () => endings.size,
  }
}

function setUp(start = vi.fn(async (_request: CliSignInStart) => SESSION)) {
  const signIn = fakeSignIn()
  const close = vi.fn(async (_id: string) => {})
  const onFinished = vi.fn()
  const store = new CliSignInStore({ start, close, onFinished }, signIn)
  const release = store.retain()
  return { store, signIn, start, close, onFinished, release }
}

describe('CliSignInStore', () => {
  it('shows busy at once on the press, then hands the session it answers to the app to show', async () => {
    const answer = deferred<SignInSessionState>()
    const { store, signIn, start } = setUp(vi.fn(() => answer.promise))
    const pressed = store.start(CODEX)
    expect(store.snapshot()).toEqual({ pending: CODEX, starting: true, error: undefined })
    answer.resolve(SESSION)
    await pressed
    expect(start).toHaveBeenCalledWith(CODEX)
    expect(signIn.show).toHaveBeenCalledWith(SESSION)
    expect(store.snapshot()).toEqual({ pending: CODEX, starting: false, error: undefined })
  })

  it('asks once however often it is pressed while the press is on its way', async () => {
    const answer = deferred<SignInSessionState>()
    const { store, start } = setUp(vi.fn(() => answer.promise))
    const first = store.start(CODEX)
    void store.start(CODEX)
    void store.start({ cli: 'claude-code', label: 'Claude' })
    answer.resolve(SESSION)
    await first
    expect(start).toHaveBeenCalledTimes(1)
  })

  it('asks again once the press came back, so the open session shows again', async () => {
    const { store, signIn, start } = setUp()
    await store.start(CODEX)
    await store.start(CODEX)
    expect(start).toHaveBeenCalledTimes(2)
    expect(signIn.show).toHaveBeenCalledTimes(2)
  })

  it('rolls back with why when the sign-in could not start', async () => {
    const { store, signIn } = setUp(
      vi.fn(async () => {
        throw { isAxiosError: true, response: { status: 502, data: { error: 'no browser' } } }
      }),
    )
    await store.start(CODEX)
    expect(store.snapshot()).toEqual({ pending: undefined, starting: false, error: 'no browser' })
    expect(signIn.show).not.toHaveBeenCalled()
  })

  it('falls back to its own words when the refusal names no reason', async () => {
    const { store } = setUp(
      vi.fn(async () => {
        throw new Error('')
      }),
    )
    await store.start(CODEX)
    expect(store.snapshot().error).toBe(CLI_SIGN_IN_TEXT.startFailed)
  })

  it('clears an earlier failure on the next press', async () => {
    const start = vi.fn(async () => SESSION)
    start.mockRejectedValueOnce(new Error('first'))
    const { store } = setUp(start)
    await store.start(CODEX)
    expect(store.snapshot().error).toBe('first')
    const pressed = store.start(CODEX)
    expect(store.snapshot().error).toBeUndefined()
    await pressed
  })

  it('tells once the person is signed in, and is idle again', async () => {
    const { store, signIn, onFinished } = setUp()
    await store.start(CODEX)
    signIn.end(ended('finished'))
    expect(onFinished).toHaveBeenCalledTimes(1)
    expect(store.snapshot()).toEqual({ pending: undefined, starting: false, error: undefined })
  })

  it('shows why a sign-in that failed or ran out of time ended', async () => {
    const { store, signIn, onFinished } = setUp()
    await store.start(CODEX)
    signIn.end(ended('failed', { error: 'denied' }))
    expect(store.snapshot()).toEqual({ pending: undefined, starting: false, error: 'denied' })
    await store.start(CODEX)
    signIn.end(ended('timed-out'))
    expect(store.snapshot().error).toBe(SIGN_IN_SESSION_TEXT.timedOut)
    expect(onFinished).not.toHaveBeenCalled()
  })

  it('is idle with nothing to say after a sign-in closed by hand', async () => {
    const { store, signIn } = setUp()
    await store.start(CODEX)
    signIn.end(ended('closed'))
    expect(store.snapshot()).toEqual({ pending: undefined, starting: false, error: undefined })
  })

  it('takes no notice of another session’s ending', async () => {
    const { store, signIn, onFinished } = setUp()
    await store.start(CODEX)
    const before = store.snapshot()
    signIn.end(ended('finished', { id: 'other' }))
    expect(onFinished).not.toHaveBeenCalled()
    expect(store.snapshot()).toBe(before)
  })

  it('follows a session that ended before its press came back', async () => {
    const answer = deferred<SignInSessionState>()
    const { store, signIn, onFinished } = setUp(vi.fn(() => answer.promise))
    const pressed = store.start(CODEX)
    signIn.end(ended('finished'))
    answer.resolve(SESSION)
    await pressed
    expect(onFinished).toHaveBeenCalledTimes(1)
    expect(store.snapshot().pending).toBeUndefined()
  })

  it('closes its open session when stopped, and is idle at once', async () => {
    const { store, close } = setUp()
    await store.start(CODEX)
    await store.stop()
    expect(close).toHaveBeenCalledWith('s1')
    expect(store.snapshot().pending).toBeUndefined()
  })

  it('stops with nothing to close as a no-op, and swallows a close that failed', async () => {
    const { store, close } = setUp()
    await store.stop()
    expect(close).not.toHaveBeenCalled()
    await store.start(CODEX)
    close.mockRejectedValueOnce(new Error('gone'))
    await expect(store.stop()).resolves.toBeUndefined()
  })

  it('hears endings only while held, once however many hold it', () => {
    const signIn = fakeSignIn()
    const store = new CliSignInStore({ start: vi.fn(), close: vi.fn() }, signIn)
    const first = store.retain()
    const second = store.retain()
    expect(signIn.held()).toBe(1)
    first()
    first()
    expect(signIn.held()).toBe(1)
    second()
    expect(signIn.held()).toBe(0)
  })

  it('tells its listeners of each change and keeps the snapshot until one', async () => {
    const { store } = setUp()
    const listener = vi.fn()
    const unlisten = store.listen(listener)
    expect(store.snapshot()).toBe(store.snapshot())
    await store.start(CODEX)
    expect(listener).toHaveBeenCalled()
    const told = listener.mock.calls.length
    unlisten()
    await store.start(CODEX)
    expect(listener).toHaveBeenCalledTimes(told)
  })
})
