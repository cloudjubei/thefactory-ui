import { describe, expect, it, vi } from 'vitest'

import { ProviderOAuthFlow } from './providerOAuthFlow'
import { PROVIDER_OAUTH_COPY } from '../utils/providerConnectionFormConstants'

const PAGE = 'https://auth.atlassian.com/authorize?client_id=x&state=s1'
const STARTED = { page: PAGE, signInId: 'in-1' }
const WAITING = { step: 'waiting', page: PAGE, signInId: 'in-1', error: null } as const

function flow(over: Partial<ConstructorParameters<typeof ProviderOAuthFlow>[0]> = {}) {
  const actions = {
    start: vi.fn(async () => STARTED),
    read: vi.fn(async () => ({ signInId: 'in-1', status: 'waiting' as const })),
    withdraw: vi.fn(async () => undefined),
    ...over,
  }
  return { flow: new ProviderOAuthFlow(actions), actions }
}

async function waiting(over: Parameters<typeof flow>[0] = {}) {
  const made = flow(over)
  await made.flow.start('jira', { name: 'Acme' })
  return made
}

describe('ProviderOAuthFlow', () => {
  it('starts ready', () => {
    expect(flow().flow.getState()).toEqual({ step: 'ready', error: null })
  })

  it('answers the page to open and waits to be told', async () => {
    const { flow: f, actions } = flow()
    await expect(f.start('jira', { name: 'Acme', cloudId: 'abc' })).resolves.toBe(PAGE)
    expect(actions.start).toHaveBeenCalledWith('jira', { name: 'Acme', cloudId: 'abc' })
    expect(f.getState()).toEqual(WAITING)
  })

  it('passes a reconnect’s connection on', async () => {
    const { flow: f, actions } = flow()
    await f.start('jira', { name: 'Acme', connectionId: 'c1' })
    expect(actions.start).toHaveBeenCalledWith('jira', { name: 'Acme', connectionId: 'c1' })
  })

  it('can open on a step already reached', () => {
    const f = new ProviderOAuthFlow(flow().actions, WAITING)
    expect(f.getState()).toEqual(WAITING)
  })

  it('does not start twice', async () => {
    const { flow: f, actions } = await waiting()
    await expect(f.start('jira', { name: 'Acme' })).resolves.toBeUndefined()
    expect(actions.start).toHaveBeenCalledTimes(1)
  })

  it('stays ready and says why when a sign-in cannot start', async () => {
    const { flow: f } = flow({
      start: vi.fn(async () => {
        throw new Error('Provider OAuth is not configured')
      }),
    })
    await expect(f.start('github', { name: 'Acme' })).resolves.toBeUndefined()
    expect(f.getState()).toEqual({ step: 'ready', error: PROVIDER_OAUTH_COPY.notSetUp })
  })

  it('refuses a page it could not hand to the system browser', async () => {
    const { flow: f } = flow({
      start: vi.fn(async () => ({ page: 'javascript:alert(1)', signInId: 'in-1' })),
    })
    await expect(f.start('jira', { name: 'Acme' })).resolves.toBeUndefined()
    expect(f.getState()).toEqual({ step: 'ready', error: PROVIDER_OAUTH_COPY.badPage })
  })

  it('drops a start the person backed out of', async () => {
    let answer: (started: typeof STARTED) => void = () => {}
    const { flow: f } = flow({
      start: vi.fn(() => new Promise<typeof STARTED>((resolve) => (answer = resolve))),
    })
    const started = f.start('jira', { name: 'Acme' })
    f.reset()
    answer(STARTED)
    await expect(started).resolves.toBeUndefined()
    expect(f.getState()).toEqual({ step: 'ready', error: null })
  })

  it('notifies whoever listens, until they stop', async () => {
    const { flow: f } = flow()
    const listener = vi.fn()
    const stop = f.subscribe(listener)
    await f.start('jira', { name: 'Acme' })
    expect(listener).toHaveBeenCalledTimes(2)
    stop()
    f.reset()
    expect(listener).toHaveBeenCalledTimes(2)
  })
})

describe('how a sign-in ends, unasked', () => {
  it.each([
    ['signed-in', { step: 'done', error: null }],
    ['declined', { step: 'ready', error: PROVIDER_OAUTH_COPY.declined }],
    ['failed', { step: 'ready', error: PROVIDER_OAUTH_COPY.finishFailed }],
  ] as const)('%s', async (status, state) => {
    const { flow: f } = await waiting()
    f.onReport({ signInId: 'in-1', status })
    expect(f.getState()).toEqual(state)
  })

  it('stays waiting while the backend says it is', async () => {
    const { flow: f } = await waiting()
    f.onReport({ signInId: 'in-1', status: 'waiting' })
    expect(f.getState()).toEqual(WAITING)
  })

  it('ignores someone else’s sign-in', async () => {
    const { flow: f } = await waiting()
    f.onReport({ signInId: 'in-2', status: 'signed-in', connectionId: 'c9' })
    expect(f.getState()).toEqual(WAITING)
  })

  it('ignores a report with nothing waiting on it', () => {
    const { flow: f } = flow()
    f.onReport({ signInId: 'in-1', status: 'signed-in' })
    expect(f.getState()).toEqual({ step: 'ready', error: null })
  })

  it('can start again after a failure', async () => {
    const { flow: f, actions } = await waiting()
    f.onReport({ signInId: 'in-1', status: 'failed' })
    await expect(f.start('jira', { name: 'Acme' })).resolves.toBe(PAGE)
    expect(actions.start).toHaveBeenCalledTimes(2)
  })
})

describe('asking where it stands', () => {
  it('learns of an end it missed', async () => {
    const { flow: f, actions } = await waiting({
      read: vi.fn(async () => ({ signInId: 'in-1', status: 'failed' as const })),
    })
    await f.check()
    expect(actions.read).toHaveBeenCalledWith('in-1')
    expect(f.getState()).toEqual({ step: 'ready', error: PROVIDER_OAUTH_COPY.finishFailed })
  })

  it('keeps waiting while it is open', async () => {
    const { flow: f } = await waiting()
    await f.check()
    expect(f.getState()).toEqual(WAITING)
  })

  it('says so when the backend no longer holds it', async () => {
    const { flow: f } = await waiting({ read: vi.fn(async () => undefined) })
    await f.check()
    expect(f.getState()).toEqual({ step: 'ready', error: PROVIDER_OAUTH_COPY.lost })
  })

  it('keeps waiting when the read fails: nothing is known of its end', async () => {
    const { flow: f } = await waiting({
      read: vi.fn(async () => {
        throw new Error('offline')
      }),
    })
    await f.check()
    expect(f.getState()).toEqual(WAITING)
  })

  it('asks nothing when not waiting', async () => {
    const { flow: f, actions } = flow()
    await f.check()
    expect(actions.read).not.toHaveBeenCalled()
  })

  it('drops an answer the person backed out past', async () => {
    let answer: (report: undefined) => void = () => {}
    const { flow: f } = await waiting({
      read: vi.fn(() => new Promise<undefined>((resolve) => (answer = resolve))),
    })
    const checking = f.check()
    f.reset()
    answer(undefined)
    await checking
    expect(f.getState()).toEqual({ step: 'ready', error: null })
  })
})

describe('backing out', () => {
  it('goes back to ready and withdraws the sign-in, the browser closed or not', async () => {
    const { flow: f, actions } = await waiting()
    f.reset()
    expect(f.getState()).toEqual({ step: 'ready', error: null })
    expect(actions.withdraw).toHaveBeenCalledWith('in-1')
  })

  it('ignores a report of what it backed out of', async () => {
    const { flow: f } = await waiting()
    f.reset()
    f.onReport({ signInId: 'in-1', status: 'signed-in' })
    expect(f.getState()).toEqual({ step: 'ready', error: null })
  })

  it('stays out when the backend cannot be told', async () => {
    const { flow: f } = await waiting({
      withdraw: vi.fn(async () => {
        throw new Error('offline')
      }),
    })
    f.reset()
    await Promise.resolve()
    expect(f.getState()).toEqual({ step: 'ready', error: null })
  })

  it('withdraws nothing when nothing is open', () => {
    const { flow: f, actions } = flow()
    f.reset()
    expect(actions.withdraw).not.toHaveBeenCalled()
  })
})
