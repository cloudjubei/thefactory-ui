import { describe, expect, it, vi } from 'vitest'
import type { SignInSessionState } from 'thefactory-tools/types'
import { GITHUB_SIGN_IN_TEXT } from '../utils/githubSignInConstants'
import type { GithubSignInActions } from '../utils/githubSignInTypes'
import { SIGN_IN_SESSION_TEXT } from '../utils/signInSessionConstants'
import { GithubSignInStore } from './githubSignInStore'

const SESSION: SignInSessionState = {
  id: 's1',
  kind: 'github',
  subject: 'git-credential',
  title: 'Sign in to GitHub',
  status: 'open',
  surface: { kind: 'browser' },
  startedAt: '2026-11-27T12:00:00.000Z',
  expiresAt: '2026-11-27T12:15:00.000Z',
}
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

const refusal = (status: number, error?: string) => ({
  isAxiosError: true,
  response: { status, data: error ? { error } : {} },
})

function fakes(over: Partial<GithubSignInActions> = {}) {
  const endings = new Set<(session: SignInSessionState) => void>()
  const reconnects = new Set<() => void>()
  const signIn = {
    show: vi.fn(),
    onEnded: (listener: (session: SignInSessionState) => void) => {
      endings.add(listener)
      return () => {
        endings.delete(listener)
      }
    },
  }
  const ws = {
    onReconnect: (listener: () => void) => {
      reconnects.add(listener)
      return () => {
        reconnects.delete(listener)
      }
    },
  }
  const actions: GithubSignInActions = {
    start: vi.fn(async () => SESSION),
    listOpen: vi.fn(async () => [SESSION]),
    ...over,
  }
  const store = new GithubSignInStore(actions, signIn, ws)
  const release = store.retain()
  return {
    store,
    actions,
    signIn,
    release,
    end: (session: SignInSessionState) => endings.forEach((ending) => ending(session)),
    reconnect: () => reconnects.forEach((listener) => listener()),
    held: () => endings.size + reconnects.size,
  }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('GithubSignInStore', () => {
  it('starts ready', () => {
    expect(fakes().store.getState()).toEqual({ step: 'ready', error: null })
  })

  it('shows starting at once, then shows the session the backend opened', async () => {
    const { store, signIn } = fakes()
    const going = store.start()
    expect(store.getState()).toEqual({ step: 'starting', error: null })
    await going
    expect(signIn.show).toHaveBeenCalledWith(SESSION)
    expect(store.getState()).toEqual({ step: 'open', session: SESSION, error: null })
  })

  it('tells its listeners of every change, until they stop listening', async () => {
    const { store } = fakes()
    const heard = vi.fn()
    const off = store.subscribe(heard)
    await store.start()
    expect(heard).toHaveBeenCalledTimes(2)
    off()
    await store.start()
    expect(heard).toHaveBeenCalledTimes(2)
  })

  it('asks once however often it is pressed while starting', async () => {
    const answer = deferred<SignInSessionState>()
    const { store, actions } = fakes({ start: vi.fn(() => answer.promise) })
    const first = store.start()
    await store.start()
    answer.resolve(SESSION)
    await first
    expect(actions.start).toHaveBeenCalledTimes(1)
  })

  it('shows the open sign-in again on a press while it is open, asking nothing', async () => {
    const { store, actions, signIn } = fakes()
    await store.start()
    await store.start()
    expect(actions.start).toHaveBeenCalledTimes(1)
    expect(signIn.show).toHaveBeenCalledTimes(2)
    expect(signIn.show).toHaveBeenLastCalledWith(SESSION)
  })

  it('rolls back with the backend’s words when the sign-in cannot start', async () => {
    const { store, signIn } = fakes({
      start: vi.fn(async () => {
        throw refusal(502, 'GitHub could not be reached.')
      }),
    })
    await store.start()
    expect(store.getState()).toEqual({ step: 'ready', error: 'GitHub could not be reached.' })
    expect(signIn.show).not.toHaveBeenCalled()
  })

  it('says sign-in is not set up when the backend says so without words', async () => {
    const { store } = fakes({
      start: vi.fn(async () => {
        throw refusal(503)
      }),
    })
    await store.start()
    expect(store.getState()).toEqual({ step: 'ready', error: GITHUB_SIGN_IN_TEXT.notSetUp })
  })

  it('falls back to its own words for a refusal it cannot read', async () => {
    const { store } = fakes({
      start: vi.fn(async () => {
        throw {}
      }),
    })
    await store.start()
    expect(store.getState()).toEqual({ step: 'ready', error: GITHUB_SIGN_IN_TEXT.startFailed })
  })

  it('is done once its session finished, when nothing is left to read', async () => {
    const { store, end } = fakes()
    await store.start()
    end(ended('finished'))
    expect(store.getState()).toEqual({ step: 'done', error: null })
  })

  it('reads what a finished sign-in left, and is done with it', async () => {
    const token = deferred<string>()
    const finish = vi.fn(() => token.promise)
    const { store, end } = fakes({ finish })
    await store.start()
    end(ended('finished'))
    expect(store.getState()).toEqual({ step: 'finishing', error: null })
    expect(finish).toHaveBeenCalledWith('s1')
    token.resolve('tok-1')
    await settle()
    expect(store.getState()).toEqual({ step: 'done', tokenId: 'tok-1', error: null })
  })

  it('rolls back with why when what a finished sign-in left cannot be read', async () => {
    const { store, end } = fakes({
      finish: vi.fn(async () => {
        throw refusal(404)
      }),
    })
    await store.start()
    end(ended('finished'))
    await settle()
    expect(store.getState()).toEqual({ step: 'ready', error: GITHUB_SIGN_IN_TEXT.finishFailed })
  })

  it('says why a sign-in that ran out or failed ended', async () => {
    const timedOut = fakes()
    await timedOut.store.start()
    timedOut.end(ended('timed-out'))
    expect(timedOut.store.getState()).toEqual({
      step: 'ready',
      error: SIGN_IN_SESSION_TEXT.timedOut,
    })

    const failed = fakes()
    await failed.store.start()
    failed.end(ended('failed', { error: 'The device code expired.' }))
    expect(failed.store.getState()).toEqual({ step: 'ready', error: 'The device code expired.' })
  })

  it('goes back to ready without a word when the person closed it', async () => {
    const { store, end } = fakes()
    await store.start()
    end(ended('closed'))
    expect(store.getState()).toEqual({ step: 'ready', error: null })
  })

  it('pays no heed to another session’s ending, or to one while it waits on none', async () => {
    const { store, end } = fakes()
    end(ended('finished'))
    expect(store.getState()).toEqual({ step: 'ready', error: null })
    await store.start()
    end(ended('finished', { id: 'other' }))
    expect(store.getState()).toEqual({ step: 'open', session: SESSION, error: null })
  })

  it('keeps an ending heard before the start answered', async () => {
    const answer = deferred<SignInSessionState>()
    const { store, end, signIn } = fakes({ start: vi.fn(() => answer.promise) })
    const going = store.start()
    end(ended('timed-out'))
    end(ended('closed', { id: 'other' }))
    answer.resolve(SESSION)
    await going
    expect(signIn.show).not.toHaveBeenCalled()
    expect(store.getState()).toEqual({ step: 'ready', error: SIGN_IN_SESSION_TEXT.timedOut })
  })

  it('forgets endings heard before an earlier start answered', async () => {
    const first = deferred<SignInSessionState>()
    const start = vi.fn(() => first.promise)
    const { store, end, actions } = fakes({ start })
    const going = store.start()
    end(ended('closed', { id: 'other' }))
    first.resolve(SESSION)
    await going
    end(ended('closed'))
    vi.mocked(actions.start).mockResolvedValueOnce({ ...SESSION, id: 'other' })
    await store.start()
    expect(store.getState()).toMatchObject({ step: 'open' })
  })

  it('can start again once done', async () => {
    const { store, end, actions } = fakes()
    await store.start()
    end(ended('finished'))
    await store.start()
    expect(actions.start).toHaveBeenCalledTimes(2)
    expect(store.getState()).toMatchObject({ step: 'open' })
  })

  it('keeps an open sign-in the socket comes back to', async () => {
    const { store, reconnect, actions } = fakes()
    await store.start()
    reconnect()
    await settle()
    expect(actions.listOpen).toHaveBeenCalledTimes(1)
    expect(store.getState()).toMatchObject({ step: 'open' })
  })

  it('reads nothing on a reconnect while nothing is open', async () => {
    const { reconnect, actions } = fakes()
    reconnect()
    await settle()
    expect(actions.listOpen).not.toHaveBeenCalled()
  })

  it('stays open when the open sessions cannot be read again', async () => {
    const { store, reconnect } = fakes({
      listOpen: vi.fn(async () => {
        throw new Error('down')
      }),
    })
    await store.start()
    reconnect()
    await settle()
    expect(store.getState()).toMatchObject({ step: 'open' })
  })

  it('goes back to ready when its sign-in ended while the socket was down', async () => {
    const { store, reconnect } = fakes({ listOpen: vi.fn(async () => []) })
    await store.start()
    reconnect()
    await settle()
    expect(store.getState()).toEqual({ step: 'ready', error: null })
  })

  it('reads what a sign-in that ended while the socket was down left', async () => {
    const { store, reconnect } = fakes({
      listOpen: vi.fn(async () => []),
      finish: vi.fn(async () => 'tok-2'),
    })
    await store.start()
    reconnect()
    await settle()
    expect(store.getState()).toEqual({ step: 'done', tokenId: 'tok-2', error: null })
  })

  it('says a sign-in that ended unseen left nothing, when it did not finish', async () => {
    const { store, reconnect } = fakes({
      listOpen: vi.fn(async () => []),
      finish: vi.fn(async () => {
        throw refusal(404)
      }),
    })
    await store.start()
    reconnect()
    await settle()
    expect(store.getState()).toEqual({ step: 'ready', error: GITHUB_SIGN_IN_TEXT.lost })
  })

  it('drops a reread the sign-in’s own ending overtook', async () => {
    const open = deferred<SignInSessionState[]>()
    const { store, reconnect, end } = fakes({ listOpen: vi.fn(() => open.promise) })
    await store.start()
    reconnect()
    end(ended('timed-out'))
    open.resolve([])
    await settle()
    expect(store.getState()).toEqual({ step: 'ready', error: SIGN_IN_SESSION_TEXT.timedOut })
  })

  it('stops hearing endings and reconnects once released, however often released', () => {
    const { release, held } = fakes()
    expect(held()).toBe(2)
    release()
    release()
    expect(held()).toBe(0)
  })

  it('hears once however many hold it', () => {
    const made = fakes()
    const second = made.store.retain()
    expect(made.held()).toBe(2)
    second()
    expect(made.held()).toBe(2)
    made.release()
    expect(made.held()).toBe(0)
  })
})
