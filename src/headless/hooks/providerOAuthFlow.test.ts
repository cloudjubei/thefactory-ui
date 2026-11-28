import { describe, expect, it, vi } from 'vitest'
import type { SignInSessionState } from 'thefactory-tools/types'

import { ProviderOAuthFlow } from './providerOAuthFlow'
import { PROVIDER_OAUTH_COPY } from '../utils/providerConnectionFormConstants'
import { SIGN_IN_SESSION_TEXT } from '../utils/signInSessionConstants'
import type { ProviderOAuthStarted } from '../utils/providerConnectionFormTypes'

const SESSION: SignInSessionState = {
  id: 's1',
  kind: 'provider-connection',
  subject: 'jira',
  title: 'Sign in to Jira',
  status: 'open',
  surface: { kind: 'browser' },
  startedAt: '2026-11-27T12:00:00.000Z',
  expiresAt: '2026-11-27T12:15:00.000Z',
}
const STARTED: ProviderOAuthStarted = { signInId: 'in-1', session: SESSION }
const OPEN = { step: 'open', signInId: 'in-1', session: SESSION, error: null } as const
const ended = (status: SignInSessionState['status'], over: Partial<SignInSessionState> = {}) => ({
  ...SESSION,
  status,
  ...over,
})

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function flow(over: Partial<ConstructorParameters<typeof ProviderOAuthFlow>[0]> = {}) {
  const actions = {
    start: vi.fn(async () => STARTED),
    read: vi.fn(async () => ({ signInId: 'in-1', status: 'waiting' as const })),
    show: vi.fn(),
    ...over,
  }
  return { flow: new ProviderOAuthFlow(actions), actions }
}

async function open(over: Parameters<typeof flow>[0] = {}) {
  const made = flow(over)
  await made.flow.start('jira', { name: 'Acme' })
  return made
}

describe('ProviderOAuthFlow', () => {
  it('starts ready', () => {
    expect(flow().flow.getState()).toEqual({ step: 'ready', error: null })
  })

  it('shows starting at once, then shows the session the backend opened', async () => {
    const { flow: f, actions } = flow()
    const going = f.start('jira', { name: 'Acme', cloudId: 'abc' })
    expect(f.getState()).toEqual({ step: 'starting', error: null })
    await going
    expect(actions.start).toHaveBeenCalledWith('jira', { name: 'Acme', cloudId: 'abc' })
    expect(actions.show).toHaveBeenCalledWith(SESSION)
    expect(f.getState()).toEqual(OPEN)
  })

  it('passes a reconnect’s connection on', async () => {
    const { flow: f, actions } = flow()
    await f.start('jira', { name: 'Acme', connectionId: 'c1' })
    expect(actions.start).toHaveBeenCalledWith('jira', { name: 'Acme', connectionId: 'c1' })
  })

  it('can open on a step already reached', () => {
    const f = new ProviderOAuthFlow(flow().actions, { step: 'starting', error: null })
    expect(f.getState()).toEqual({ step: 'starting', error: null })
  })

  it('asks once however often it is pressed while starting', async () => {
    const answer = deferred<ProviderOAuthStarted>()
    const { flow: f, actions } = flow({ start: vi.fn(() => answer.promise) })
    const first = f.start('jira', { name: 'Acme' })
    await f.start('jira', { name: 'Acme' })
    answer.resolve(STARTED)
    await first
    expect(actions.start).toHaveBeenCalledTimes(1)
  })

  it('shows the open sign-in again on a press while it is open, asking nothing', async () => {
    const { flow: f, actions } = await open()
    await f.start('jira', { name: 'Acme' })
    expect(actions.start).toHaveBeenCalledTimes(1)
    expect(actions.show).toHaveBeenCalledTimes(2)
    expect(f.getState()).toEqual(OPEN)
  })

  it('rolls back and says why when a sign-in cannot start', async () => {
    const { flow: f, actions } = flow({
      start: vi.fn(async () => {
        throw new Error('Provider OAuth is not configured')
      }),
    })
    await f.start('github', { name: 'Acme' })
    expect(f.getState()).toEqual({ step: 'ready', error: PROVIDER_OAUTH_COPY.notSetUp })
    expect(actions.show).not.toHaveBeenCalled()
  })

  it('notifies whoever listens, until they stop', async () => {
    const { flow: f } = flow()
    const listener = vi.fn()
    const stop = f.subscribe(listener)
    await f.start('jira', { name: 'Acme' })
    expect(listener).toHaveBeenCalledTimes(2)
    stop()
    f.onEnded(ended('closed'))
    expect(listener).toHaveBeenCalledTimes(2)
  })
})

describe('how a sign-in ends, as the backend reports it', () => {
  it.each([
    ['signed-in', { step: 'done', error: null }],
    ['declined', { step: 'ready', error: PROVIDER_OAUTH_COPY.declined }],
    ['failed', { step: 'ready', error: PROVIDER_OAUTH_COPY.finishFailed }],
  ] as const)('%s', async (status, state) => {
    const { flow: f } = await open()
    f.onReport({ signInId: 'in-1', status })
    expect(f.getState()).toEqual(state)
  })

  it('keeps a declined report’s words over the session closing after it', async () => {
    const { flow: f } = await open()
    f.onReport({ signInId: 'in-1', status: 'declined' })
    f.onEnded(ended('closed'))
    expect(f.getState()).toEqual({ step: 'ready', error: PROVIDER_OAUTH_COPY.declined })
  })

  it('stays open while the backend says it waits', async () => {
    const { flow: f } = await open()
    f.onReport({ signInId: 'in-1', status: 'waiting' })
    expect(f.getState()).toEqual(OPEN)
  })

  it('ignores someone else’s sign-in', async () => {
    const { flow: f } = await open()
    f.onReport({ signInId: 'in-2', status: 'signed-in', connectionId: 'c9' })
    expect(f.getState()).toEqual(OPEN)
  })

  it('ignores a report with nothing open', () => {
    const { flow: f } = flow()
    f.onReport({ signInId: 'in-1', status: 'signed-in' })
    expect(f.getState()).toEqual({ step: 'ready', error: null })
  })

  it('can start again after a failure', async () => {
    const { flow: f, actions } = await open()
    f.onReport({ signInId: 'in-1', status: 'failed' })
    await f.start('jira', { name: 'Acme' })
    expect(actions.start).toHaveBeenCalledTimes(2)
    expect(f.getState()).toEqual(OPEN)
  })

  it('can start again once done', async () => {
    const { flow: f, actions } = await open()
    f.onReport({ signInId: 'in-1', status: 'signed-in' })
    await f.start('jira', { name: 'Acme' })
    expect(actions.start).toHaveBeenCalledTimes(2)
  })
})

describe('how a sign-in ends, as its session ends', () => {
  it('is done once the session finished', async () => {
    const { flow: f } = await open()
    f.onEnded(ended('finished'))
    expect(f.getState()).toEqual({ step: 'done', error: null })
  })

  it('says why a session that ran out or failed ended', async () => {
    const timedOut = await open()
    timedOut.flow.onEnded(ended('timed-out'))
    expect(timedOut.flow.getState()).toEqual({
      step: 'ready',
      error: SIGN_IN_SESSION_TEXT.timedOut,
    })
    const failed = await open()
    failed.flow.onEnded(ended('failed', { error: 'The page closed.' }))
    expect(failed.flow.getState()).toEqual({ step: 'ready', error: 'The page closed.' })
  })

  it('goes back to ready without a word when the person closed it', async () => {
    const { flow: f } = await open()
    f.onEnded(ended('closed'))
    expect(f.getState()).toEqual({ step: 'ready', error: null })
  })

  it('ignores another session’s ending', async () => {
    const { flow: f } = await open()
    f.onEnded(ended('finished', { id: 'other' }))
    expect(f.getState()).toEqual(OPEN)
  })

  it('keeps an ending heard before the start answered, showing nothing', async () => {
    const answer = deferred<ProviderOAuthStarted>()
    const { flow: f, actions } = flow({ start: vi.fn(() => answer.promise) })
    const going = f.start('jira', { name: 'Acme' })
    f.onEnded(ended('closed', { id: 'other' }))
    f.onEnded(ended('timed-out'))
    answer.resolve(STARTED)
    await going
    expect(actions.show).not.toHaveBeenCalled()
    expect(f.getState()).toEqual({ step: 'ready', error: SIGN_IN_SESSION_TEXT.timedOut })
  })

  it('forgets endings heard for an earlier start', async () => {
    const first = deferred<ProviderOAuthStarted>()
    const { flow: f, actions } = flow({ start: vi.fn(() => first.promise) })
    const going = f.start('jira', { name: 'Acme' })
    f.onEnded(ended('closed', { id: 's2' }))
    first.resolve(STARTED)
    await going
    f.onEnded(ended('closed'))
    vi.mocked(actions.start).mockResolvedValueOnce({
      signInId: 'in-2',
      session: { ...SESSION, id: 's2' },
    })
    await f.start('jira', { name: 'Acme' })
    expect(f.getState()).toMatchObject({ step: 'open', signInId: 'in-2' })
  })
})

describe('asking where it stands', () => {
  it('learns of an end it missed', async () => {
    const { flow: f, actions } = await open({
      read: vi.fn(async () => ({ signInId: 'in-1', status: 'failed' as const })),
    })
    await f.check()
    expect(actions.read).toHaveBeenCalledWith('in-1')
    expect(f.getState()).toEqual({ step: 'ready', error: PROVIDER_OAUTH_COPY.finishFailed })
  })

  it('stays open while it is', async () => {
    const { flow: f } = await open()
    await f.check()
    expect(f.getState()).toEqual(OPEN)
  })

  it('says so when the backend no longer holds it', async () => {
    const { flow: f } = await open({ read: vi.fn(async () => undefined) })
    await f.check()
    expect(f.getState()).toEqual({ step: 'ready', error: PROVIDER_OAUTH_COPY.lost })
  })

  it('stays open when the read fails: nothing is known of its end', async () => {
    const { flow: f } = await open({
      read: vi.fn(async () => {
        throw new Error('offline')
      }),
    })
    await f.check()
    expect(f.getState()).toEqual(OPEN)
  })

  it('asks nothing when nothing is open', async () => {
    const { flow: f, actions } = flow()
    await f.check()
    expect(actions.read).not.toHaveBeenCalled()
  })

  it('drops an answer its session’s ending overtook', async () => {
    const answer = deferred<undefined>()
    const { flow: f } = await open({ read: vi.fn(() => answer.promise) })
    const checking = f.check()
    f.onEnded(ended('timed-out'))
    answer.resolve(undefined)
    await checking
    expect(f.getState()).toEqual({ step: 'ready', error: SIGN_IN_SESSION_TEXT.timedOut })
  })
})
