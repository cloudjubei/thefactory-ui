import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GroupTicketOverview } from '../utils/groupTicketPageTypes'

const api = vi.hoisted(() => ({ readGroupTicketOverview: vi.fn() }))
vi.mock('../api/groupTicketTabsApi', () => api)

import { GroupTicketOverviewStore } from './groupTicketOverviewStore'

const overview = (key: string, summary = `Summary of ${key}`): GroupTicketOverview => ({
  ticket: {
    key,
    url: `https://acme.atlassian.net/browse/${key}`,
    summary,
    status: 'To Do',
    statusCategory: 'new',
    description: '',
    updatedAt: '2026-11-19T10:00:00Z',
    mine: false,
  },
  actions: ['discuss'],
  updates: [],
  pullRequests: [],
  chats: [],
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

beforeEach(() => {
  api.readGroupTicketOverview.mockReset()
})

describe('GroupTicketOverviewStore', () => {
  it('is unread at first, then holds what the backend answered', async () => {
    api.readGroupTicketOverview.mockResolvedValue(overview('A-1'))
    const store = new GroupTicketOverviewStore('osc')
    expect(store.snapshot('A-1')).toEqual({
      overview: undefined,
      readError: undefined,
      reading: false,
    })
    await store.read('A-1')
    expect(api.readGroupTicketOverview).toHaveBeenCalledWith('osc', 'A-1')
    expect(store.snapshot('A-1')).toEqual({
      overview: overview('A-1'),
      readError: undefined,
      reading: false,
    })
  })

  it('reads once however often it is asked meanwhile, and tells each listener of that ticket', async () => {
    const reading = deferred<GroupTicketOverview>()
    api.readGroupTicketOverview.mockReturnValueOnce(reading.promise)
    const store = new GroupTicketOverviewStore('osc')
    const heard = vi.fn()
    const other = vi.fn()
    store.listen('A-1', heard)
    store.listen('B-2', other)
    const first = store.read('A-1')
    const second = store.read('A-1')
    expect(store.snapshot('A-1').reading).toBe(true)
    reading.resolve(overview('A-1'))
    await Promise.all([first, second])
    expect(api.readGroupTicketOverview).toHaveBeenCalledTimes(1)
    expect(heard).toHaveBeenCalled()
    expect(other).not.toHaveBeenCalled()
  })

  it('keeps what it read when a later read fails, with why', async () => {
    api.readGroupTicketOverview.mockResolvedValueOnce(overview('A-1'))
    api.readGroupTicketOverview.mockRejectedValueOnce(new Error('Jira is down'))
    const store = new GroupTicketOverviewStore('osc')
    await store.read('A-1')
    await store.read('A-1')
    expect(store.snapshot('A-1')).toEqual({
      overview: overview('A-1'),
      readError: 'Jira is down',
      reading: false,
    })
  })

  it('says why the first read failed, and clears it once a read answers', async () => {
    api.readGroupTicketOverview.mockRejectedValueOnce(new Error(''))
    api.readGroupTicketOverview.mockResolvedValueOnce(overview('A-1'))
    const store = new GroupTicketOverviewStore('osc')
    await store.read('A-1')
    expect(store.snapshot('A-1').readError).toBe('Could not read the ticket.')
    await store.read('A-1')
    expect(store.snapshot('A-1').readError).toBeUndefined()
  })

  it('stops telling a listener once it stopped listening', async () => {
    api.readGroupTicketOverview.mockResolvedValue(overview('A-1'))
    const store = new GroupTicketOverviewStore('osc')
    const heard = vi.fn()
    const stop = store.listen('A-1', heard)
    stop()
    await store.read('A-1')
    expect(heard).not.toHaveBeenCalled()
  })

  it('answers the same snapshot while nothing changed', async () => {
    api.readGroupTicketOverview.mockResolvedValue(overview('A-1'))
    const store = new GroupTicketOverviewStore('osc')
    await store.read('A-1')
    expect(store.snapshot('A-1')).toBe(store.snapshot('A-1'))
  })
})
