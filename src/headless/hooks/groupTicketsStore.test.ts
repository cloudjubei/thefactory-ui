import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GROUP_TICKETS_SEARCH_WAIT_MS } from '../utils/groupTicketConstants'
import type { GroupTicket, GroupTicketList, TicketPlanStarted } from '../utils/groupTicketTypes'

const api = vi.hoisted(() => ({
  readGroupTickets: vi.fn(),
  startGroupTicketDiscussion: vi.fn(),
  startGroupTicketPlan: vi.fn(),
}))

vi.mock('../api/groupTicketsApi', () => api)

const reviewApi = vi.hoisted(() => ({ startColleagueReview: vi.fn() }))

vi.mock('../api/colleagueReviewApi', () => reviewApi)

const sourceApi = vi.hoisted(() => ({
  listWaitingReviewOffers: vi.fn(),
  dismissReviewOffer: vi.fn(),
}))

vi.mock('../api/colleagueReviewSourceApi', () => sourceApi)

import { GroupTicketsStore } from './groupTicketsStore'

const ticket = (key: string, over: Partial<GroupTicket> = {}): GroupTicket => ({
  key,
  summary: key,
  url: `https://j.example/${key}`,
  canTake: true,
  chatOpen: false,
  reviewOpen: false,
  ...over,
})

const list = (over: Partial<GroupTicketList> = {}): GroupTicketList => ({
  connected: true,
  reviewOfferCount: 0,
  tickets: [ticket('A-1')],
  nextTicketKey: 'A-1',
  ...over,
})

const started = (key: string, over: Partial<GroupTicket> = {}): TicketPlanStarted => ({
  ticket: ticket(key, { chatOpen: true, ...over }),
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

/** Answers each list by name, so a test says what each read gets whatever order they run in. */
const answers = (by: Partial<Record<'mine' | 'sprint' | 'search', GroupTicketList | Error>>) =>
  api.readGroupTickets.mockImplementation(async (_group: string, query: { view: 'mine' }) => {
    const answer = by[query.view] ?? list({ tickets: [] })
    if (answer instanceof Error) throw answer
    return answer
  })

const keys = (l: GroupTicketList | undefined) => l?.tickets.map((t) => t.key)

beforeEach(() => {
  api.readGroupTickets.mockReset()
  api.startGroupTicketDiscussion.mockReset()
  api.startGroupTicketPlan.mockReset()
  reviewApi.startColleagueReview.mockReset()
  sourceApi.listWaitingReviewOffers.mockReset()
  sourceApi.dismissReviewOffer.mockReset()
})

describe('GroupTicketsStore', () => {
  it('reads the person’s tickets and the rest of the sprint, each into its own list', async () => {
    answers({ mine: list(), sprint: list({ tickets: [ticket('B-1')] }) })
    const store = new GroupTicketsStore('osc')
    expect(store.getState().mine.list).toBeUndefined()
    await store.refresh()
    expect(api.readGroupTickets).toHaveBeenCalledWith('osc', { view: 'mine' })
    expect(api.readGroupTickets).toHaveBeenCalledWith('osc', { view: 'sprint' })
    expect(api.readGroupTickets).toHaveBeenCalledTimes(2)
    expect(keys(store.getState().mine.list)).toEqual(['A-1'])
    expect(keys(store.getState().sprint.list)).toEqual(['B-1'])
  })

  it('reads only the person’s when that is all that is asked for', async () => {
    answers({ mine: list() })
    const store = new GroupTicketsStore('osc')
    await store.refreshMine()
    expect(api.readGroupTickets).toHaveBeenCalledTimes(1)
    expect(api.readGroupTickets).toHaveBeenCalledWith('osc', { view: 'mine' })
  })

  it('tells who listens, and stops once they leave', async () => {
    answers({ mine: list() })
    const store = new GroupTicketsStore('osc')
    const listener = vi.fn()
    const leave = store.subscribe(listener)
    await store.refreshMine()
    expect(listener).toHaveBeenCalled()
    listener.mockClear()
    leave()
    await store.refreshMine()
    expect(listener).not.toHaveBeenCalled()
  })

  it('says why a list failed on that list alone, and clears it on the next that works', async () => {
    api.readGroupTickets.mockImplementation(async (_g: string, q: { view: string }) => {
      if (q.view === 'sprint') throw refusal(502, 'Jira is down')
      return list()
    })
    const store = new GroupTicketsStore('osc')
    await store.refresh()
    expect(store.getState().sprint.readError).toBe('Jira is down')
    expect(store.getState().mine.readError).toBeNull()
    expect(keys(store.getState().mine.list)).toEqual(['A-1'])
    answers({ sprint: list() })
    await store.refresh()
    expect(store.getState().sprint.readError).toBeNull()
  })

  it('falls back to its own words for a failure with none', async () => {
    api.readGroupTickets.mockRejectedValue({})
    const store = new GroupTicketsStore('osc')
    await store.refresh()
    expect(store.getState().mine.readError).toBe('Could not read the tickets.')
    expect(store.getState().sprint.readError).toBe('Could not read the tickets.')
  })

  it('keeps the list a later read could not refresh', async () => {
    api.readGroupTickets.mockResolvedValueOnce(list())
    const store = new GroupTicketsStore('osc')
    await store.refreshMine()
    api.readGroupTickets.mockRejectedValue(refusal(502, 'Jira is down'))
    await store.refreshMine()
    expect(store.getState().mine.list?.tickets).toHaveLength(1)
    expect(store.getState().mine.readError).toBe('Jira is down')
  })

  it('drops a read a newer one of the same list overtook', async () => {
    const first = deferred<GroupTicketList>()
    const second = deferred<GroupTicketList>()
    api.readGroupTickets.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const store = new GroupTicketsStore('osc')
    const a = store.refreshMine()
    const b = store.refreshMine()
    second.resolve(list({ tickets: [ticket('NEW-1')] }))
    await b
    first.resolve(list({ tickets: [ticket('OLD-1')] }))
    await a
    expect(keys(store.getState().mine.list)).toEqual(['NEW-1'])
  })

  it('does not let a read of one list overtake the other', async () => {
    const mine = deferred<GroupTicketList>()
    const sprint = deferred<GroupTicketList>()
    api.readGroupTickets.mockImplementation((_g: string, q: { view: string }) =>
      q.view === 'mine' ? mine.promise : sprint.promise,
    )
    const store = new GroupTicketsStore('osc')
    const going = store.refresh()
    sprint.resolve(list({ tickets: [ticket('B-1')] }))
    mine.resolve(list({ tickets: [ticket('A-1')] }))
    await going
    expect(keys(store.getState().mine.list)).toEqual(['A-1'])
    expect(keys(store.getState().sprint.list)).toEqual(['B-1'])
  })

  describe('reading more', () => {
    it('adds the next page in order, leaving out a ticket it holds', async () => {
      api.readGroupTickets.mockResolvedValueOnce(
        list({ tickets: [ticket('A-1'), ticket('A-2')], nextPageToken: 'p2' }),
      )
      const store = new GroupTicketsStore('osc')
      await store.refreshMine()
      api.readGroupTickets.mockResolvedValueOnce(
        list({ tickets: [ticket('A-2'), ticket('A-3')], nextTicketKey: 'A-2' }),
      )
      await store.loadMore('mine')
      expect(api.readGroupTickets).toHaveBeenLastCalledWith('osc', {
        view: 'mine',
        nextPageToken: 'p2',
      })
      const { mine } = store.getState()
      expect(keys(mine.list)).toEqual(['A-1', 'A-2', 'A-3'])
      expect(mine.list?.nextPageToken).toBeUndefined()
      expect(mine.loadingMore).toBe(false)
    })

    it('reads more of the list asked for and leaves the other alone', async () => {
      answers({
        mine: list({ nextPageToken: 'm2' }),
        sprint: list({ tickets: [ticket('B-1')], nextPageToken: 's2' }),
      })
      const store = new GroupTicketsStore('osc')
      await store.refresh()
      api.readGroupTickets.mockReset()
      api.readGroupTickets.mockResolvedValueOnce(list({ tickets: [ticket('B-2')] }))
      await store.loadMore('sprint')
      expect(api.readGroupTickets).toHaveBeenCalledWith('osc', {
        view: 'sprint',
        nextPageToken: 's2',
      })
      expect(keys(store.getState().sprint.list)).toEqual(['B-1', 'B-2'])
      expect(store.getState().mine.list?.nextPageToken).toBe('m2')
    })

    it('keeps the next ticket of the first page, and finds one later when it had none', async () => {
      api.readGroupTickets.mockResolvedValueOnce(list({ nextPageToken: 'p2' }))
      const store = new GroupTicketsStore('osc')
      await store.refreshMine()
      api.readGroupTickets.mockResolvedValueOnce(
        list({ tickets: [ticket('A-2')], nextTicketKey: 'A-2' }),
      )
      await store.loadMore('mine')
      expect(store.getState().mine.list?.nextTicketKey).toBe('A-1')

      const { nextTicketKey: _none, ...noneNext } = list({
        tickets: [ticket('B-1', { groupStory: { id: 'g', title: 'G' } })],
        nextPageToken: 'p2',
      })
      api.readGroupTickets.mockResolvedValueOnce(noneNext)
      const other = new GroupTicketsStore('osc')
      await other.refreshMine()
      api.readGroupTickets.mockResolvedValueOnce(
        list({ tickets: [ticket('B-2')], nextTicketKey: 'B-2' }),
      )
      await other.loadMore('mine')
      expect(other.getState().mine.list?.nextTicketKey).toBe('B-2')
    })

    it('does nothing on the last page', async () => {
      api.readGroupTickets.mockResolvedValue(list())
      const store = new GroupTicketsStore('osc')
      await store.refreshMine()
      api.readGroupTickets.mockClear()
      await store.loadMore('mine')
      expect(api.readGroupTickets).not.toHaveBeenCalled()
    })

    it('reads a page once however often it is asked', async () => {
      api.readGroupTickets.mockResolvedValueOnce(list({ nextPageToken: 'p2' }))
      const store = new GroupTicketsStore('osc')
      await store.refreshMine()
      const page = deferred<GroupTicketList>()
      api.readGroupTickets.mockReturnValueOnce(page.promise)
      const a = store.loadMore('mine')
      expect(store.getState().mine.loadingMore).toBe(true)
      const b = store.loadMore('mine')
      page.resolve(list({ tickets: [ticket('A-2')] }))
      await Promise.all([a, b])
      expect(api.readGroupTickets).toHaveBeenCalledTimes(2)
    })

    it('says why a page failed and can be asked again', async () => {
      api.readGroupTickets.mockResolvedValueOnce(list({ nextPageToken: 'p2' }))
      const store = new GroupTicketsStore('osc')
      await store.refreshMine()
      api.readGroupTickets.mockRejectedValueOnce(refusal(502, 'Jira is down'))
      await store.loadMore('mine')
      const { mine } = store.getState()
      expect(mine.readError).toBe('Jira is down')
      expect(mine.loadingMore).toBe(false)
      expect(mine.list?.nextPageToken).toBe('p2')
    })

    it('drops a page a fresh read overtook', async () => {
      api.readGroupTickets.mockResolvedValueOnce(list({ nextPageToken: 'p2' }))
      const store = new GroupTicketsStore('osc')
      await store.refreshMine()
      const page = deferred<GroupTicketList>()
      api.readGroupTickets.mockReturnValueOnce(page.promise)
      const more = store.loadMore('mine')
      api.readGroupTickets.mockResolvedValueOnce(list({ tickets: [ticket('FRESH-1')] }))
      await store.refreshMine()
      page.resolve(list({ tickets: [ticket('STALE-1')] }))
      await more
      const { mine } = store.getState()
      expect(keys(mine.list)).toEqual(['FRESH-1'])
      expect(mine.loadingMore).toBe(false)
    })
  })

  describe('searching', () => {
    it('reads what was typed, trimmed', async () => {
      answers({ search: list({ tickets: [ticket('ZNR-780')] }) })
      const store = new GroupTicketsStore('osc')
      await store.search('  znr-780 ')
      expect(api.readGroupTickets).toHaveBeenCalledWith('osc', { view: 'search', q: 'znr-780' })
      expect(store.getState().search.query).toBe('znr-780')
      expect(keys(store.getState().search.list)).toEqual(['ZNR-780'])
    })

    it('does not read again for the same words', async () => {
      answers({ search: list() })
      const store = new GroupTicketsStore('osc')
      await store.search('renewal')
      await store.search(' renewal ')
      expect(api.readGroupTickets).toHaveBeenCalledTimes(1)
    })

    it('reads nothing for nothing typed', async () => {
      const store = new GroupTicketsStore('osc')
      await store.search('   ')
      expect(api.readGroupTickets).not.toHaveBeenCalled()
      expect(store.getState().search.query).toBe('')
    })

    it('shows no old answer under new words', async () => {
      answers({ search: list() })
      const store = new GroupTicketsStore('osc')
      await store.search('first')
      const second = deferred<GroupTicketList>()
      api.readGroupTickets.mockReturnValueOnce(second.promise)
      const going = store.search('second')
      expect(store.getState().search.list).toBeUndefined()
      second.resolve(list({ tickets: [ticket('S-1')] }))
      await going
    })

    it('drops the answer to words since changed', async () => {
      const first = deferred<GroupTicketList>()
      const second = deferred<GroupTicketList>()
      api.readGroupTickets.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
      const store = new GroupTicketsStore('osc')
      const a = store.search('old')
      const b = store.search('new')
      second.resolve(list({ tickets: [ticket('NEW-1')] }))
      await b
      first.resolve(list({ tickets: [ticket('OLD-1')] }))
      await a
      expect(keys(store.getState().search.list)).toEqual(['NEW-1'])
    })

    it('drops the failure of words since changed', async () => {
      const first = deferred<GroupTicketList>()
      api.readGroupTickets.mockReturnValueOnce(first.promise)
      const store = new GroupTicketsStore('osc')
      const a = store.search('old')
      api.readGroupTickets.mockResolvedValueOnce(list())
      await store.search('new')
      first.reject(refusal(502, 'Jira is down'))
      await a
      expect(store.getState().search.readError).toBeNull()
    })

    it('forgets the search once it is cleared, and an answer still coming with it', async () => {
      const first = deferred<GroupTicketList>()
      api.readGroupTickets.mockReturnValueOnce(first.promise)
      const store = new GroupTicketsStore('osc')
      const a = store.search('old')
      await store.search('')
      first.resolve(list())
      await a
      const { search } = store.getState()
      expect(search.query).toBe('')
      expect(search.list).toBeUndefined()
    })

    it('says why it failed with its own words, and leaves the lists alone', async () => {
      answers({ mine: list() })
      const store = new GroupTicketsStore('osc')
      await store.refreshMine()
      api.readGroupTickets.mockRejectedValueOnce({})
      await store.search('renewal')
      expect(store.getState().search.readError).toBe('Could not search the tickets.')
      expect(store.getState().mine.readError).toBeNull()
    })

    it('reads more with the same words', async () => {
      answers({ search: list({ nextPageToken: 'p2' }) })
      const store = new GroupTicketsStore('osc')
      await store.search('renewal')
      api.readGroupTickets.mockReset()
      api.readGroupTickets.mockResolvedValueOnce(list({ tickets: [ticket('A-2')] }))
      await store.loadMore('search')
      expect(api.readGroupTickets).toHaveBeenCalledWith('osc', {
        view: 'search',
        q: 'renewal',
        nextPageToken: 'p2',
      })
      expect(keys(store.getState().search.list)).toEqual(['A-1', 'A-2'])
    })

    it('drops a page of words since changed', async () => {
      answers({ search: list({ nextPageToken: 'p2' }) })
      const store = new GroupTicketsStore('osc')
      await store.search('old')
      const page = deferred<GroupTicketList>()
      api.readGroupTickets.mockReturnValueOnce(page.promise)
      const more = store.loadMore('search')
      api.readGroupTickets.mockResolvedValueOnce(list({ tickets: [ticket('NEW-1')] }))
      await store.search('new')
      page.resolve(list({ tickets: [ticket('OLD-2')] }))
      await more
      const { search } = store.getState()
      expect(keys(search.list)).toEqual(['NEW-1'])
      expect(search.loadingMore).toBe(false)
    })

    describe('as it is typed', () => {
      beforeEach(() => {
        vi.useFakeTimers()
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      it('reads once typing rests, with the last words only', async () => {
        answers({ search: list() })
        const store = new GroupTicketsStore('osc')
        store.typed('re')
        await vi.advanceTimersByTimeAsync(GROUP_TICKETS_SEARCH_WAIT_MS - 1)
        store.typed('renewal')
        await vi.advanceTimersByTimeAsync(GROUP_TICKETS_SEARCH_WAIT_MS - 1)
        expect(api.readGroupTickets).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1)
        expect(api.readGroupTickets).toHaveBeenCalledTimes(1)
        expect(api.readGroupTickets).toHaveBeenCalledWith('osc', { view: 'search', q: 'renewal' })
      })

      it('ends the search at once when cleared, and what was waiting with it', async () => {
        answers({ search: list() })
        const store = new GroupTicketsStore('osc')
        await store.search('old')
        api.readGroupTickets.mockClear()
        store.typed('older')
        store.typed('  ')
        expect(store.getState().search.query).toBe('')
        await vi.advanceTimersByTimeAsync(GROUP_TICKETS_SEARCH_WAIT_MS)
        expect(api.readGroupTickets).not.toHaveBeenCalled()
      })

      it('reads nothing once typing is stopped, as on leaving the tab', async () => {
        const store = new GroupTicketsStore('osc')
        store.typed('renewal')
        store.stopTyping()
        await vi.advanceTimersByTimeAsync(GROUP_TICKETS_SEARCH_WAIT_MS)
        expect(api.readGroupTickets).not.toHaveBeenCalled()
      })
    })

    it('reads a search again with the lists, and not when there is none', async () => {
      answers({ search: list() })
      const store = new GroupTicketsStore('osc')
      await store.refresh()
      expect(api.readGroupTickets).toHaveBeenCalledTimes(2)
      await store.search('renewal')
      api.readGroupTickets.mockClear()
      await store.refresh()
      expect(api.readGroupTickets).toHaveBeenCalledWith('osc', { view: 'search', q: 'renewal' })
      expect(api.readGroupTickets).toHaveBeenCalledTimes(3)
    })
  })

  describe.each([
    ['discuss', 'startGroupTicketDiscussion'],
    ['plan', 'startGroupTicketPlan'],
  ] as const)('%s', (action, call) => {
    const go = (store: GroupTicketsStore, key: string) => store[action](key)

    it('answers the chat to open, and marks the ticket while it starts', async () => {
      const opening = deferred<TicketPlanStarted>()
      api[call].mockReturnValue(opening.promise)
      const store = new GroupTicketsStore('osc')
      const going = go(store, 'A-1')
      expect(store.getState().starting).toEqual({ key: 'A-1', action })
      opening.resolve(started('A-1'))
      expect((await going)?.chatContextId).toBe('chat-A-1')
      expect(api[call]).toHaveBeenCalledWith('osc', 'A-1')
      expect(store.getState().starting).toBeUndefined()
    })

    it('starts nothing else while one is starting', async () => {
      const opening = deferred<TicketPlanStarted>()
      api[call].mockReturnValue(opening.promise)
      const store = new GroupTicketsStore('osc')
      const first = go(store, 'A-1')
      expect(await store.discuss('A-2')).toBeUndefined()
      expect(await store.plan('A-2')).toBeUndefined()
      opening.resolve(started('A-1'))
      await first
      expect(api[call]).toHaveBeenCalledTimes(1)
      expect(
        api.startGroupTicketDiscussion.mock.calls.length +
          api.startGroupTicketPlan.mock.calls.length,
      ).toBe(1)
    })

    it('marks the ticket in every list that holds it, leaving the others alone', async () => {
      answers({
        mine: list({ tickets: [ticket('A-1'), ticket('A-2')] }),
        sprint: list({ tickets: [ticket('B-1')] }),
        search: list({ tickets: [ticket('A-1')] }),
      })
      const store = new GroupTicketsStore('osc')
      await store.refresh()
      await store.search('a')
      api[call].mockResolvedValue(started('A-1'))
      await go(store, 'A-1')
      const { mine, sprint, search } = store.getState()
      expect(mine.list?.tickets.map((t) => t.chatOpen)).toEqual([true, false])
      expect(search.list?.tickets[0]?.chatOpen).toBe(true)
      expect(sprint.list?.tickets[0]?.chatOpen).toBe(false)
      expect(api.readGroupTickets).toHaveBeenCalledTimes(3)
    })

    it('takes what the answer says of the ticket as it now stands', async () => {
      answers({ mine: list() })
      const store = new GroupTicketsStore('osc')
      await store.refreshMine()
      api[call].mockResolvedValue(started('A-1', { canTake: false, status: 'In Progress' }))
      await go(store, 'A-1')
      expect(store.getState().mine.list?.tickets[0]).toMatchObject({
        canTake: false,
        status: 'In Progress',
      })
    })

    it('says why it was refused and reads the lists again, as they may be stale', async () => {
      api[call].mockRejectedValue(refusal(409, 'A-1 is In Progress.'))
      answers({ mine: list({ tickets: [] }) })
      const store = new GroupTicketsStore('osc')
      expect(await go(store, 'A-1')).toBeUndefined()
      const state = store.getState()
      expect(state.startError).toBe('A-1 is In Progress.')
      expect(state.starting).toBeUndefined()
      expect(api.readGroupTickets).toHaveBeenCalledTimes(2)
      expect(state.mine.list?.tickets).toEqual([])
    })

    it('clears the last refusal on the next try', async () => {
      api[call].mockRejectedValueOnce(refusal(502, 'Jira is down'))
      answers({})
      const store = new GroupTicketsStore('osc')
      await go(store, 'A-1')
      const opening = deferred<TicketPlanStarted>()
      api[call].mockReturnValueOnce(opening.promise)
      const going = go(store, 'A-1')
      expect(store.getState().startError).toBeNull()
      opening.resolve(started('A-1'))
      await going
    })
  })

  it('falls back to its own words for each', async () => {
    api.startGroupTicketPlan.mockRejectedValue({})
    api.startGroupTicketDiscussion.mockRejectedValue({})
    answers({})
    const store = new GroupTicketsStore('osc')
    await store.plan('A-1')
    expect(store.getState().startError).toBe('The plan did not start.')
    await store.discuss('A-1')
    expect(store.getState().startError).toBe('The chat did not open.')
  })

  describe('review', () => {
    const file = (name: string) => ({ name, size: 3, uri: `file:///${name}` })
    const REVIEW_CHAT = { type: 'GROUP_TOPIC', groupId: 'osc', topicId: 'review-A-1' }
    const roundStarted = { context: REVIEW_CHAT, chatContextId: 'c', round: 1 } as never

    it('uploads each file to the review chat, then starts the round with their paths', async () => {
      answers({ mine: list() })
      const store = new GroupTicketsStore('osc')
      await store.refresh()
      const upload = vi.fn(async (_c: unknown, f: { name: string }) => `up/${f.name}`)
      reviewApi.startColleagueReview.mockResolvedValue(roundStarted)
      const outcome = await store.review(
        'A-1',
        { text: 'Done', files: [{ file: file('a.png') }, { file: file('b.md') }] },
        upload,
      )
      expect(outcome).toEqual({ ok: true, started: roundStarted })
      expect(upload.mock.calls.map((c) => c[0])).toEqual([REVIEW_CHAT, REVIEW_CHAT])
      expect(reviewApi.startColleagueReview).toHaveBeenCalledWith('osc', 'A-1', {
        text: 'Done',
        attachments: ['up/a.png', 'up/b.md'],
      })
      expect(store.getState().reviewing).toEqual({})
      expect(store.getState().mine.list?.tickets[0]?.reviewOpen).toBe(true)
    })

    it('sends no attachments when there are no files', async () => {
      reviewApi.startColleagueReview.mockResolvedValue(roundStarted)
      const store = new GroupTicketsStore('osc')
      await store.review('A-1', { text: 'Done', files: [] }, vi.fn())
      expect(reviewApi.startColleagueReview).toHaveBeenCalledWith('osc', 'A-1', { text: 'Done' })
    })

    it('shows the files going up, then the round starting, on that ticket alone', async () => {
      const second = deferred<string>()
      const opening = deferred<unknown>()
      const upload = vi.fn().mockResolvedValueOnce('up/a.png').mockReturnValueOnce(second.promise)
      reviewApi.startColleagueReview.mockReturnValue(opening.promise)
      const store = new GroupTicketsStore('osc')
      const going = store.review(
        'A-1',
        { text: 'Done', files: [{ file: file('a.png') }, { file: file('b.md') }] },
        upload,
      )
      await vi.waitFor(() =>
        expect(store.getState().reviewing).toEqual({
          'A-1': { step: 'uploading', done: 1, total: 2 },
        }),
      )
      second.resolve('up/b.md')
      await vi.waitFor(() =>
        expect(store.getState().reviewing).toEqual({ 'A-1': { step: 'starting' } }),
      )
      expect(store.getState().starting).toBeUndefined()
      opening.resolve(roundStarted)
      await going
      expect(store.getState().reviewing).toEqual({})
    })

    it('starts one round at a time per ticket, beside any other ticket’s', async () => {
      const opening = deferred<unknown>()
      reviewApi.startColleagueReview.mockReturnValue(opening.promise)
      const store = new GroupTicketsStore('osc')
      const first = store.review('A-1', { text: 'Done', files: [] }, vi.fn())
      expect(await store.review('A-1', { text: 'Again', files: [] }, vi.fn())).toBeUndefined()
      const other = store.review('A-2', { text: 'Other', files: [] }, vi.fn())
      expect(Object.keys(store.getState().reviewing)).toEqual(['A-1', 'A-2'])
      opening.resolve(roundStarted)
      await Promise.all([first, other])
      expect(reviewApi.startColleagueReview).toHaveBeenCalledTimes(2)
    })

    it('hands the draft back with why, keeping the paths of files that went up', async () => {
      const upload = vi
        .fn()
        .mockResolvedValueOnce('up/a.png')
        .mockRejectedValueOnce(new Error('The connection dropped.'))
      const store = new GroupTicketsStore('osc')
      const outcome = await store.review(
        'A-1',
        { text: 'Done', files: [{ file: file('a.png') }, { file: file('b.md') }] },
        upload,
      )
      expect(outcome).toEqual({
        ok: false,
        error: 'The connection dropped.',
        draft: {
          text: 'Done',
          files: [{ file: file('a.png'), path: 'up/a.png' }, { file: file('b.md') }],
        },
      })
      expect(reviewApi.startColleagueReview).not.toHaveBeenCalled()
      expect(store.getState().reviewing).toEqual({})
    })

    it('uploads only what has not gone up yet when tried again', async () => {
      reviewApi.startColleagueReview.mockResolvedValue(roundStarted)
      const upload = vi.fn(async () => 'up/b.md')
      const store = new GroupTicketsStore('osc')
      await store.review(
        'A-1',
        {
          text: 'Done',
          files: [{ file: file('a.png'), path: 'up/a.png' }, { file: file('b.md') }],
        },
        upload,
      )
      expect(upload).toHaveBeenCalledTimes(1)
      expect(reviewApi.startColleagueReview).toHaveBeenCalledWith('osc', 'A-1', {
        text: 'Done',
        attachments: ['up/a.png', 'up/b.md'],
      })
    })

    it('says why the backend refused the round, and leaves the ticket as it was', async () => {
      answers({ mine: list() })
      const store = new GroupTicketsStore('osc')
      await store.refresh()
      reviewApi.startColleagueReview.mockRejectedValueOnce(refusal(409, 'The group has no Jira.'))
      const outcome = await store.review('A-1', { text: 'Done', files: [] }, vi.fn())
      expect(outcome).toMatchObject({ ok: false, error: 'The group has no Jira.' })
      expect(store.getState().mine.list?.tickets[0]?.reviewOpen).toBe(false)
      reviewApi.startColleagueReview.mockRejectedValueOnce({})
      expect(await store.review('A-1', { text: 'Done', files: [] }, vi.fn())).toMatchObject({
        error: 'The review did not start.',
      })
    })

    it('names the file that did not upload when the failure says nothing', async () => {
      const store = new GroupTicketsStore('osc')
      const outcome = await store.review(
        'A-1',
        { text: 'Done', files: [{ file: file('clip.mp4') }] },
        vi.fn().mockRejectedValue({}),
      )
      expect(outcome).toMatchObject({ ok: false, error: 'clip.mp4 did not upload.' })
    })

    it('marks a ticket as reviewed in every list, once', async () => {
      answers({ mine: list(), search: list() })
      const store = new GroupTicketsStore('osc')
      await store.refresh()
      await store.search('a')
      store.markReviewOpen('A-1')
      const marked = store.getState()
      expect(marked.mine.list?.tickets[0]?.reviewOpen).toBe(true)
      expect(marked.search.list?.tickets[0]?.reviewOpen).toBe(true)
      store.markReviewOpen('A-1')
      expect(store.getState().mine.list?.tickets[0]).toBe(marked.mine.list?.tickets[0])
      const before = store.getState().mine
      store.markReviewOpen('Z-9')
      expect(store.getState().mine).toBe(before)
    })
  })

  describe('updates from Slack', () => {
    const OFFER = {
      id: 'o1',
      kind: 'first-round' as const,
      author: 'Ana',
      postedAt: '2026-11-17T11:00:00.000Z',
      permalink: 'https://acme.slack.com/archives/C1/p1763380000123456',
    }
    const WHOLE = {
      ...OFFER,
      groupId: 'osc',
      ticketKey: 'A-1',
      provider: 'slack',
      messageTs: '1',
      text: 'A-1 done',
      attachments: [{ fileId: 'F1', name: 'after.png' }],
      state: 'new',
      createdAt: '2026-11-17T11:00:01.000Z',
    }
    const offered = () =>
      list({ tickets: [ticket('A-1', { reviewOffer: OFFER }), ticket('A-2')], reviewOfferCount: 2 })
    const offerOf = (store: GroupTicketsStore, name: 'mine' | 'search' = 'mine') =>
      store.getState()[name].list?.tickets.find((t) => t.key === 'A-1')?.reviewOffer
    const count = (store: GroupTicketsStore) => store.getState().mine.list?.reviewOfferCount

    const offeredStore = async () => {
      answers({ mine: offered(), search: offered() })
      sourceApi.listWaitingReviewOffers.mockResolvedValue([WHOLE])
      const store = new GroupTicketsStore('osc')
      await store.refresh()
      await store.search('a')
      return store
    }

    it('reads the waiting updates whole once a list says some wait', async () => {
      const store = await offeredStore()
      await vi.waitFor(() => expect(store.getState().offers).toEqual({ o1: WHOLE }))
      expect(sourceApi.listWaitingReviewOffers).toHaveBeenCalledWith('osc')
    })

    it('reads no updates while none wait', async () => {
      answers({ mine: list() })
      const store = new GroupTicketsStore('osc')
      await store.refresh()
      expect(sourceApi.listWaitingReviewOffers).not.toHaveBeenCalled()
    })

    it('reads the updates once however often it is asked meanwhile, and keeps them when a read fails', async () => {
      const reading = deferred<unknown>()
      sourceApi.listWaitingReviewOffers.mockReturnValueOnce(reading.promise)
      const store = new GroupTicketsStore('osc')
      const first = store.loadOffers()
      const second = store.loadOffers()
      reading.resolve([WHOLE])
      await Promise.all([first, second])
      expect(sourceApi.listWaitingReviewOffers).toHaveBeenCalledTimes(1)
      sourceApi.listWaitingReviewOffers.mockRejectedValueOnce(new Error('down'))
      await store.loadOffers()
      expect(store.getState().offers).toEqual({ o1: WHOLE })
    })

    it('dismisses an update at once in every list, once however often it is pressed', async () => {
      const store = await offeredStore()
      const dismissing = deferred<unknown>()
      sourceApi.dismissReviewOffer.mockReturnValue(dismissing.promise)
      const going = store.dismissOffer('A-1')
      expect(offerOf(store)).toBeUndefined()
      expect(offerOf(store, 'search')).toBeUndefined()
      expect(count(store)).toBe(1)
      expect(await store.dismissOffer('A-1')).toBe(false)
      dismissing.resolve(WHOLE)
      expect(await going).toBe(true)
      expect(sourceApi.dismissReviewOffer).toHaveBeenCalledTimes(1)
      expect(sourceApi.dismissReviewOffer).toHaveBeenCalledWith('osc', 'o1')
      expect(count(store)).toBe(1)
    })

    it('brings a dismissed update back with why when the dismiss fails', async () => {
      const store = await offeredStore()
      sourceApi.dismissReviewOffer.mockRejectedValueOnce(refusal(409, 'It was started already.'))
      expect(await store.dismissOffer('A-1')).toBe(false)
      expect(offerOf(store)).toEqual(OFFER)
      expect(offerOf(store, 'search')).toEqual(OFFER)
      expect(count(store)).toBe(2)
      expect(store.getState().offerError).toBe('It was started already.')
      sourceApi.dismissReviewOffer.mockRejectedValueOnce({})
      await store.dismissOffer('A-1')
      expect(store.getState().offerError).toBe('The update was not dismissed.')
      sourceApi.dismissReviewOffer.mockResolvedValueOnce(WHOLE)
      await store.dismissOffer('A-1')
      expect(store.getState().offerError).toBeNull()
    })

    it('does nothing for a ticket with no update', async () => {
      const store = await offeredStore()
      await store.dismissOffer('A-2')
      await store.dismissOffer('Z-9')
      expect(sourceApi.dismissReviewOffer).not.toHaveBeenCalled()
    })

    it('keeps a settled update away from a read begun before the backend had it', async () => {
      const store = await offeredStore()
      const reading = deferred<GroupTicketList>()
      api.readGroupTickets.mockReturnValueOnce(reading.promise)
      const staleRead = store.refreshMine()
      sourceApi.dismissReviewOffer.mockResolvedValueOnce(WHOLE)
      await store.dismissOffer('A-1')
      reading.resolve(offered())
      await staleRead
      expect(offerOf(store)).toBeUndefined()
      expect(count(store)).toBe(1)
      answers({ mine: list({ tickets: [ticket('A-1')], reviewOfferCount: 1 }) })
      await store.refreshMine()
      expect(count(store)).toBe(1)
    })

    it('starts a round from an update by its id, taking the update off at once', async () => {
      const store = await offeredStore()
      const opening = deferred<unknown>()
      reviewApi.startColleagueReview.mockReturnValue(opening.promise)
      const box = { id: 'o1', author: 'Ana', postedAt: OFFER.postedAt, files: [], text: 'A-1 done' }
      const going = store.review('A-1', { text: 'A-1 done', files: [] }, vi.fn(), box)
      expect(offerOf(store)).toBeUndefined()
      expect(count(store)).toBe(1)
      opening.resolve({ round: 1 })
      await going
      expect(reviewApi.startColleagueReview).toHaveBeenCalledWith('osc', 'A-1', { offerId: 'o1' })
    })

    it('sends the person’s edit of the update, and brings the update back when the round fails', async () => {
      const store = await offeredStore()
      reviewApi.startColleagueReview.mockRejectedValueOnce(
        refusal(502, 'after.png could not be fetched.'),
      )
      const box = { id: 'o1', author: 'Ana', postedAt: OFFER.postedAt, files: [], text: 'A-1 done' }
      const outcome = await store.review(
        'A-1',
        { text: 'A-1 done, and more', files: [] },
        vi.fn(),
        box,
      )
      expect(reviewApi.startColleagueReview).toHaveBeenCalledWith('osc', 'A-1', {
        offerId: 'o1',
        text: 'A-1 done, and more',
      })
      expect(outcome).toMatchObject({ ok: false, error: 'after.png could not be fetched.' })
      expect(offerOf(store)).toEqual(OFFER)
      expect(count(store)).toBe(2)
    })
  })
})
