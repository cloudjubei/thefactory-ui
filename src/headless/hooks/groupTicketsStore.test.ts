import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GroupTicket, GroupTicketList, TicketPlanStarted } from '../utils/groupTicketTypes'

const api = vi.hoisted(() => ({ readGroupTickets: vi.fn(), startGroupTicketPlan: vi.fn() }))

vi.mock('../api/groupTicketsApi', () => api)

import { GroupTicketsStore } from './groupTicketsStore'

const ticket = (key: string, over: Partial<GroupTicket> = {}): GroupTicket => ({
  key,
  summary: key,
  url: `https://j.example/${key}`,
  ...over,
})

const list = (over: Partial<GroupTicketList> = {}): GroupTicketList => ({
  connected: true,
  tickets: [ticket('A-1')],
  nextTicketKey: 'A-1',
  ...over,
})

const started = (key: string): TicketPlanStarted => ({
  ticket: ticket(key),
  chatContextId: `chat-${key}`,
  context: { type: 'GROUP_TOPIC', groupId: 'osc', topicId: `ticket-${key}` } as never,
  turnStarted: true,
  alreadyOpen: false,
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

beforeEach(() => {
  api.readGroupTickets.mockReset()
  api.startGroupTicketPlan.mockReset()
})

describe('GroupTicketsStore', () => {
  it('holds the list once read', async () => {
    api.readGroupTickets.mockResolvedValue(list())
    const store = new GroupTicketsStore('osc')
    expect(store.getState().list).toBeUndefined()
    await store.refresh()
    expect(api.readGroupTickets).toHaveBeenCalledWith('osc')
    expect(store.getState().list?.tickets.map((t) => t.key)).toEqual(['A-1'])
  })

  it('tells who listens, and stops once they leave', async () => {
    api.readGroupTickets.mockResolvedValue(list())
    const store = new GroupTicketsStore('osc')
    const listener = vi.fn()
    const leave = store.subscribe(listener)
    await store.refresh()
    expect(listener).toHaveBeenCalled()
    listener.mockClear()
    leave()
    await store.refresh()
    expect(listener).not.toHaveBeenCalled()
  })

  it('says why a read failed, and clears it on the next that works', async () => {
    api.readGroupTickets.mockRejectedValueOnce(refusal(502, 'Jira is down'))
    const store = new GroupTicketsStore('osc')
    await store.refresh()
    expect(store.getState().readError).toBe('Jira is down')
    api.readGroupTickets.mockResolvedValue(list())
    await store.refresh()
    expect(store.getState().readError).toBeNull()
  })

  it('falls back to its own words for a failure with none', async () => {
    api.readGroupTickets.mockRejectedValue({})
    const store = new GroupTicketsStore('osc')
    await store.refresh()
    expect(store.getState().readError).toBe('Could not read your tickets.')
  })

  it('keeps the list a later read could not refresh', async () => {
    api.readGroupTickets.mockResolvedValueOnce(list())
    const store = new GroupTicketsStore('osc')
    await store.refresh()
    api.readGroupTickets.mockRejectedValue(refusal(502, 'Jira is down'))
    await store.refresh()
    expect(store.getState().list?.tickets).toHaveLength(1)
    expect(store.getState().readError).toBe('Jira is down')
  })

  it('drops a read a newer one overtook', async () => {
    const first = deferred<GroupTicketList>()
    const second = deferred<GroupTicketList>()
    api.readGroupTickets.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const store = new GroupTicketsStore('osc')
    const a = store.refresh()
    const b = store.refresh()
    second.resolve(list({ tickets: [ticket('NEW-1')] }))
    await b
    first.resolve(list({ tickets: [ticket('OLD-1')] }))
    await a
    expect(store.getState().list?.tickets.map((t) => t.key)).toEqual(['NEW-1'])
  })

  describe('reading more', () => {
    it('adds the next page in order, leaving out a ticket it holds', async () => {
      api.readGroupTickets.mockResolvedValueOnce(
        list({ tickets: [ticket('A-1'), ticket('A-2')], nextPageToken: 'p2' }),
      )
      const store = new GroupTicketsStore('osc')
      await store.refresh()
      api.readGroupTickets.mockResolvedValueOnce(
        list({ tickets: [ticket('A-2'), ticket('A-3')], nextTicketKey: 'A-2' }),
      )
      await store.loadMore()
      expect(api.readGroupTickets).toHaveBeenLastCalledWith('osc', 'p2')
      const state = store.getState()
      expect(state.list?.tickets.map((t) => t.key)).toEqual(['A-1', 'A-2', 'A-3'])
      expect(state.list?.nextPageToken).toBeUndefined()
      expect(state.loadingMore).toBe(false)
    })

    it('keeps the next ticket of the first page, and finds one later when it had none', async () => {
      api.readGroupTickets.mockResolvedValueOnce(list({ nextPageToken: 'p2' }))
      const store = new GroupTicketsStore('osc')
      await store.refresh()
      api.readGroupTickets.mockResolvedValueOnce(
        list({ tickets: [ticket('A-2')], nextTicketKey: 'A-2' }),
      )
      await store.loadMore()
      expect(store.getState().list?.nextTicketKey).toBe('A-1')

      const { nextTicketKey: _none, ...noneNext } = list({
        tickets: [ticket('B-1', { groupStory: { id: 'g', title: 'G' } })],
        nextPageToken: 'p2',
      })
      api.readGroupTickets.mockResolvedValueOnce(noneNext)
      const other = new GroupTicketsStore('osc')
      await other.refresh()
      api.readGroupTickets.mockResolvedValueOnce(
        list({ tickets: [ticket('B-2')], nextTicketKey: 'B-2' }),
      )
      await other.loadMore()
      expect(other.getState().list?.nextTicketKey).toBe('B-2')
    })

    it('does nothing on the last page', async () => {
      api.readGroupTickets.mockResolvedValue(list())
      const store = new GroupTicketsStore('osc')
      await store.refresh()
      api.readGroupTickets.mockClear()
      await store.loadMore()
      expect(api.readGroupTickets).not.toHaveBeenCalled()
    })

    it('reads a page once however often it is asked', async () => {
      api.readGroupTickets.mockResolvedValueOnce(list({ nextPageToken: 'p2' }))
      const store = new GroupTicketsStore('osc')
      await store.refresh()
      const page = deferred<GroupTicketList>()
      api.readGroupTickets.mockReturnValueOnce(page.promise)
      const a = store.loadMore()
      expect(store.getState().loadingMore).toBe(true)
      const b = store.loadMore()
      page.resolve(list({ tickets: [ticket('A-2')] }))
      await Promise.all([a, b])
      expect(api.readGroupTickets).toHaveBeenCalledTimes(2)
    })

    it('says why a page failed and can be asked again', async () => {
      api.readGroupTickets.mockResolvedValueOnce(list({ nextPageToken: 'p2' }))
      const store = new GroupTicketsStore('osc')
      await store.refresh()
      api.readGroupTickets.mockRejectedValueOnce(refusal(502, 'Jira is down'))
      await store.loadMore()
      const state = store.getState()
      expect(state.readError).toBe('Jira is down')
      expect(state.loadingMore).toBe(false)
      expect(state.list?.nextPageToken).toBe('p2')
    })

    it('drops a page a fresh read overtook', async () => {
      api.readGroupTickets.mockResolvedValueOnce(list({ nextPageToken: 'p2' }))
      const store = new GroupTicketsStore('osc')
      await store.refresh()
      const page = deferred<GroupTicketList>()
      api.readGroupTickets.mockReturnValueOnce(page.promise)
      const more = store.loadMore()
      api.readGroupTickets.mockResolvedValueOnce(list({ tickets: [ticket('FRESH-1')] }))
      await store.refresh()
      page.resolve(list({ tickets: [ticket('STALE-1')] }))
      await more
      const state = store.getState()
      expect(state.list?.tickets.map((t) => t.key)).toEqual(['FRESH-1'])
      expect(state.loadingMore).toBe(false)
    })
  })

  describe('planning', () => {
    it('answers the chat to open, and marks the ticket while it starts', async () => {
      const plan = deferred<TicketPlanStarted>()
      api.startGroupTicketPlan.mockReturnValue(plan.promise)
      const store = new GroupTicketsStore('osc')
      const going = store.plan('A-1')
      expect(store.getState().planning).toBe('A-1')
      plan.resolve(started('A-1'))
      expect((await going)?.chatContextId).toBe('chat-A-1')
      expect(api.startGroupTicketPlan).toHaveBeenCalledWith('osc', 'A-1')
      expect(store.getState().planning).toBeUndefined()
    })

    it('starts no second plan while one is starting', async () => {
      const plan = deferred<TicketPlanStarted>()
      api.startGroupTicketPlan.mockReturnValue(plan.promise)
      const store = new GroupTicketsStore('osc')
      const first = store.plan('A-1')
      expect(await store.plan('A-2')).toBeUndefined()
      plan.resolve(started('A-1'))
      await first
      expect(api.startGroupTicketPlan).toHaveBeenCalledTimes(1)
    })

    it('says why a plan was refused and reads the list again, as it may be stale', async () => {
      api.startGroupTicketPlan.mockRejectedValue(refusal(409, 'A-1 already has a group story.'))
      api.readGroupTickets.mockResolvedValue(list({ tickets: [] }))
      const store = new GroupTicketsStore('osc')
      expect(await store.plan('A-1')).toBeUndefined()
      const state = store.getState()
      expect(state.planError).toBe('A-1 already has a group story.')
      expect(state.planning).toBeUndefined()
      expect(api.readGroupTickets).toHaveBeenCalledTimes(1)
      expect(state.list?.tickets).toEqual([])
    })

    it('falls back to its own words, and clears them on the next try', async () => {
      api.startGroupTicketPlan.mockRejectedValueOnce({})
      api.readGroupTickets.mockResolvedValue(list())
      const store = new GroupTicketsStore('osc')
      await store.plan('A-1')
      expect(store.getState().planError).toBe('The plan did not start.')
      const plan = deferred<TicketPlanStarted>()
      api.startGroupTicketPlan.mockReturnValueOnce(plan.promise)
      const going = store.plan('A-1')
      expect(store.getState().planError).toBeNull()
      plan.resolve(started('A-1'))
      await going
    })
  })
})
