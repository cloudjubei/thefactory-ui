import { describe, expect, it, vi } from 'vitest'

import { ProviderOAuthFlow } from './providerOAuthFlow'
import { PROVIDER_OAUTH_COPY } from '../utils/providerConnectionFormConstants'

const PAGE = 'https://auth.atlassian.com/authorize?client_id=x&state=s1'
const RETURN = 'https://app.example/cb?code=c1&state=s1'
const CONNECTION = { id: 'conn', name: 'Acme' }

function flow(over: Partial<ConstructorParameters<typeof ProviderOAuthFlow>[0]> = {}) {
  const actions = {
    start: vi.fn(async () => PAGE),
    finish: vi.fn(async () => CONNECTION),
    ...over,
  }
  return { flow: new ProviderOAuthFlow(actions), actions }
}

describe('ProviderOAuthFlow', () => {
  it('starts ready', () => {
    expect(flow().flow.getState()).toEqual({ step: 'ready', error: null })
  })

  it('answers the page to open and waits for the person to come back', async () => {
    const { flow: f, actions } = flow()
    await expect(f.start('jira', { name: 'Acme', cloudId: 'abc' })).resolves.toBe(PAGE)
    expect(actions.start).toHaveBeenCalledWith('jira', { name: 'Acme', cloudId: 'abc' })
    expect(f.getState()).toEqual({ step: 'waiting', page: PAGE, error: null })
  })

  it('can open on a step already reached', () => {
    const f = new ProviderOAuthFlow(flow().actions, { step: 'waiting', page: PAGE, error: null })
    expect(f.getState()).toEqual({ step: 'waiting', page: PAGE, error: null })
  })

  it('does not start twice', async () => {
    const { flow: f, actions } = flow()
    await f.start('jira', { name: 'Acme' })
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

  it('refuses to open a page that is not https', async () => {
    const { flow: f } = flow({ start: vi.fn(async () => 'javascript:alert(1)') })
    await expect(f.start('github', { name: 'Acme' })).resolves.toBeUndefined()
    expect(f.getState()).toEqual({ step: 'ready', error: PROVIDER_OAUTH_COPY.badPage })
  })

  it('finishes with the provider it started on, and hands back the connection', async () => {
    const { flow: f, actions } = flow()
    await f.start('jira', { name: 'Acme' })
    await expect(f.finish(RETURN)).resolves.toBe(CONNECTION)
    expect(actions.finish).toHaveBeenCalledWith('jira', { code: 'c1', state: 's1' })
    expect(f.getState()).toEqual({ step: 'done', error: null })
  })

  it('keeps waiting when the paste cannot be read, without calling the backend', async () => {
    const { flow: f, actions } = flow()
    await f.start('jira', { name: 'Acme' })
    await expect(f.finish('nonsense')).resolves.toBeUndefined()
    expect(actions.finish).not.toHaveBeenCalled()
    expect(f.getState()).toEqual({
      step: 'waiting',
      page: PAGE,
      error: PROVIDER_OAUTH_COPY.unreadable,
    })
  })

  it('keeps waiting on an address from another sign-in, so this one is not spent', async () => {
    const { flow: f, actions } = flow()
    await f.start('jira', { name: 'Acme' })
    await f.finish('https://app.example/cb?code=c1&state=other')
    expect(actions.finish).not.toHaveBeenCalled()
    expect(f.getState()).toMatchObject({ step: 'waiting', error: PROVIDER_OAUTH_COPY.otherSignIn })
  })

  it('goes back to ready when the provider refused', async () => {
    const { flow: f, actions } = flow()
    await f.start('jira', { name: 'Acme' })
    await f.finish('https://app.example/cb?error=access_denied&state=s1')
    expect(actions.finish).not.toHaveBeenCalled()
    expect(f.getState()).toEqual({
      step: 'ready',
      error: PROVIDER_OAUTH_COPY.refused('access_denied'),
    })
  })

  it('goes back to ready when finishing fails: the backend has spent the state', async () => {
    const { flow: f } = flow({
      finish: vi.fn(async () => {
        throw new Error('Invalid or expired OAuth state')
      }),
    })
    await f.start('jira', { name: 'Acme' })
    await expect(f.finish(RETURN)).resolves.toBeUndefined()
    expect(f.getState()).toEqual({ step: 'ready', error: PROVIDER_OAUTH_COPY.expired })
  })

  it('does not finish a sign-in that never started', async () => {
    const { flow: f, actions } = flow()
    await expect(f.finish(RETURN)).resolves.toBeUndefined()
    expect(actions.finish).not.toHaveBeenCalled()
  })

  it('does not finish the same return twice', async () => {
    let settle: (value: typeof CONNECTION) => void = () => {}
    const { flow: f, actions } = flow({
      finish: vi.fn(() => new Promise<typeof CONNECTION>((resolve) => (settle = resolve))),
    })
    await f.start('jira', { name: 'Acme' })
    const first = f.finish(RETURN)
    expect(f.getState().step).toBe('finishing')
    await expect(f.finish(RETURN)).resolves.toBeUndefined()
    expect(f.getState()).toEqual({ step: 'finishing', error: null })
    settle(CONNECTION)
    await first
    expect(actions.finish).toHaveBeenCalledTimes(1)
  })

  it('never keeps the code in its state', async () => {
    const { flow: f } = flow()
    await f.start('jira', { name: 'Acme' })
    await f.finish(RETURN)
    expect(JSON.stringify(f.getState())).not.toContain('c1')
  })

  it('tells subscribers, and stops when they leave', async () => {
    const { flow: f } = flow()
    const heard = vi.fn()
    const leave = f.subscribe(heard)
    await f.start('jira', { name: 'Acme' })
    expect(heard).toHaveBeenCalled()
    heard.mockClear()
    leave()
    f.reset()
    expect(heard).not.toHaveBeenCalled()
  })

  it('starts over on reset', async () => {
    const { flow: f } = flow()
    await f.start('jira', { name: 'Acme' })
    f.reset()
    expect(f.getState()).toEqual({ step: 'ready', error: null })
    await expect(f.finish(RETURN)).resolves.toBeUndefined()
  })

  it('drops a start that comes back after a reset', async () => {
    let settle: (page: string) => void = () => {}
    const { flow: f } = flow({
      start: vi.fn(() => new Promise<string>((resolve) => (settle = resolve))),
    })
    const started = f.start('jira', { name: 'Acme' })
    f.reset()
    settle(PAGE)
    await expect(started).resolves.toBeUndefined()
    expect(f.getState()).toEqual({ step: 'ready', error: null })
  })
})
